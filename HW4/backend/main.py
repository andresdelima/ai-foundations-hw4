"""Campus Customs API.

- Catalogue, stock by size, and product images from the local database (Problem 3)
- Accounts: signup, login, logout, session cookie (Problem 4)
- Chat: POST /api/chat runs the PydanticAI agent in agent.py (Problem 5)
- Customer memory: chat history saved per user in chat_messages, plus page context (Problem 8)
- Audit trail + safety: every agent run appended to output/audit_trail.json; card numbers and
  SSNs are redacted from chat messages before anything else sees them (Problem 12)

Run from the backend/ folder:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import logging
import re
from contextlib import asynccontextmanager

from fastapi import Cookie, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pydantic_ai.exceptions import UsageLimitExceeded

import agent
import audit
import auth
import db
import memory
from models import ChatRequest, ChatResponse, ChatTurn, CustomerContext, HistoryMessage

log = logging.getLogger("campus.api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logging.basicConfig(level=logging.INFO)
    auth.ensure_sessions_table()
    memory.ensure_index()
    try:
        agent.get_agent()  # load prompt + model once at startup
    except agent.AgentNotConfigured as e:
        log.warning("%s The shop runs, but chat will return 503.", e)
    yield


app = FastAPI(title="Campus Customs API", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Product photos only. The data/ folder itself (with the .db file) is never mounted.
app.mount("/media/products", StaticFiles(directory=db.IMAGES_DIR), name="product-images")


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "database": db.DB_PATH.exists(), "model": agent.MODEL_NAME}


@app.get("/api/products")
def products() -> dict:
    items = db.list_products()
    return {"count": len(items), "categories": db.CATEGORIES, "collections": db.COLLECTIONS, "products": items}


@app.get("/api/products/{product_id}")
def product(product_id: str) -> dict:
    item = db.get_product(product_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return item


# ---------------------------------------------------------------------------
# Accounts. Request models use plain strings and are validated by hand, so a
# bad request can never echo the typed password back in an error response.
# ---------------------------------------------------------------------------

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SignupRequest(BaseModel):
    first_name: str = ""
    last_name: str = ""
    email: str = ""
    password: str = ""


class LoginRequest(BaseModel):
    email: str = ""
    password: str = ""


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        auth.SESSION_COOKIE,
        token,
        max_age=auth.SESSION_DAYS * 24 * 3600,
        httponly=True,  # page JavaScript (and injected scripts) can't read it
        samesite="lax",  # not sent on cross-site form posts
        secure=False,  # local http dev; set True behind HTTPS
        path="/",
    )


@app.post("/api/auth/signup", status_code=201)
def signup(req: SignupRequest, response: Response) -> dict:
    first, last, email = req.first_name.strip(), req.last_name.strip(), auth.normalize_email(req.email)
    if not first or not last or len(first) > 60 or len(last) > 60:
        raise HTTPException(400, "Please enter your first and last name.")
    if not EMAIL_RE.match(email) or len(email) > 254:
        raise HTTPException(400, "Please enter a valid email address.")
    if not auth.MIN_PASSWORD_LEN <= len(req.password) <= auth.MAX_PASSWORD_LEN:
        raise HTTPException(400, f"Password must be {auth.MIN_PASSWORD_LEN}–{auth.MAX_PASSWORD_LEN} characters.")
    try:
        user = auth.create_user(first, last, email, req.password)
    except auth.EmailTaken:
        raise HTTPException(409, "An account with that email already exists. Try logging in.")
    _set_session_cookie(response, auth.create_session(user["id"]))
    return {"user": user}


@app.post("/api/auth/login")
def login(req: LoginRequest, request: Request, response: Response) -> dict:
    email = auth.normalize_email(req.email)
    client = request.client.host if request.client else "unknown"
    if auth.is_locked_out(email, client):
        raise HTTPException(429, "Too many failed attempts. Please wait 15 minutes and try again.")
    user = None
    if email and 0 < len(req.password) <= auth.MAX_PASSWORD_LEN:
        user = auth.authenticate(email, req.password)
    if user is None:
        auth.record_failure(email, client)
        # Same message whether the email or the password was wrong.
        raise HTTPException(401, "Incorrect email or password.")
    auth.clear_failures(email)
    _set_session_cookie(response, auth.create_session(user["id"]))
    return {"user": user}


@app.post("/api/auth/logout")
def logout(response: Response, cc_session: str | None = Cookie(default=None)) -> dict:
    auth.delete_session(cc_session)
    response.delete_cookie(auth.SESSION_COOKIE, path="/")
    return {"ok": True}


@app.get("/api/auth/me")
def me(cc_session: str | None = Cookie(default=None)) -> dict:
    return {"user": auth.user_for_session(cc_session)}


# ---------------------------------------------------------------------------
# Chat (PydanticAI agent)
# ---------------------------------------------------------------------------

def _customer(user: dict | None) -> CustomerContext | None:
    """Customer fields the agent may see, read fresh from the users table (never the password hash)."""
    if user is None:
        return None
    with db.connect() as conn:
        created_at = conn.execute("SELECT created_at FROM users WHERE id = ?", (user["id"],)).fetchone()[0]
    return CustomerContext(
        user_id=user["id"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        email=user["email"],
        member_since=created_at,
        saved_messages=memory.count(user["id"]),
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, cc_session: str | None = Cookie(default=None)) -> ChatResponse:
    """One chat turn. Logged-in shoppers: history is loaded from and saved to chat_messages.
    Guests: the browser sends its in-tab history and nothing is stored."""
    # Safety: strip card numbers / SSNs before the agent, the database, or the audit log see them.
    message, removed = audit.redact(req.message)
    if removed:
        log.info("Redacted sensitive data from a chat message: %s", ", ".join(removed))
    customer = _customer(auth.user_for_session(cc_session))
    if customer:
        history = [ChatTurn(role=m["role"], content=m["content"]) for m in memory.load(customer.user_id, memory.HISTORY_FOR_AGENT, with_cards=False)]
    else:
        history = [ChatTurn(role=t.role, content=audit.redact(t.content)[0]) for t in req.history]
    try:
        response = await agent.chat(message, history, customer=customer, page=agent.resolve_page(req.page))
    except agent.AgentNotConfigured:
        log.error("Chat unavailable: PORTKEY_API_KEY is not configured")
        raise HTTPException(503, "The shopping assistant isn't configured yet. Please try again later.")
    except UsageLimitExceeded:
        raise HTTPException(503, "That question needed too many lookups. Could you make it a bit more specific?")
    except Exception as e:  # never send internal errors (which could include request details) to the browser
        log.error("Chat failed: %s", type(e).__name__)
        raise HTTPException(502, "Sorry, the Bulldog is having trouble answering right now. Please try again in a moment.")
    if customer:
        memory.save_turn(customer.user_id, message, response.reply, [c.model_dump() for c in response.products])
    return response


@app.get("/api/chat/history", response_model=list[HistoryMessage])
def chat_history(cc_session: str | None = Cookie(default=None)) -> list[HistoryMessage]:
    """The logged-in shopper's saved conversation (most recent 50 messages); guests get []."""
    user = auth.user_for_session(cc_session)
    if user is None:
        return []
    return [HistoryMessage(**m) for m in memory.load(user["id"])]


@app.delete("/api/chat/history")
def clear_chat_history(cc_session: str | None = Cookie(default=None)) -> dict:
    user = auth.user_for_session(cc_session)
    if user is None:
        raise HTTPException(401, "Log in to manage your chat history.")
    return {"deleted": memory.clear(user["id"])}
