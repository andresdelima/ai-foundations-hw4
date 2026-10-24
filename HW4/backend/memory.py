"""Customer memory: chat history for logged-in shoppers, stored in `chat_messages`.

Table (from the seed database):
    chat_messages(id, user_id → users.id, role 'user'|'assistant', content,
                  products_json, created_at)

- One row per message. The shopper's message and the agent's reply are saved together
  after a successful turn.
- `products_json` holds the product cards shown with an assistant reply (a JSON list of
  card objects). On reload, cards are rebuilt from the database by product_id, so old
  rows (the seed data stored full catalogue rows) and new rows both show current
  prices and stock.
- Guests get no rows; their history lives only in the browser tab.
"""

from __future__ import annotations

import json

import db
import tools

HISTORY_FOR_AGENT = 12  # most recent messages given to the model as context
HISTORY_FOR_UI = 50  # most recent messages shown in the chat panel on return


def ensure_index() -> None:
    with db.connect(readonly=False) as conn:
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, id)")


def _product_ids(products_json: str | None) -> list[str]:
    try:
        items = json.loads(products_json or "[]")
    except json.JSONDecodeError:
        return []
    return [p["product_id"] for p in items if isinstance(p, dict) and p.get("product_id")]


def load(user_id: int, limit: int = HISTORY_FOR_UI, with_cards: bool = True) -> list[dict]:
    """The user's most recent messages, oldest first."""
    with db.connect() as conn:
        rows = conn.execute(
            """SELECT id, role, content, products_json, created_at FROM chat_messages
               WHERE user_id = ? ORDER BY id DESC LIMIT ?""",
            (user_id, limit),
        ).fetchall()
    messages = []
    for r in reversed(rows):
        msg = {"id": r["id"], "role": r["role"], "content": r["content"], "created_at": r["created_at"]}
        if with_cards:
            msg["products"] = tools.product_cards(_product_ids(r["products_json"])) if r["role"] == "assistant" else []
        messages.append(msg)
    return messages


def count(user_id: int) -> int:
    with db.connect() as conn:
        return conn.execute("SELECT COUNT(*) FROM chat_messages WHERE user_id = ?", (user_id,)).fetchone()[0]


def save_turn(user_id: int, user_message: str, reply: str, cards: list[dict]) -> None:
    """Store the shopper's message and the agent's reply in one transaction."""
    with db.connect(readonly=False) as conn:
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json) VALUES (?, 'user', ?, NULL)",
            (user_id, user_message),
        )
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json) VALUES (?, 'assistant', ?, ?)",
            (user_id, reply, json.dumps(cards)),
        )


def clear(user_id: int) -> int:
    with db.connect(readonly=False) as conn:
        return conn.execute("DELETE FROM chat_messages WHERE user_id = ?", (user_id,)).rowcount
