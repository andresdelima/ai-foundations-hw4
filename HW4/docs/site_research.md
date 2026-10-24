# yalebulldogblue.com research notes

Researched 2026-10-15 for the HW4 frontend style and agent system prompt.

## Brand

- Store name: **Yale Bulldog Blue by Campus Customs**
- Announcement bar / header tagline: "Officially Licensed Merchandise" (footer shows a Yale official licensed badge)
- Page title: "Yale Bulldog Blue Gear | Official Yale Merchandise, Apparel & Accessories"
- Banner copy: "Casual comfort, classic Bulldog pride.", "Show your residential college pride!", "Big Spirit, Big Yale", "Hats Off", "Add a touch of Bulldog pride", "Sip in style, the Bulldog way", "Shop Comfy Layers"

## Visual style (from the theme CSS)

| Token | Value | Use |
|---|---|---|
| Primary button / brand navy | `#00366b` | Yale blue, primary buttons |
| Navy hover | `rgb(26, 74, 122)` (`#1a4a7a`) | button hover |
| Accent | `#f04f36` (hover `#f2614a`) | sale / callout accent |
| Text | `#1d1d1d` | body and headings |
| Background | `#ffffff`; light panels `#f4f4f4`, `#f6f6f6`, `#ededed` | page and sections |
| Borders | `rgba(0,0,0,0.1–0.25)` | cards, inputs |

- Fonts: **Open Sans** for headings and body (weight 400, bold 700); Nunito Sans appears as a secondary font. Heading XL is about 27–31.5px and body text is 16px.
- Layout: clean white Shopify theme with a navy announcement bar, a mega-menu nav, large banner images, and product grid cards showing image, name, and price.

## Navigation and catalogue structure

- Top nav: Clothing, Accessories, Home, Collections, Residential Colleges, Sports, Relatives, Graduate & Professional Schools, plus Search, Login, and Cart.
- Clothing: T-Shirts & Tops, Jackets & Sweatshirts, Activewear, Polos, Bottoms; separate Womens, Youth, and Infant & Toddler sections.
- Accessories: Hats, Neckwear, Jewelry, Pets, Bags, Souvenirs (Decals & Magnets, Keychains).
- Home: Decor, Pennants & Banners, Drinkware, Books, Office & Stationery.
- Collections: Alumni, Class of 2026, Class of 2030, Residential Colleges (14), Sports (21), Relatives (9), Graduate & Professional Schools (13).
- Example live prices (reference only; **the agent must use the local database**): Residential College 1/4 Zip $59.99, Crewneck $39.99, Yale Crest Hoodie $38.99, Big Yale Tri-Blend Tee $29.99, Brooks Brothers Big Yale Bomber $199.99.

## Store facts for the agent prompt

- Location: **57 Broadway, New Haven, CT 06511** ("Come Visit Us!")
- Contact: orderdept@campuscustoms.com, (475) 301-4205; there is also a contact form on the site.
- This build is an **online sales service, available 24/7**. Store hours aren't relevant, so the agent doesn't mention them.

### Shipping policy

- Items are made to order. Most orders are produced in **5–8 business days**, and longer in peak seasons.
- Transit time is separate from production time and depends on location and the shipping method chosen at checkout.
- Most domestic orders ship via **UPS**. International shipping is available, and the customer pays any customs or import fees.
- A tracking email is sent when the order ships.

### Refund / return policy

- **30 days from the shipping date** to send items back.
- Items must be unworn or unused, with original tags and labels.
- Final sale and custom items (for example, Custom Alumni products) cannot be returned or exchanged.
- If the item was wrong or there's a problem with the order, Campus Customs pays return shipping. If the customer changed their mind, the customer pays.
- Original shipping costs are not refunded. Refunds take 2–10 business days to appear, depending on the bank.
- To start a return, ship the item with an insured, trackable carrier and email the tracking number to orderdept@campuscustoms.com.

## Implications for the build

- Frontend: navy announcement bar, white header with the category nav, Open Sans, navy primary buttons, and product cards in a grid.
- Agent: friendly Bulldog-pride tone, but price and stock come **only** from the local database tools. If the database lacks an answer, the agent says so, and it never makes up discounts. It presents the shop as online and open 24/7.
