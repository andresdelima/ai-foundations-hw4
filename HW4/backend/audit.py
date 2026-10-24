"""Append-only audit trail of agent-loop activity: HW4/output/audit_trail.json.

The file is one JSON array of events, oldest first. Each chat turn adds:

    run_start        who (user id or guest), redacted message preview, page, model
    tool_call        one per tool the agent ran: tool name, short args, short result, ms
    guardrail_retry  when the answer check sent a reply back (what was wrong)
    model_step       one per model request: finish reason, tools requested, tokens
    run_end          stop reason, duration, token usage, cards / page results shown

Rules:
- Append-only: existing events are never edited or removed. Writes take a process lock
  plus an OS file lock, then replace the file atomically (write temp → os.replace), so a
  crash mid-write can't truncate the trail. If the file is ever unreadable it is moved
  aside to audit_trail.corrupt-<time>.json, never deleted.
- No secrets or personal data: no API keys, passwords, emails, or full messages. Users
  appear as "user:<id>" or "guest"; text is redacted and truncated to short previews.
"""

from __future__ import annotations

import fcntl
import json
import os
import re
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel

HW4_DIR = Path(__file__).resolve().parent.parent
AUDIT_PATH = Path(os.getenv("CAMPUS_AUDIT_PATH", HW4_DIR / "output" / "audit_trail.json"))
SCHEMA_VERSION = 1
PREVIEW = 160  # max characters of any message / args / result preview

_lock = threading.Lock()


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def new_run_id() -> str:
    return uuid.uuid4().hex[:12]


# ---------------------------------------------------------------------------
# Sensitive-data redaction (also applied to chat messages before the agent,
# the database, or this log ever see them; see main.chat)
# ---------------------------------------------------------------------------

_CARD_RE = re.compile(r"\b(?:\d[ -]?){12,18}\d\b")
_SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


def _luhn_ok(digits: str) -> bool:
    total, alt = 0, False
    for d in reversed(digits):
        n = int(d)
        if alt:
            n = n * 2 - 9 if n > 4 else n * 2
        total += n
        alt = not alt
    return total % 10 == 0


def redact(text: str) -> tuple[str, list[str]]:
    """Replace payment-card and SSN-like numbers. Returns (clean text, what was removed)."""
    found: list[str] = []

    def card(m: re.Match) -> str:
        digits = re.sub(r"\D", "", m.group())
        if 13 <= len(digits) <= 19 and _luhn_ok(digits):
            found.append("card_number")
            return "[card number removed]"
        return m.group()

    text = _CARD_RE.sub(card, text)
    if _SSN_RE.search(text):
        found.append("ssn")
        text = _SSN_RE.sub("[SSN removed]", text)
    return text, found


def preview(value: Any, limit: int = PREVIEW) -> str:
    """Short, single-line, email-free preview for the log."""
    if isinstance(value, BaseModel):
        value = value.model_dump(mode="json")
    text = value if isinstance(value, str) else json.dumps(value, default=str, ensure_ascii=False)
    text = _EMAIL_RE.sub("[email]", " ".join(text.split()))
    return text if len(text) <= limit else text[: limit - 1] + "…"


# ---------------------------------------------------------------------------
# Tool result summaries (what a reviewer needs, not the whole payload)
# ---------------------------------------------------------------------------

def summarize_result(result: Any) -> str:
    name = type(result).__name__
    try:
        if name == "SearchResult":
            top = ", ".join(p.name for p in result.products[:3])
            extra = f"; sold out in size: {len(result.sold_out_in_size)}" if result.sold_out_in_size else ""
            return preview(f"{result.total_matches} matches{extra}; top: {top}" + (f"; note: {result.note}" if result.note else ""))
        if name == "PriceLookup":
            quotes = ", ".join(f"{q.product_id}=${q.price:.2f}" for q in result.quotes)
            return preview(quotes + (f"; not found: {result.not_found}" if result.not_found else ""))
        if name == "StockReport":
            req = ""
            if result.requested_size:
                req = (
                    f"{result.requested_size}: not offered; "
                    if result.requested_size_offered is False
                    else f"{result.requested_size}={result.requested_quantity} ({result.requested_status}); "
                )
            sizes = " ".join(f"{s.size}={s.quantity}" for s in result.sizes)
            return preview(f"{result.product_id}: {req}{sizes}")
        if name == "ProductDescription":
            return preview(f"{result.product_id}: {result.garment_type}; colors {', '.join(result.colors)}")
        if name == "AlternativesResult":
            alts = ", ".join(a.product.product_id for a in result.alternatives)
            return preview(f"for {result.for_product_id} size {result.size}: {alts or 'none'}")
        if name == "CustomerContext":
            return f"user:{result.user_id} ({result.saved_messages} saved messages)"
        if name == "PageContext":
            v = result.viewing_product.product_id if result.viewing_product else None
            return preview(f"{result.page_type} {result.path}" + (f" viewing {v}" if v else ""))
        if name == "ToolError":
            return preview(f"error: {result.error}")
    except Exception:  # never let logging break a chat
        pass
    return preview(result)


# ---------------------------------------------------------------------------
# Append-only write
# ---------------------------------------------------------------------------

def append(events: list[dict]) -> None:
    """Append events to the trail. Never rewrites or drops existing events."""
    if not events:
        return
    for e in events:
        e.setdefault("schema_version", SCHEMA_VERSION)
    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lock_path = AUDIT_PATH.with_suffix(".lock")
    with _lock, open(lock_path, "w") as lock_file:
        fcntl.flock(lock_file, fcntl.LOCK_EX)
        try:
            existing: list = []
            if AUDIT_PATH.exists() and AUDIT_PATH.stat().st_size > 0:
                try:
                    existing = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
                    if not isinstance(existing, list):
                        raise ValueError("audit trail is not a JSON array")
                except (ValueError, json.JSONDecodeError):
                    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
                    AUDIT_PATH.rename(AUDIT_PATH.with_name(f"audit_trail.corrupt-{stamp}.json"))
                    existing = []
            tmp = AUDIT_PATH.with_suffix(".json.tmp")
            tmp.write_text(json.dumps(existing + events, indent=1, ensure_ascii=False), encoding="utf-8")
            os.replace(tmp, AUDIT_PATH)
        finally:
            fcntl.flock(lock_file, fcntl.LOCK_UN)
