# Data notes

The source files were copied from `~/Downloads/data-2/` into `HW4/data/`. That folder is gitignored, so neither the database nor the images get committed.

```
data/
├── campus_customs.db        (SQLite, 168 KB)
└── products/                (102 JPEGs, 788×788, 3.7 MB)
```

Relationships: `catalogue.product_id` 1 → 6 `inventory` rows (one per size). `users.id` 1 → many `chat_messages`. SQLite's `PRAGMA foreign_keys` is **off** by default, so the backend turns it on for each connection.

## `catalogue`: 102 products

| Field | Type | Meaning / values |
|---|---|---|
| `product_id` | TEXT, PK | URL-style slug, e.g. `berkeley-1-4-zip`. It is the key for inventory, images, and the cards the chatbot shows. |
| `name` | TEXT | Display name, built from the slug in title case, so it has some quirks: "Berkeley 1 4 Zip" means 1/4 Zip, "Ua Mens Tech L S 2 0" is Under Armour, and "Yale Sports Creqneck Field Hockey" has a typo. The UI may tidy these up for display, but the database keeps them as they are. |
| `garment_type` | TEXT | Free text with 22 spellings for about 5 real categories: tees, crewnecks, hoodies, quarter-zips and jackets/fleece. The UI groups them; the agent can search the raw text. |
| `description` | TEXT | 93–184 characters describing the garment, its colors, and its graphic. This is the agent's main evidence when answering "what does it look like" questions. |
| `colors` | TEXT (JSON list) | e.g. `["navy blue", "white"]`. The most common colors are navy blue (62), white (52), and heather gray (41). Values aren't standardized, so "navy" and "navy blue" both appear and color search needs fuzzy matching. |
| `search_tags` | TEXT (JSON list) | 270 different keywords in total (e.g. "Yale" 88, "college apparel" 48, "crewneck" 27). Used to match what the shopper types. |
| `image_file_path` | TEXT | `products/<product_id>.jpg`, relative to `data/`. All 102 files exist and match their slugs exactly. |
| `price` | REAL | USD. Price depends only on the garment type: tees $32; performance shirts, mocknecks and "hooded sweatshirts" $45; crewnecks $58; hoodies $68; quarter-zips $72; full-zip hoodies $88; jackets and fleece $98. |

The names line up with the site's collections:
- **Residential colleges:** Berkeley, Branford, Davenport, Grace Hopper, Jonathan Edwards, Morse, Pierson, Saybrook, Timothy Dwight, Trumbull, Benjamin Franklin.
- **Sports:** baseball, hockey, soccer, tennis, golf, diving, squash, fencing, sailing, volleyball, and more.
- **Relatives:** Mom, Dad, Aunt, Uncle, Grandma, Grandpa, Brother, Cousin.
- **Graduate and professional schools:** SOM, Law, Medicine, Nursing, Public Health, Art, Architecture, Music, Engineering, Divinity, Forest School.

## `inventory`: 612 rows (102 products × 6 sizes)

| Field | Type | Meaning / values |
|---|---|---|
| `id` | INTEGER, PK autoincrement | Row id. |
| `product_id` | TEXT, FK → catalogue | Every product has exactly 6 rows. |
| `size` | TEXT | `XS`, `S`, `M`, `L`, `XL`, `XXL`. There are no other sizes, so a request for, say, 3XL is honestly "not offered". |
| `quantity` | INTEGER | Units on hand, 0–25 (average 9.7, 5,920 in total). 145 size rows are at **0**, and no product is sold out in every size. The lowest are Football Left Chest T-Shirt with 9 units in total (3 sizes out) and Tri-Blend Hockey Tee with 13 units (4 sizes out). |

`UNIQUE(product_id, size)` means stock for one size is a single lookup. If checkout ever lowers stock, it should update that row in a transaction and never let it go below 0.

## `users`: 3 rows

| Field | Type | Meaning / values |
|---|---|---|
| `id` | INTEGER, PK autoincrement | Next new user gets id 4. |
| `name` | TEXT, NOT NULL | Full name ("Ada Lovelace"). Signup fills it as `first_name + " " + last_name`. |
| `email` | TEXT, NOT NULL, UNIQUE | Login identifier, e.g. `test@campuscustoms.yale.edu`. Signup should lowercase it and return a friendly "account already exists" error when it's taken. |
| `password_hash` | TEXT, NOT NULL | `pbkdf2_sha256$<salt (15–16 chars)>$<64-hex SHA-256 digest>`. The iteration count is **not stored**, so the backend has to use the same fixed number that created these hashes. The plain password is never stored or logged. |
| `created_at` | TEXT | Defaults to SQLite `datetime('now')` in UTC, e.g. `2026-09-19 11:34:09`. |
| `first_name`, `last_name` | TEXT, nullable | Added to the table later, so they can be null on older rows. The chatbot greets the user by `first_name`. |

## `chat_messages`: 22 rows

`id`, `user_id` (FK → users), `role` (`user` / `assistant`), `content` (markdown text), `products_json` (a JSON list of the full catalogue rows shown with that reply, or `[]`), and `created_at`. The sample history belongs to user 1 and shows the expected behavior: the chatbot answers from the database, says "no" honestly (for example, "only available in navy" when asked for pink), and remembers the user's name.
