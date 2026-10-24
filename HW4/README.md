# HW4: Campus Customs Storefront + Shopping Agent

A customer website for **Campus Customs** (officially licensed Yale apparel), with a chatbot called **the Bulldog**. Shoppers can browse 102 products, create an account, and chat about merch. The chat puts matching items right on the page and gives honest price and stock answers from a local SQLite database.

- **Front end:** React + Vite + TypeScript (`frontend/`)
- **Back end:** Python FastAPI (`backend/main.py`), whose brain is a **PydanticAI agent** (`backend/agent.py`) using OpenAI `gpt-5.6` through the Portkey gateway

AI Foundations · Yale SOM · Andres de Lima

## File layout

```
HW4/
├── AI_prompts.md              # log of the prompts typed during vibe coding (one section per problem)
├── requirements.txt           # backend Python dependencies
├── .env.example               # placeholders only (copy to .env and add your key)
├── .gitignore                 # keeps .env, the database, product images, node_modules out of git
├── README.md
├── frontend/                  # Vite React TypeScript app
│   ├── index.html, vite.config.ts, package.json
│   └── src/                   # pages, components, chat widget, bag, header search, theme.css
├── backend/                   # FastAPI app; run with: uvicorn main:app --reload --port 8000
│   ├── main.py                # API app Uvicorn runs: products, images, auth, chat, chat history
│   ├── agent.py               # ┐
│   ├── models.py              # │ the agent: four files
│   ├── tools.py               # │ (see "The agent" below)
│   ├── prompts/               # │
│   │   └── prompt.md          # ┘
│   ├── db.py · auth.py · memory.py · audit.py   # API support: database, accounts, chat history, audit trail
│   └── checks/check_guardrail.py                 # offline check of the price guardrail
├── docs/                      # research notes (yalebulldogblue.com style, database notes)
└── output/
    ├── harness.md             # how the whole system works: data, models, tools, safety, specs
    ├── design.md              # storefront design choices (P10)
    ├── usability.md           # four usability improvements (P9)
    ├── app_check.html         # live-site test report; open it by double-clicking (P11)
    ├── app_check_images/      # screenshots linked from app_check.html
    └── audit_trail.json       # append-only log of agent-loop activity (P12)
```

## The agent: four files in `backend/`

| File | What it is |
|---|---|
| `prompts/prompt.md` | System prompt: the Bulldog's voice, tools-first honesty rules, page and memory rules, store facts (shipping, returns, contact), and 14 safety rules |
| `agent.py` | Agent entry and wiring: builds the PydanticAI `Agent` (Portkey `gpt-5.6` + `prompt.md` + tools + `AgentReply` output), adds who's chatting and what page they're on, runs the answer guardrail, and logs every run to `output/audit_trail.json`. `chat()` is called once per message by `main.py`. |
| `tools.py` | Tools the agent can call, all read-only database lookups: `search_products`, `get_product_description`, `get_price`, `get_stock`, `find_alternatives` (plus `get_customer_profile` and `get_current_page`, defined in `agent.py` from request context) |
| `models.py` | Pydantic / PydanticAI structured types: tool results, agent context, the agent's structured reply, and the chat request/response the website uses |

`main.py` is the FastAPI app that exposes the agent at `POST /api/chat`. `db.py`, `auth.py`, `memory.py`, and `audit.py` are the API's supporting modules (database access, accounts, saved chats, audit log), not part of the agent itself.

## Run it locally

### 1. Place the local-data pack (not in git)

The database and product images are not in the repository. Copy the course data pack into `HW4/data/` so it looks exactly like this:

```
HW4/
└── data/
    ├── campus_customs.db      # catalogue, inventory, users (hashed passwords), chat_messages
    └── products/              # images referenced by the catalogue (image_file_path)
```

The backend reads `HW4/data/` by default (override with `CAMPUS_DATA_DIR`). The real `.env`, the database, and the images are never committed; `.gitignore` excludes them.

### 2. Add your API key

```bash
cd HW4
cp .env.example .env        # then edit .env: PORTKEY_API_KEY=your key (never commit .env)
```

### 3. Start the back end (terminal 1)

Requires Python 3.12.

```bash
cd HW4
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd backend
uvicorn main:app --reload --port 8000
```

Check that it's up at http://localhost:8000/api/health. It should return `{"ok": true, "database": true, "model": "gpt-5.6"}`. If `database` is `false`, the data pack isn't in `HW4/data/`.

### 4. Start the front end (terminal 2)

Requires Node 20+.

```bash
cd HW4/frontend
npm install
npm run dev
```

Open **http://localhost:5174**. The front end calls the backend through the Vite proxy (`/api` and `/media` → `localhost:8000`), so keep both terminals running. The API key only ever lives on the server.

### 5. Try it

- Log in as the seeded test user `test@campuscustoms.yale.edu`, or create an account.
- Ask the Bulldog "What hoodies do you have?". The page fills with cards; click one to open its product page.
- Open a product and ask "Do you have this in pink? Is L in stock?".
- Add a size to the bag, and type "berkeley" in the header search.

Optional checks: `python checks/check_guardrail.py` (from `backend/`, offline, no key needed) and `npm run build` (from `frontend/`).

## Where to look (by problem)

| Problem | Where |
|---|---|
| P1 Prompt log | `AI_prompts.md` |
| P2 Analyze the database | `output/harness.md` §1 |
| P3 Website (React + FastAPI) | `frontend/src/pages/*`, `backend/main.py` |
| P4 Create account / login | `backend/auth.py`, `frontend/src/pages/Login.tsx`, `Signup.tsx`; `harness.md` §5 |
| P5 PydanticAI agent backend | `backend/agent.py`, `tools.py`, `models.py`, `prompts/prompt.md`; `harness.md` §0, §4 |
| P6 Product info and stock tools | `backend/tools.py`; `harness.md` §2–3 |
| P7 Chat search that updates the page | `frontend/src/components/ChatResults.tsx`; `harness.md` §4.1 |
| P8 Customer memory and page context | `backend/memory.py`, `agent.resolve_page`; `harness.md` §4.2 |
| P9 Usability improvements | `output/usability.md` |
| P10 Design | `output/design.md`, `frontend/src/theme.css` |
| P11 App check | `output/app_check.html` |
| P12 Audit trail, safety, harness | `output/audit_trail.json`, `backend/audit.py`, `prompt.md` "Safety rules", `output/harness.md` §6–8 |

## Safety notes

- The Portkey key is read from `.env` on the server only. It is never hardcoded, logged, returned to the browser, or committed.
- Passwords are stored as PBKDF2-SHA256 hashes (120,000 iterations, a random salt per user), and sessions use an HttpOnly cookie.
- Every price in an agent answer is checked against the database before it's sent. Card numbers and SSNs typed in chat are removed before the agent, the database, or the audit log see them.
