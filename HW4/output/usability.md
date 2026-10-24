# Usability Improvements (Problem 9)

The core shop works: browsing, accounts, a database-grounded agent, chat search that fills the page, and customer memory. These four improvements make it easier to use and make the agent more trustworthy. Each one is visible in the running app; the **Where to see it** lines say how to find it.

| # | Type | Improvement | Main files |
|---|---|---|---|
| 1 | Front end | Shopping bag with live stock limits | `frontend/src/bagContext.tsx`, `components/BagDrawer.tsx`, `pages/ProductDetail.tsx`, `components/NavBar.tsx` |
| 2 | Front end | Instant search in the header | `frontend/src/components/HeaderSearch.tsx`, `components/NavBar.tsx` |
| 3 | Agent / backend | `find_alternatives` tool: rescue sold-out sizes | `backend/tools.py`, `backend/agent.py`, `backend/models.py`, `prompts/prompt.md` |
| 4 | Agent / backend | Answer guardrail: every price is checked before the shopper sees it | `backend/agent.py`, `backend/models.py`, `prompts/prompt.md`, `components/ChatWidget.tsx`, `backend/checks/check_guardrail.py` |

---

## 1. Shopping bag with live stock limits (front end)

**What I added**
- The "Add size M to bag" button on every product page now works (before, it was disabled). Pick a size, add it, and the bag drawer slides in from the right.
- A **🛍️ Bag** button in the header with a count badge that pops when something is added. It's visible on every page.
- The **bag drawer** shows each line (image, name, size, unit price), a − / + quantity stepper, a line total, Remove, the subtotal, and a reminder that items are made to order (5–8 business days). It closes with ×, Esc, or a click outside.
- **Stock limits from the database:**
  - You can't add more than the units on hand. Adding a 3rd Morse 1/4 Zip in S (2 in stock) shows "You already have all 2 in size S in your bag", and the + button stops at "max 2 in stock".
  - Sold-out sizes can't be added at all.
  - Every time the drawer opens, it re-reads stock **and price** from `/api/products/{id}`. If stock dropped, the quantity is lowered with the notice "Stock changed for some items, so we adjusted their quantities." If an item sold out, it shows "Sold out now. Please remove."
- The bag is **saved on the device** (`localStorage`), so it survives reloads and coming back later.
- Checkout itself is shown as "Checkout (coming soon)". Payments are out of scope for this assignment, and the drawer says so honestly instead of pretending to take an order.

**Why it helps**
- **Shoppers:** before this, there was no way to collect items; you had to remember what you liked across 102 products. The bag lets families build an order (a Mom hoodie, a Dad tee, a Grandpa crewneck) and see the total right away.
- **Business:** the stock cap means the shop never sells units it doesn't have. Campus Customs makes items to order with real inventory limits, so overselling would mean refunds and unhappy customers. Re-checking prices when the drawer opens means the subtotal always matches the catalogue. The saved bag gives returning shoppers a reason to finish their order.

**Where to see it:** open any product (for example `/products/morse-1-4-zip`), choose a size, and click **Add size … to bag**. Use the **🛍️ Bag** button in the header to reopen it.

---

## 2. Instant search in the header (front end)

**What I added**
- A search box in the header on **every page** ("Search hoodies, colleges, colors…").
- As you type, a dropdown shows up to 6 matching products with **thumbnail, name, category, In stock / Sold out, and price**. Matching checks name, category, collection, garment type, colors, and search tags. Every word must match ("navy hood" finds navy hoodies), and name matches rank first.
- **Keyboard support:** ↑ / ↓ move through the results, Enter opens the highlighted product, and Esc closes the dropdown.
- The last row, **"See all N results for '…' →"** (or Enter with nothing highlighted), opens the Products page already filtered to that search (`/products?q=…`), and clears any chat results so the shopper sees exactly what they searched for.
- A friendly empty state: "No matches for 'x'. Try a college, sport, or color, or ask the Bulldog in chat."
- On phones, the search box moves to its own full-width row under the logo.

**Why it helps**
- **Shoppers:** most people come looking for something specific ("my college", "Berkeley", "hockey"). Before, they had to click Products, find the filter, and scroll. Now it takes about two keystrokes from any page, with the price and stock visible before they click.
- **Business:** faster product discovery means more product views and fewer people leaving. It also works for shoppers who would rather not chat, and it costs nothing to run (no model call), so the agent can focus on the harder questions.

**Where to see it:** type `berkeley` in the header search box on the Home page. Use ↓ ↓ Enter, or click "See all".

---

## 3. `find_alternatives` tool: rescue sold-out sizes (agent / backend)

**What I added**
- A new read-only agent tool, `find_alternatives(product_ref, size?, limit=4)`, returning `AlternativesResult` (`backend/models.py`).
- It ranks other products that are **in stock in the shopper's size right now**:
  - same category (+6, required unless the collection and colors are a strong match)
  - same collection, e.g. Residential Colleges or Relatives (+4)
  - shared colors (+1 each, up to 3)
  - same price (+1.5), or within $15 (+0.5)
- Each alternative comes with a plain-language `why`, e.g. "also quarter-zips; same Residential Colleges collection; shares heather gray, red; same price; in stock in L (20)".
- It handles edge cases: a size we don't make (3XL) returns `size_offered: false` and no alternatives, and an unknown product returns a `ToolError` with suggestions.
- **Prompt rule** ("Always offer a way forward"): after any sold-out answer, call `find_alternatives` with the shopper's size, suggest the top 2–3 with one short reason each, and show the original product's card first, followed by the alternatives' cards.

**Why it helps**
- **Shoppers:** a bare "Size L is sold out" is a dead end. Now the answer continues with "…in stock in L instead: Benjamin Franklin 1/4 Zip (20 in L), Berkeley 1/4 Zip (5 in L), Branford 1/4 Zip (15 in L)", with clickable cards.
- **Business:** about 145 of the 612 size rows are at 0, so sold-out answers come up often. Each one is a sale that would otherwise be lost, and this tool keeps the shopper buying. The suggestions come from the database, filtered by real stock, so the agent can't recommend something that's also sold out.

**Where to see it:** in the chat, ask "I need the Morse 1/4 Zip in a large. Do you have it?" (L is sold out in the database).

**Verified:** live answer: "Size L is sold out in the Morse 1/4 Zip. It's $72.00. In stock in L instead: Benjamin Franklin 1/4 Zip, same Residential Colleges collection and price, 20 in L; Berkeley 1/4 Zip, 5 in L; Branford 1/4 Zip, 15 in L." It came with 4 cards (Morse first). All counts match `inventory`.

---

## 4. Answer guardrail: every price is checked before the shopper sees it (agent / backend)

**What I added**
- A PydanticAI **output validator** (`check_answer` in `backend/agent.py`) that runs on every agent answer **before** it leaves the server:
  1. **Prices:** every dollar amount in the reply must match a price that a tool returned **in this turn** (search, `get_price`, `find_alternatives`, or the product being viewed). Simple math on those prices is allowed: differences ("$26.00 less"), sums, and quantity totals (2–10×). So are amounts the shopper typed themselves ("under $60").
  2. **No leaks:** the reply can't contain internal markers (Portkey or API-key text, prompt section headings).
  3. **No other people's emails:** the only emails allowed are the shop's (orderdept@campuscustoms.com) and the logged-in shopper's own.
  4. Product card IDs that don't exist in the database are dropped silently.
- If a check fails, the validator raises `ModelRetry` with the exact reason (e.g. "It mentions $59.99, which does not match any price from a tool result in this turn. Call get_price…"). The agent fixes its answer and tries again (`retries=2`). If it still can't produce a verified answer, the shopper gets an honest fallback ("I couldn't verify my answer just now…") instead of a wrong number.
- Each response now includes an `AnswerCheck` (`prices_checked`, `retries`, `passed`). The chat shows a green badge under answers with prices: **"✓ 1 price checked against live inventory"**, plus "· corrected" if the guardrail had to send the answer back. Hovering explains what it means.
- The prompt gained an "Answer check" section so the agent knows the rules up front.
- An offline check script, `backend/checks/check_guardrail.py`, needs no API key: a scripted fake model invents a $59.99 sale price, and the script asserts it was blocked and corrected to $72.00.

**Why it helps**
- **Shoppers:** price is the one thing a shop chatbot must never get wrong. The prompt *asks* for honesty; this guardrail *enforces* it in code, so a model slip ("on sale for $59.99") can't reach a customer. The badge lets shoppers see the answer was checked.
- **Business:** a quoted price the shop won't honor causes refunds, disputes, and lost trust. The leak and email checks also stop the agent from exposing configuration or one customer's email to another, protecting customers' private data. It costs almost nothing: the check is local Python (microseconds), and an extra model call only happens when an answer actually fails.

**Where to see it**
- Ask any price question in the chat (e.g. "How much is the Morse 1/4 Zip?") and look for the green **✓ … checked against live inventory** badge under the answer.
- To see a blocked answer: run `python checks/check_guardrail.py` from `backend/`. It prints `PASS: invented $59.99 blocked; corrected answer sent: The Morse 1/4 Zip is **$72.00**. | prices_checked=1 retries=1 passed=True`.

---

## Verification summary (running app, 2026-10-16)

| Improvement | Check | Result |
|---|---|---|
| 1 Bag | Added Morse 1/4 Zip S three times (2 in stock) | 1st and 2nd added; 3rd: "You already have all 2 in size S in your bag." Badge shows 2. |
| 1 Bag | Added XL and opened the drawer | 2 lines, "max 2 in stock" on S with + disabled, subtotal **$216.00** (3 × $72.00). |
| 1 Bag | Planted a stale bag (S × 5 at an old $60) and reopened | Corrected to S × 2 at $72.00 with "Stock changed for some items, so we adjusted their quantities." |
| 2 Search | Typed "berkeley" | 2 suggestions with images and prices (Berkeley 1/4 Zip $72.00, Berkeley Sweater Fleece Jacket $98.00). |
| 2 Search | ↓ ↓ Enter | Opened `/products/berkeley-sweater-fleece-jacket`. |
| 2 Search | "navy hood" + Enter | `/products?q=navy%20hood`: "Showing 25 of 102 styles". |
| 3 Alternatives | "Morse 1/4 Zip in a large?" | Sold out, plus 3 in-stock-in-L quarter-zips from the same collection with counts, and 4 cards. |
| 4 Guardrail | Same answer | Badge: "✓ 1 price checked against live inventory". |
| 4 Guardrail | `checks/check_guardrail.py` (offline) | Invented $59.99 blocked → corrected $72.00, `retries=1`. |
