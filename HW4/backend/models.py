"""Pydantic / PydanticAI structured types for the Campus Customs shop agent.

- Tool results (`SearchResult`, `ProductDescription`, `PriceLookup`, `StockReport`,
  `ToolError`) are what the agent sees from the database. Prices and stock only
  ever come from these.
- `AgentReply` is the agent's structured output: the chat text plus the product IDs
  to show as cards.
- `ChatRequest` / `ChatResponse` / `ProductCard` are the HTTP contract with the website.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, PrivateAttr

SizeName = Literal["XS", "S", "M", "L", "XL", "XXL"]


# ---------------------------------------------------------------------------
# Tool results (database -> agent). Every value is copied from a database row
# at call time; the agent quotes these and nothing else.
# ---------------------------------------------------------------------------

StockStatus = Literal["in_stock", "low_stock", "sold_out"]
LOW_STOCK_MAX = 3  # 1-3 units left counts as low stock


class ProductMatch(BaseModel):
    """One search hit: enough to pick candidates and show a card, nothing more."""

    product_id: str = Field(description="Key for every other tool and for product cards.")
    name: str
    category: str
    collection: str
    colors: list[str]
    price: float = Field(description="Price in USD from the catalogue table.")
    in_stock_sizes: list[SizeName] = Field(description="Sizes with quantity > 0 right now.")


class SearchResult(BaseModel):
    query: str
    filters: dict[str, str | float | bool] = Field(description="Filters actually applied, after normalizing (e.g. 'medium' -> 'M').")
    total_matches: int = Field(description="All matches, even if fewer are returned.")
    products: list[ProductMatch]
    sold_out_in_size: list[ProductMatch] = Field(
        default_factory=list,
        description="Products that match the keywords but are sold out in the requested size (they DO exist).",
    )
    note: str | None = Field(default=None, description="Explains an empty or adjusted result.")
    # Every matching id in rank order (not sent to the model; used to fill the page with all matches).
    _all_product_ids: list[str] = PrivateAttr(default_factory=list)


class ProductDescription(BaseModel):
    """What the product is and looks like (catalogue table)."""

    product_id: str
    name: str
    garment_type: str = Field(description="Raw garment type, e.g. 'quarter-zip pullover sweatshirt'.")
    category: str = Field(description="Shop category the website groups it under.")
    collection: str
    description: str = Field(description="Catalogue description of the garment, colors, and graphic.")
    colors: list[str] = Field(description="Every color on the garment; the only colors it comes in.")


class PriceQuote(BaseModel):
    product_id: str
    name: str
    price: float = Field(description="Exact catalogue price.")
    currency: Literal["USD"] = "USD"


class PriceLookup(BaseModel):
    """Prices for one or more products, so comparisons need a single call."""

    quotes: list[PriceQuote]
    not_found: list[str] = Field(default_factory=list, description="Requested ids/names with no matching product.")


class SizeStock(BaseModel):
    size: SizeName
    quantity: int = Field(ge=0, description="Units on hand; 0 means sold out in this size.")
    status: StockStatus


class StockReport(BaseModel):
    """Live stock for one product (inventory table), optionally focused on one requested size."""

    product_id: str
    name: str
    requested_size: str | None = Field(default=None, description="Normalized size the shopper asked about, if any.")
    requested_size_offered: bool | None = Field(
        default=None, description="False when we don't make that size at all (we only make XS-XXL)."
    )
    requested_quantity: int | None = Field(default=None, ge=0, description="Units on hand in the requested size.")
    requested_status: StockStatus | None = None
    sizes: list[SizeStock] = Field(description="All six sizes, XS to XXL, with quantity and status.")
    in_stock_sizes: list[SizeName]
    sold_out_sizes: list[SizeName]
    total_stock: int = Field(description="Units across all sizes.")
    checked_at: str = Field(description="UTC time the inventory table was read.")


class Alternative(BaseModel):
    product: ProductMatch
    why: str = Field(description="Why it's a good substitute, e.g. 'same collection; in stock in L'.")


class AlternativesResult(BaseModel):
    """In-stock substitutes for a product that is sold out (in a size or entirely)."""

    for_product_id: str
    for_name: str
    size: str | None = Field(description="Size the substitutes must have in stock, if one was given.")
    size_offered: bool = Field(description="False if we don't make that size at all.")
    original_in_stock_in_size: bool | None = Field(
        default=None, description="Whether the original product is actually in stock in that size."
    )
    alternatives: list[Alternative]


class ToolError(BaseModel):
    """Returned instead of guessing when a product can't be found."""

    error: str
    suggestions: list[ProductMatch] = Field(default_factory=list, description="Closest real products, if any.")


# ---------------------------------------------------------------------------
# Agent context (deps): who is chatting and what page they are on
# ---------------------------------------------------------------------------

class CustomerContext(BaseModel):
    """The logged-in shopper, read from the users table via the session cookie."""

    user_id: int
    first_name: str
    last_name: str
    email: str
    member_since: str = Field(description="users.created_at (UTC).")
    saved_messages: int = Field(description="Messages already stored in chat_messages before this turn.")


class ViewedProduct(BaseModel):
    product_id: str
    name: str
    category: str
    price: float
    colors: list[str]


class PageContext(BaseModel):
    """Validated page context. Product facts come from the database, never from browser text."""

    path: str
    page_type: Literal["home", "products", "product_detail", "about", "login", "signup", "other"]
    viewing_product: ViewedProduct | None = Field(default=None, description="The item on a single-item page.")
    listing_title: str | None = None
    visible_products: list[str] = Field(default_factory=list, description="Names of cards shown on the page.")


# ---------------------------------------------------------------------------
# Agent output
# ---------------------------------------------------------------------------

class AgentReply(BaseModel):
    """The agent's final answer for one chat turn."""

    reply: str = Field(
        description=(
            "What the shopper reads in the chat. Friendly Campus Customs voice, short, plain text "
            "with optional **bold** and '- ' bullets. Prices and stock must come from tool results."
        )
    )
    show_on_page: bool = Field(
        default=False,
        description=(
            "True when the shopper is browsing a type of item (e.g. 'what hoodies do you have?', "
            "'show me Berkeley gear') and the results of your latest search_products call should be "
            "shown as product cards on the website. False for questions about one specific product, "
            "stock/price checks, policies, or small talk."
        ),
    )
    page_title: str | None = Field(
        default=None,
        max_length=60,
        description="Short heading for the page results when show_on_page is true, e.g. 'Navy hoodies'.",
    )
    product_ids: list[str] = Field(
        default_factory=list,
        max_length=6,
        description=(
            "product_id values (from tool results in this conversation) to show as product cards "
            "next to the reply, best match first. Empty when no specific products are relevant."
        ),
    )


# ---------------------------------------------------------------------------
# HTTP contract with the website
# ---------------------------------------------------------------------------

class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class PageContextIn(BaseModel):
    """What the browser says the shopper is looking at. Untrusted: validated against the DB in agent.py."""

    path: str = Field(default="/", max_length=200, description="Current route, e.g. /products/morse-1-4-zip.")
    product_id: str | None = Field(default=None, max_length=120, description="Product on a single-item page.")
    listing_title: str | None = Field(default=None, max_length=80, description="Heading of chat results on the page.")
    visible_product_ids: list[str] = Field(default_factory=list, max_length=36, description="Cards currently on the page.")


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatTurn] = Field(
        default_factory=list,
        max_length=20,
        description="Earlier turns, oldest first. Used for guests only; logged-in history comes from the database.",
    )
    page: PageContextIn | None = None


class ProductCard(BaseModel):
    """What the chat widget needs to draw a product card (built from the database, not the model)."""

    product_id: str
    name: str
    category: str
    collection: str
    garment_type: str
    description: str
    colors: list[str]
    image_url: str
    price: float
    total_stock: int
    in_stock_sizes: list[SizeName]


class PageResults(BaseModel):
    """Structured search matches the website renders on the page (the chat -> page contract)."""

    title: str = Field(description="Heading shown above the cards.")
    query: str = Field(description="Keywords the agent searched for.")
    filters: dict[str, str | float | bool] = Field(default_factory=dict, description="Filters the search applied.")
    total_matches: int = Field(description="How many catalogue products matched.")
    products: list[ProductCard] = Field(description="Cards to draw, best match first (built from the database).")


class HistoryMessage(BaseModel):
    """One stored message, as the chat panel reloads it."""

    id: int
    role: Literal["user", "assistant"]
    content: str
    created_at: str
    products: list[ProductCard] = Field(default_factory=list)


class AnswerCheck(BaseModel):
    """Result of the guardrail that runs on every agent answer before it is sent."""

    prices_checked: int = Field(description="Dollar amounts in the reply that matched a database price.")
    retries: int = Field(description="Times the agent was sent back to fix an unverified claim.")
    passed: bool


class ChatResponse(BaseModel):
    reply: str
    products: list[ProductCard] = Field(default_factory=list, description="A few cards shown inside the chat bubble.")
    page_results: PageResults | None = Field(
        default=None, description="When present, the website shows these matches as cards on the page."
    )
    model: str
    tool_calls: list[str] = Field(default_factory=list, description="Names of tools the agent used this turn.")
    check: AnswerCheck | None = None
