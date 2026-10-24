"""Accounts, password hashing, and sessions for the Campus Customs shop.

Password format (shared with the seed database):
    pbkdf2_sha256$<salt>$<hex digest>
    digest = PBKDF2-HMAC-SHA256(password, salt.encode("utf-8"), 120_000 iterations)

Signup and login both go through `hash_password`, so the function, salt handling,
and iteration count can never drift apart. Plain passwords are never stored,
logged, or returned.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3
import threading
import time
from datetime import datetime, timedelta, timezone

import db

ALGORITHM = "pbkdf2_sha256"
ITERATIONS = 120_000
MIN_PASSWORD_LEN = 8
MAX_PASSWORD_LEN = 128  # caps the work an attacker can force per hash

SESSION_COOKIE = "cc_session"
SESSION_DAYS = 7

# A throwaway hash so a login for an unknown email takes as long as a real one,
# which stops attackers from learning which emails have accounts.
_DUMMY_HASH: str | None = None


# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------

def hash_password(password: str, salt: str | None = None) -> str:
    """Hash a password. Signup passes no salt (a new random one is made);
    login passes the salt read from the stored hash."""
    if salt is None:
        salt = secrets.token_urlsafe(16)  # 22 URL-safe chars, 128 bits of randomness
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), ITERATIONS).hex()
    return f"{ALGORITHM}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    """Re-hash the typed password with the stored salt and compare in constant time."""
    try:
        algorithm, salt, expected = stored.split("$")
    except ValueError:
        return False
    if algorithm != ALGORITHM:
        return False
    candidate = hash_password(password, salt).split("$")[2]
    return hmac.compare_digest(candidate, expected)


def _dummy_verify(password: str) -> None:
    global _DUMMY_HASH
    if _DUMMY_HASH is None:
        _DUMMY_HASH = hash_password(secrets.token_urlsafe(16))
    verify_password(password, _DUMMY_HASH)


# ---------------------------------------------------------------------------
# Brute-force protection: after 5 failed logins for an email (or 20 from one
# client) within 15 minutes, further attempts are refused until the window passes.
# ---------------------------------------------------------------------------

_FAIL_WINDOW = 15 * 60
_MAX_FAILS_PER_EMAIL = 5
_MAX_FAILS_PER_CLIENT = 20
_failures: dict[str, list[float]] = {}
_fail_lock = threading.Lock()


def _recent(key: str, now: float) -> list[float]:
    hits = [t for t in _failures.get(key, []) if now - t < _FAIL_WINDOW]
    _failures[key] = hits
    return hits


def is_locked_out(email: str, client: str) -> bool:
    now = time.time()
    with _fail_lock:
        return (
            len(_recent(f"email:{email}", now)) >= _MAX_FAILS_PER_EMAIL
            or len(_recent(f"client:{client}", now)) >= _MAX_FAILS_PER_CLIENT
        )


def record_failure(email: str, client: str) -> None:
    now = time.time()
    with _fail_lock:
        for key in (f"email:{email}", f"client:{client}"):
            _recent(key, now).append(now)


def clear_failures(email: str) -> None:
    with _fail_lock:
        _failures.pop(f"email:{email}", None)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class EmailTaken(Exception):
    pass


def normalize_email(email: str) -> str:
    return email.strip().lower()


def public_user(row: sqlite3.Row) -> dict:
    """The only user fields that ever leave the backend (never the hash)."""
    first = row["first_name"] or (row["name"] or "").split(" ")[0]
    last = row["last_name"] or " ".join((row["name"] or "").split(" ")[1:])
    return {"id": row["id"], "email": row["email"], "first_name": first, "last_name": last, "name": row["name"]}


def create_user(first_name: str, last_name: str, email: str, password: str) -> dict:
    first, last, email = first_name.strip(), last_name.strip(), normalize_email(email)
    password_hash = hash_password(password)
    with db.connect(readonly=False) as conn:
        try:
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)",
                (f"{first} {last}", email, password_hash, first, last),
            )
        except sqlite3.IntegrityError as e:
            raise EmailTaken(email) from e
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    return public_user(row)


def authenticate(email: str, password: str) -> dict | None:
    email = normalize_email(email)
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if row is None:
        _dummy_verify(password)
        return None
    if not verify_password(password, row["password_hash"]):
        return None
    return public_user(row)


# ---------------------------------------------------------------------------
# Sessions: a random token goes to the browser in an HttpOnly cookie; only its
# SHA-256 is stored, so a leaked database cannot be used to hijack sessions.
# ---------------------------------------------------------------------------

def _token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def ensure_sessions_table() -> None:
    with db.connect(readonly=False) as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )"""
        )
        conn.execute("DELETE FROM sessions WHERE expires_at < datetime('now')")


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)).strftime("%Y-%m-%d %H:%M:%S")
    with db.connect(readonly=False) as conn:
        conn.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (_token_digest(token), user_id, expires),
        )
    return token


def user_for_session(token: str | None) -> dict | None:
    if not token:
        return None
    with db.connect() as conn:
        row = conn.execute(
            """SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
               WHERE s.token_hash = ? AND s.expires_at > datetime('now')""",
            (_token_digest(token),),
        ).fetchone()
    return public_user(row) if row else None


def delete_session(token: str | None) -> None:
    if token:
        with db.connect(readonly=False) as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_token_digest(token),))
