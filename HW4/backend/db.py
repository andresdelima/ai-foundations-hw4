"""SQLite access for the Campus Customs shop.

The database lives in HW4/data/ (gitignored). Every query goes through here so
prices and stock always come from the database, never from hardcoded values.
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

HW4_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("CAMPUS_DATA_DIR", HW4_DIR / "data")).resolve()
DB_PATH = DATA_DIR / "campus_customs.db"
IMAGES_DIR = DATA_DIR / "products"

SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]


@contextmanager
def connect(readonly: bool = True) -> Iterator[sqlite3.Connection]:
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found at {DB_PATH}. Copy campus_customs.db into HW4/data/.")
    uri = DB_PATH.as_uri() + ("?mode=ro" if readonly else "")
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        if not readonly:
            conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Display helpers: the catalogue names are generated from slugs ("1 4 Zip"),
# so tidy them for shoppers without changing the stored data.
# ---------------------------------------------------------------------------

_NAME_FIXES = [
    (r"\b1 4 Zip\b", "1/4 Zip"),
    (r"\bT Shirt\b", "T-Shirt"),
    (r"\bTri Blend\b", "Tri-Blend"),
    (r"\bCreqneck\b", "Crewneck"),
    (r"\bTrack Field\b", "Track & Field"),
    (r"\bTrack And Field\b", "Track & Field"),
    (r"\bUa Mens Tech L S 2 0\b", "UA Men's Tech L/S 2.0"),
    (r"\bUa\b", "UA"),
    (r"\bMens\b", "Men's"),
    (r"\bVs\b", "vs."),
    (r"\bVit\b", "VIT"),
    (r"\bOf\b", "of"),
    (r"\bAnd\b", "and"),
    (r" Hoodie 1$", " Hoodie"),
]


def display_name(raw: str) -> str:
    name = raw
    for pattern, repl in _NAME_FIXES:
        name = re.sub(pattern, repl, name)
    return name


def category_for(garment_type: str) -> str:
    g = garment_type.lower()
    if "quarter-zip" in g:
        return "Quarter-Zips"
    if "jacket" in g or "fleece" in g:
        return "Jackets & Fleece"
    if "hood" in g:
        return "Hoodies"
    if "crewneck" in g or "mockneck" in g:
        return "Crewnecks"
    return "Tees & Tops"


CATEGORIES = ["Tees & Tops", "Crewnecks", "Hoodies", "Quarter-Zips", "Jackets & Fleece"]

_COLLEGES = [
    "benjamin franklin", "berkeley", "branford", "davenport", "grace hopper", "jonathan edwards",
    "morse", "pauli murray", "pierson", "saybrook", "silliman", "timothy dwight", "trumbull", "ezra stiles",
]
_SPORTS = [
    "baseball", "basketball", "football", "hockey", "soccer", "tennis", "golf", "diving", "swimming",
    "squash", "fencing", "sailing", "volleyball", "lacrosse", "track", "harvard", "bowl",
]
_RELATIVES = ["mom", "dad", "aunt", "uncle", "grandma", "grandpa", "brother", "sister", "cousin"]


def collection_for(raw_name: str) -> str:
    n = raw_name.lower()
    words = set(re.findall(r"[a-z]+", n))
    if any(c in n for c in _COLLEGES):
        return "Residential Colleges"
    if "school" in words or "divinity" in words:
        return "Graduate & Professional Schools"
    if words & set(_RELATIVES):
        return "Relatives"
    if any(s in words for s in _SPORTS):
        return "Sports"
    return "Classic Yale"


COLLECTIONS = ["Classic Yale", "Residential Colleges", "Sports", "Relatives", "Graduate & Professional Schools"]


def image_url(image_file_path: str) -> str:
    # Only files inside data/products/ are served; the database itself never is.
    return "/media/products/" + Path(image_file_path).name


def _product_from_row(row: sqlite3.Row) -> dict:
    return {
        "product_id": row["product_id"],
        "name": display_name(row["name"]),
        "raw_name": row["name"],
        "garment_type": row["garment_type"],
        "category": category_for(row["garment_type"]),
        "collection": collection_for(row["name"]),
        "description": row["description"],
        "colors": json.loads(row["colors"]),
        "search_tags": json.loads(row["search_tags"]),
        "image_url": image_url(row["image_file_path"]),
        "price": row["price"],
        "total_stock": row["total_stock"],
    }


_PRODUCT_SELECT = """
    SELECT c.*, COALESCE(SUM(i.quantity), 0) AS total_stock
    FROM catalogue c LEFT JOIN inventory i ON i.product_id = c.product_id
"""


def list_products() -> list[dict]:
    with connect() as conn:
        rows = conn.execute(_PRODUCT_SELECT + " GROUP BY c.product_id ORDER BY c.name").fetchall()
    return [_product_from_row(r) for r in rows]


def stock_by_product() -> dict[str, dict[str, int]]:
    """{product_id: {size: quantity}} for every product, read fresh from inventory."""
    with connect() as conn:
        rows = conn.execute("SELECT product_id, size, quantity FROM inventory").fetchall()
    stock: dict[str, dict[str, int]] = {}
    for r in rows:
        stock.setdefault(r["product_id"], {})[r["size"]] = r["quantity"]
    return stock


def get_product(product_id: str) -> dict | None:
    with connect() as conn:
        row = conn.execute(_PRODUCT_SELECT + " WHERE c.product_id = ? GROUP BY c.product_id", (product_id,)).fetchone()
        if row is None:
            return None
        sizes = conn.execute("SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,)).fetchall()
    product = _product_from_row(row)
    by_size = {s["size"]: s["quantity"] for s in sizes}
    product["sizes"] = [{"size": s, "quantity": by_size[s]} for s in SIZE_ORDER if s in by_size]
    return product
