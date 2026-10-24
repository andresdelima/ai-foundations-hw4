# AI Prompts Log

This file logs what I typed during vibe coding for HW4. The running site, the database writes, and the screenshots are the evidence.

## Setup: Project Context

### Prompt Typed

> working on homework 4 todya

> As we did for hw3, I'll give you detailed prompts for each step of hw4

> The context: Campus customs needs a real customer website with a helpful chatbot. We need to build a react + vite typescript front end and a python fastAPI backend whose brain is a pydanticAI agent. Shoppers should be able to browse products, create an account, chat about merch, see matching items appear on the page, and get honest answers about price and stock from a local database.
>
> I will give you a database with tables for the product catalogue, inventory by size and users (hashed passwords). Product image file paths are in the catalogue table. Research yalebulldogblue.com to learn the style of Campus Customs page and information for the agent prompt.
>
> Use the PORTKEY_API_KEY for the agent's AI calls, but make sure this is not exposed. Ok to use any of the models in the 5.6 or 6 series for OpenAI through the portkey.
>
> We will do one problem at a time. At the end, you will push the project to a public GitHub repo. I should be able to submit the repo URL to canvas (so need a friendly form; last problem has a file tree). Do not commit the database or product images.

### Follow-Up Prompt

> we dont need to include hours, this will be an online sales service (available 24/7)

**What was lacking:** The research notes treated store hours as missing information, but the shop is an online service that is open 24/7, so hours don't apply.

## Problem 1: AI Prompts Log

### Prompt Typed

> Create AI_prompts.md. Keep this updated as we work. This is the log of what I type during vibe coding.
>
> One section for each problem. Each section needs:
>
> -problem number and title
> -at least one prompt I typed, in my own words as much as possible.
> -One follow up prompt (if it was necessary). And one sentence on what was lacking after the first.
>
> The reunning site, database writes and screenshots are the evidence - no need for any extra proof essay beyond these prompts

### Follow-Up Prompt

None needed.

## Data Hand-Off

### Prompt Typed

> @"/Users/andresdelima/Downloads/data-2/"

## Problem 2: Analyze the Database

### Prompt Typed

> Look at the database data/campus_customs.db and understand the fields of each table. At a minimum you should understand catalogue, inventory and users.

> Start the file output/harness.md. Write down each table and its fields, and one short line explain the importance of each field to the shop.
>
> We will keep growing this harness file in later problems (models, tools, safety, specs).

### Follow-Up Prompt

None needed.

## Problem 3: Build the Campus Customs Website

### Prompt Typed

> Scaffold a React + Vite + TypeScript front end for Campus Customs. Put a nav bar at the top that links to the main pages:
>
> -Home
> -Products
> -About us
> -Log in
> -Create account
>
> Pull campus customs-style wording from yalebulldogblue.com for home and About us, but write these pages in your own voice (do not copy original site text).
>
> On the products page, show product images from the catalogue (use the image paths in the database) with basic product info (name, price and short description).
>
> Make each product open a single-item page (large item on one side, full product text on the other - description, price, sizes/stock when you have them). Clicking a card on products should take the shopper there.
>
> Add a chat interface in the bottom right of the site (a floating chat panel is fine). It does not need to talk to an agent yet. A stub that will call your backend later is enough for this problem.
>
> You will need a small API soon to read the database. It is fine to start a simple FastAPI app in backend/main.py just to serve products and images, then grow it into the agent backend in problem 5.

## Problem 4: Create Account and Login

### Prompt Typed

> Build a normal create-account / login flow.
>
> -Create account: first name, last name, email, password (confirm password is a nice touch)
> -Log in: email and password
>
> Cew accounts go into the users table. Make sure to store passwords securely so hacekrs (human or AI) cannot access them.
>
> The seed database already has a test user you can use whle building:
>
> -Email: test@campuscustoms.yale.edu
> -Password: password
> -Hash function: PBKDF2-HMAC-SHA256 , 120,000 iterations (stored as pbkdf2_sha25$salt$hash)
>
> How login checks a password:
>
> -You never un-hash the stored value. You re-has what the user typed and compare.
> -read the salt out of the stored string (the middle piece). Do not make a new one at login.
> -Has the typed password with that same salt, then compare to the stored hash. Use a constant-time compare.
> -Signup and login must use the same hash settings (same function, same salt handling, same iteration count). If they differ, event the right password will not match.
> -Surest check: login as the seeded test user and as a brand-new account you just created in your own app.
>
> Confirm you can log in as that user and that a brand new account you create also works.
>
> update output/harness.md with how auth works (what you store for a user and how passwords are protected)

### Follow-Up Prompt

None needed.

## Problem 5: PydanticAI Agent Backend

### Prompt Typed

> Build the shop chatbot as a PydanticAI agent behind FastAPI, plugged into your front-end chat widget. Put the API app in the backend/main.py - that is the file you run with Uvicorn. Kep the agent as these four files next to it (same idea as hw 3).
>
> -backend/prompts/prompt.md - system promt (grow this same file later)
> -backend/agent.py - agent entry / wiring
> -backend/tools.py - tools the agent can call
> -backend/models.py - pydantic / pydanticAI structured types
>
> in main.py , expose a chat route so a message from the website return a reply from the agent (and whatever else you need for products/auth). You will need your AI model API key for the agent.
>
> Put campus customs voice and safety basics into prompts/promt.md (you will expand tools and safety later). Start or update types in models.py for chat replies / product cards as needed.
>
> In output/harness.md , note how the front end talk to FastAPI and how the agent is loaded (prompt file + model).
>
> Make sure the backend runs from the backend/ folder like this:
>
> uvicorn main:app --reload --port 8000

### Follow-Up Prompt

None needed.

## Problem 6: Tools - Product Info and Stock

### Prompt Typed

> Give the agent tools that look up real information from campus_customs.db:
>
> -Product description
> -Price
> -How many are in stock (by size when the customer asks)
>
> The agent myst use the database - it should not invent prices or quantities. If a size is out of stock, say so clearly.
>
> Expand prompts/prompt.md so the agent knows to call these tools for price and stock questions. Add or updated return types in models.py
>
> In output/harness.md list each tool and explain which model fields you choose for lookup results and why.

### Follow-Up Prompt

None needed.

## Problem 7: Chat Search That Updates the Page

### Prompt Typed

> Now we will add a neat feature to the site. When a customer asks about a type of item- for example "what hoodies do you have?" the agent should search the catalogue and the website should dynamically show thos matching intems as product cards (image, name, price, short info).
>
> This is an API contract: the agent returns structued product matches and then the front end renders them on the website. It looks really cool.
>
> After the dynamic product cards are loaded by your new feature, make sure the same single-item page behavior you built in problem 3 still works: each product card - including the ones the chat just put on the page - should still open that detail view (large image + full info) when clicked.
>
> Update prompts/prompt.md and output/harness.md so it is clear how search results reach the page.

### Follow-Up Prompt

None needed.

## Problem 8: Customer Memory

### Prompt Typed

> When a shopper is logged in, save their chat history in the database in an appropriate table and reload it when they return. The agent should know who is chatting (name, email) - put that in agent deps (or an equivalent clear pattern) and/or tools the agent can call.
>
> Also pass enough page context that if someone is on a product page and asks "do you have this in pink?" the agent knows which item they mean. (Hint: you can put code into the agent context).
>
> Guests can still chat, but history only needs to persist for logged-in users.
>
> Document in output/harness.md : how user chat history is stored what customer fields the agent sees and how page context is passed.

### Follow-Up Prompt

None needed.

## Problem 9: Usability Improvements

### Prompt Typed

> now what the core shops works, improve it. Choose and implement:
>
> -2 front-end usability improvements
> -2 agent / backend usability improvements
>
> Front end improvements are things that make the site look better and make it easier to use.
>
> Agent / backend improvements are things that make the agent output better, more accurate or safer. These could be new agent tools or things that make the agent run faster or cheaper.
>
> Write output/usability.md before or as you build. For each of the improvements say:
>
> -What you added
> -Why it helps Campus Customs shopper or the business.
>
> Then make sure all improvements actually show up in the running app. Graders will read the write up and look for the features.

### Follow-Up Prompt

None needed.

## Problem 10: Style the Website

### Prompt Typed

> add creative design so that the site feels like a real Campus Customs storefront : fonts, color, hierarchy, motion, product presentation, chat feel.
>
> More points are awarded for imaginative and innovative design so make sure this is the case.
> Write output/design.md : what you changed and why it should help customers stick around and buy. Keep it concrete and short.

### Follow-Up Prompt

None needed.

## Problem 11: Site Testing (App Check)

### Prompt Typed

> Test the live site and document it in output/app_check.html (a page you can double-click open). Include clear screenshots and a short caption for:
>
> 1. chart checking the inventory level of an item (honest stock/price from the DB)
> 2. The dyanmic search-result cards appearing after a category question (e.g hoodies)
> 3. One of the usability features you added in P9.
>
> Make the HTML easy to grade: heading for each check, screenshot, one or two sentences on what the screenshot proves.
>
> Put the screenshot image files in output/app_check_images/ and link them from app_check.html with relative paths (for example app_check_images/inventory.png)

### Follow-Up Prompt

None needed.

## Problem 12: Audit Trail, Safety and Finish Harness

### Prompt Typed

> Keep an append-only output/audit_trail.json of the agent-loop activity (time, tool name , short args/result, stop reason). Do not wipe between runs.
>
> Also think of some safety rules to give the agent and put them in prompts/prompt.md
>
> Finish output/harness.md so it is clear how the system works.
>
> Model fields in models.py and why you chose them
>
> Tools and abilities
>
> Safety rules
>
> Specs (loop limits, result caps, models, how to run front + back)

### Follow-Up Prompt

None needed.

## Problem 13: Push to GitHub and Submit the URL

### Prompt Typed

> ok it looks great. Lets wrap it up so we can upload it.
>
> Problem 13: Push to GitHub and submit the URL.
>
> Put your code in a folder named HW4 and push it to a public GitHub repository. On canvas, I will submit the repo URL (give me the link so I can share it with graders so they can open it an clone). We wont be uploading a zip file this time.
>
> Do not put the real .env , campus_customs.db , or product images in the GitHub repo. Use .gitignore . Include env.example with placeholders only.
>
> Expected file layout: (screenshot of the hw4/ tree: AI_prompts.md, requirements.txt, .env.example, .gitignore, README.md, frontend/, backend/ with main.py, agent.py, models.py, tools.py, prompts/prompt.md, and output/ with harness.md, design.md, usability.md, app_check.html, app_check_images/, audit_trail.json)

### Follow-Up Prompt

None needed.
