"""Tools the Campus Customs agent can call.

Every tool reads the local SQLite database through db.py, so the agent's answers
about price, size, and stock are always grounded in real rows. The tools are
read-only. They are plain functions here; agent.py registers them with the agent.
"""

from __future__ import annotations

import math
import re
from datetime import datetime, timezone

import db
from models import (
    LOW_STOCK_MAX,
    Alternative,
    AlternativesResult,
    PriceLookup,
    PriceQuote,
    ProductDescription,
    ProductMatch,
    SearchResult,
    SizeStock,
    StockReport,
    StockStatus,
    ToolError,
)

MAX_RESULTS = 12

_STOPWORDS = {
    "a", "an", "and", "any", "are", "do", "does", "for", "find", "from", "got", "have", "i", "in", "is",
    "it", "me", "my", "of", "on", "or", "show", "some", "something", "that", "the", "there", "to",
    "want", "what", "which", "with", "you", "your", "please", "looking", "need", "like", "would",
    "can", "get", "buy", "shop", "item", "items", "product", "products", "merch", "stuff", "one", "ones",
}

# Extra words per category/collection so everyday shopper language matches the catalogue.
_CATEGORY_SYNONYMS = {
    "Tees & Tops": "tee tees tshirt t-shirt shirt top short sleeve",
    "Crewnecks": "crewneck crew sweatshirt sweater pullover",
    "Hoodies": "hoodie hoody hood hooded sweatshirt pullover",
    "Quarter-Zips": "quarter zip quarterzip quarter-zip 1/4 pullover",
    "Jackets & Fleece": "jacket fleece coat outerwear layer warm",
}
_COLLECTION_SYNONYMS = {
    "Relatives": "family parent parents gift relative",
    "Residential Colleges": "college residential",
    "Graduate & Professional Schools": "graduate grad school professional alumni",
    "Sports": "sport sports athletic team varsity game",
    "Classic Yale": "classic",
}

_SIZE_WORDS = {
    "xs": "XS", "extra small": "XS", "x-small": "XS", "xsmall": "XS",
    "s": "S", "small": "S", "sm": "S",
    "m": "M", "medium": "M", "med": "M",
    "l": "L", "large": "L", "lg": "L",
    "xl": "XL", "extra large": "XL", "x-large": "XL", "xlarge": "XL",
    "xxl": "XXL", "2xl": "XXL", "xx-large": "XXL", "xxlarge": "XXL", "2x": "XXL",
}


def _normalize_size(size: str) -> str:
    s = size.strip().lower()
    return _SIZE_WORDS.get(s, size.strip().upper())


def _singular(word: str) -> str:
    if len(word) > 3 and word.endswith("ies"):
        return word[:-3] + "y"
    if len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def _tokens(text: str) -> list[str]:
    words = re.findall(r"[a-z0-9]+", text.lower().replace("grey", "gray"))
    return [_singular(w) for w in words if w not in _STOPWORDS]


def _haystack(p: dict) -> str:
    parts = [
        p["name"], p["raw_name"], p["garment_type"], p["description"], p["category"], p["collection"],
        " ".join(p["colors"]), " ".join(p["search_tags"]),
        _CATEGORY_SYNONYMS.get(p["category"], ""), _COLLECTION_SYNONYMS.get(p["collection"], ""),
    ]
    return " ".join(_singular(w) for w in re.findall(r"[a-z0-9]+", " ".join(parts).lower().replace("grey", "gray")))


def _match_category(category: str) -> str | None:
    c = category.strip().lower()
    for name in db.CATEGORIES:
        if c and (c in name.lower() or c in _CATEGORY_SYNONYMS[name].split() or _singular(c) in _CATEGORY_SYNONYMS[name].split()):
            return name
    return None


def _to_match(p: dict, sizes: dict[str, int]) -> ProductMatch:
    return ProductMatch(
        product_id=p["product_id"],
        name=p["name"],
        category=p["category"],
        collection=p["collection"],
        colors=p["colors"],
        price=p["price"],
        in_stock_sizes=[s for s in db.SIZE_ORDER if sizes.get(s, 0) > 0],
    )


def _status(quantity: int) -> StockStatus:
    if quantity <= 0:
        return "sold_out"
    return "low_stock" if quantity <= LOW_STOCK_MAX else "in_stock"


def _resolve(product_ref: str) -> dict | ToolError:
    """Find one product by product_id, or by exact/unique name, so the agent never has to guess."""
    ref = product_ref.strip()
    p = db.get_product(ref)
    if p is not None:
        return p
    wanted = ref.lower()
    for candidate in db.list_products():
        if wanted in (candidate["name"].lower(), candidate["raw_name"].lower()):
            return db.get_product(candidate["product_id"])
    hits = search_products(ref, limit=3)
    if hits.total_matches == 1:
        return db.get_product(hits.products[0].product_id)
    return ToolError(
        error=f"No single product matches '{product_ref}'. Use one of the suggestions' product_id, or search_products.",
        suggestions=hits.products,
    )


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

def search_products(
    query: str = "",
    category: str | None = None,
    color: str | None = None,
    size: str | None = None,
    max_price: float | None = None,
    limit: int = 8,
) -> SearchResult:
    """Search the catalogue by keywords plus optional filters, best matches first."""
    limit = max(1, min(limit, MAX_RESULTS))
    products = db.list_products()
    stock = db.stock_by_product()
    filters: dict[str, str | float | bool] = {}
    notes: list[str] = []

    if category:
        matched = _match_category(category)
        if matched:
            filters["category"] = matched
            products = [p for p in products if p["category"] == matched]
        else:
            notes.append(f"Unknown category '{category}'; categories are: {', '.join(db.CATEGORIES)}.")
    if color:
        c = color.strip().lower().replace("grey", "gray")
        filters["color"] = c
        products = [p for p in products if any(c in pc.lower() for pc in p["colors"])]
    if max_price is not None:
        filters["max_price"] = max_price
        products = [p for p in products if p["price"] <= max_price]

    terms = list(dict.fromkeys(_tokens(query)))
    if terms:
        scored = []
        for p in products:
            hay = _haystack(p).split()
            hay_set = set(hay)
            name_words = set(_tokens(p["name"]))
            hits = [t for t in terms if t in hay_set]
            if not hits:
                continue
            score = len(hits) * 10 + sum(3 for t in hits if t in name_words) + sum(hay.count(t) for t in hits) * 0.1
            scored.append((len(hits), score, p))
        # Prefer products that match most of the shopper's words.
        best = max((h for h, _, _ in scored), default=0)
        need = max(1, math.ceil(best * 0.6))
        scored = [x for x in scored if x[0] >= need]
        scored.sort(key=lambda x: (-x[1], x[2]["name"]))
        products = [p for _, _, p in scored]

    # The size filter runs last so matching products that are sold out in that size are
    # reported, not silently dropped (otherwise "Morse 1/4 Zip in L" looks like no such product).
    sold_out_in_size: list[ProductMatch] = []
    if size:
        s = _normalize_size(size)
        filters["size_in_stock"] = s
        if s not in db.SIZE_ORDER:
            notes.append(
                f"We don't make size {size} in any product; sizes are {', '.join(db.SIZE_ORDER)}. "
                f"{len(products)} product(s) match the other criteria."
            )
            products = []
        else:
            in_size = [p for p in products if stock.get(p["product_id"], {}).get(s, 0) > 0]
            sold_out_in_size = [_to_match(p, stock.get(p["product_id"], {})) for p in products if p not in in_size][:limit]
            products = in_size
            if sold_out_in_size:
                notes.append(f"{len(sold_out_in_size)} matching product(s) exist but are sold out in {s}; see sold_out_in_size.")

    if not products and not sold_out_in_size and not (size and _normalize_size(size) not in db.SIZE_ORDER):
        notes.append("No products match. Say so honestly and suggest close alternatives (try a broader search).")

    result = SearchResult(
        query=query,
        filters=filters,
        total_matches=len(products),
        products=[_to_match(p, stock.get(p["product_id"], {})) for p in products[:limit]],
        sold_out_in_size=sold_out_in_size,
        note=" ".join(notes) or None,
    )
    result._all_product_ids = [p["product_id"] for p in products]
    return result


def get_product_description(product_ref: str) -> ProductDescription | ToolError:
    """What one product is and looks like: garment type, description, and colors."""
    p = _resolve(product_ref)
    if isinstance(p, ToolError):
        return p
    return ProductDescription(
        product_id=p["product_id"],
        name=p["name"],
        garment_type=p["garment_type"],
        category=p["category"],
        collection=p["collection"],
        description=p["description"],
        colors=p["colors"],
    )


def get_price(product_refs: list[str]) -> PriceLookup:
    """Exact catalogue prices for one or more products (max 12)."""
    quotes: list[PriceQuote] = []
    not_found: list[str] = []
    for ref in list(dict.fromkeys(product_refs))[:MAX_RESULTS]:
        p = _resolve(ref)
        if isinstance(p, ToolError):
            not_found.append(ref)
        else:
            quotes.append(PriceQuote(product_id=p["product_id"], name=p["name"], price=p["price"]))
    return PriceLookup(quotes=quotes, not_found=not_found)


def get_stock(product_ref: str, size: str | None = None) -> StockReport | ToolError:
    """Live units on hand for one product: every size, plus the requested size if one is given."""
    p = _resolve(product_ref)
    if isinstance(p, ToolError):
        return p
    by_size = {x["size"]: x["quantity"] for x in p["sizes"]}  # fresh read of the inventory table
    sizes = [SizeStock(size=s, quantity=by_size.get(s, 0), status=_status(by_size.get(s, 0))) for s in db.SIZE_ORDER if s in by_size]
    report = StockReport(
        product_id=p["product_id"],
        name=p["name"],
        sizes=sizes,
        in_stock_sizes=[x.size for x in sizes if x.quantity > 0],
        sold_out_sizes=[x.size for x in sizes if x.quantity == 0],
        total_stock=sum(x.quantity for x in sizes),
        checked_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
    )
    if size:
        s = _normalize_size(size)
        report.requested_size = s
        report.requested_size_offered = s in by_size
        if s in by_size:  # a size we don't make has no quantity or status, only offered=False
            report.requested_quantity = by_size[s]
            report.requested_status = _status(by_size[s])
    return report


def find_alternatives(product_ref: str, size: str | None = None, limit: int = 4) -> AlternativesResult | ToolError:
    """In-stock substitutes for a product: same category first, then shared collection, colors, and price.

    With a size, every alternative has that size in stock right now, so a sold-out
    answer can always end with something the shopper can actually buy.
    """
    p = _resolve(product_ref)
    if isinstance(p, ToolError):
        return p
    limit = max(1, min(limit, 6))
    stock = db.stock_by_product()
    s = _normalize_size(size) if size else None
    offered = s is None or s in db.SIZE_ORDER
    own = stock.get(p["product_id"], {})
    colors = {c.lower() for c in p["colors"]}

    scored = []
    for c in db.list_products():
        if c["product_id"] == p["product_id"]:
            continue
        cs = stock.get(c["product_id"], {})
        if s and offered and cs.get(s, 0) <= 0:
            continue
        if not s and sum(cs.values()) <= 0:
            continue
        reasons, score = [], 0.0
        if c["category"] == p["category"]:
            score += 6
            reasons.append(f"also {c['category'].lower()}")
        if c["collection"] == p["collection"] and c["collection"] != "Classic Yale":
            score += 4
            reasons.append(f"same {c['collection']} collection")
        shared = colors & {x.lower() for x in c["colors"]}
        if shared:
            score += min(len(shared), 3)
            reasons.append("shares " + ", ".join(sorted(shared)[:2]))
        if c["price"] == p["price"]:
            score += 1.5
            reasons.append("same price")
        elif abs(c["price"] - p["price"]) <= 15:
            score += 0.5
        if score < 6:  # must at least be the same kind of garment or a close collection + color match
            continue
        if s and offered:
            reasons.append(f"in stock in {s} ({cs.get(s, 0)})")
        scored.append((score, c, "; ".join(reasons)))

    scored.sort(key=lambda x: (-x[0], x[1]["name"]))
    return AlternativesResult(
        for_product_id=p["product_id"],
        for_name=p["name"],
        size=s,
        size_offered=offered,
        original_in_stock_in_size=(own.get(s, 0) > 0) if s and offered else None,
        alternatives=[Alternative(product=_to_match(c, stock.get(c["product_id"], {})), why=why) for _, c, why in scored[:limit]]
        if offered
        else [],
    )


def product_cards(product_ids: list[str]) -> list[dict]:
    """Database rows for the cards shown next to a reply. Unknown ids are dropped."""
    stock = db.stock_by_product()
    cards = []
    for pid in dict.fromkeys(product_ids):
        p = db.get_product(pid)
        if p is None:
            continue
        sizes = stock.get(pid, {})
        cards.append(
            {
                **{k: p[k] for k in ("product_id", "name", "category", "collection", "garment_type", "description", "colors", "image_url", "price")},
                "total_stock": sum(sizes.values()),
                "in_stock_sizes": [s for s in db.SIZE_ORDER if sizes.get(s, 0) > 0],
            }
        )
    return cards
