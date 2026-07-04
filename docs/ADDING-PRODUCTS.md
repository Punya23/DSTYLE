# Adding a Product to Dstyle

A guide for the store owner. Adding a product in the admin panel makes it appear
on the live website automatically — no code, no redeploy.

---

## How to add a product

1. **Sign in to the admin panel** — go to `/admin` and log in with your admin account.
2. Open **Products → New Product** (`/admin/products/new`).
3. Fill in the details:
   | Field | Notes |
   |---|---|
   | **Name** | e.g. "Midnight Emerald Anarkali". The web address (slug) is generated for you automatically. |
   | **Collection** *(required)* | Choose Bridal / Festive / Cocktail / Pret. This decides which category page the piece appears on. |
   | **Description** | A short paragraph shown on the product page. |
   | **Price** | The base price in ₹. |
   | **Material / Care** *(optional)* | Shown in the accordions on the product page. |
   | **Tags** *(optional)* | Comma-separated. Add `new` to show a **NEW** badge. |
   | **Sizes** | Add one row per size (e.g. S, M, L) with its **stock** and a **unique SKU code**. Add at least one. |
   | **Photos** | Upload **2–3 photos** (the first is the cover). They appear as a gallery on the product page. |
   | **Featured** | Tick this to also show the piece on the **homepage** ("The Edit"). |
   | **Visible** | Leave on. Turn off to hide the piece without deleting it. |
4. Click **Save**.

That's it. The piece now appears:
- **immediately** on its collection page (e.g. `/collections?collection=cocktail`) and its own product page,
- **immediately** in site **search**,
- on the **homepage** too, if you ticked *Featured*.

---

## Good to know

- **The design is automatic.** Every product uses the same card and page template, so a new piece always matches the rest of the site — you never design anything.
- **Minimum to look right:** a collection, a price, at least one size, and at least one photo. 2–3 photos gives the nicest gallery.
- **Low stock / Sold out badges** appear automatically based on the stock you enter.
- **Reusing a name is fine** — the web address is de-duplicated automatically (`…-2`, `…-3`).
- **Each size needs its own SKU code.** If two products share a SKU code you'll see a clear message asking you to change it.
- **To take a piece down**, open it and turn off *Visible* (or delete it) — it disappears from the store but past orders are kept.

---

## One-time setup for the developer — photo uploads (Cloudinary)

Photo uploads are hosted on **Cloudinary** (a free image CDN). Until its keys are
set, the admin panel will say *"Photo uploads aren't set up yet…"* when you try to
add an image. To enable it:

1. Create a free account at **cloudinary.com**.
2. From the Cloudinary dashboard, copy your **Cloud name**, **API Key**, and **API Secret**.
3. Set these environment variables — in `.env` for local work, and in
   **Vercel → Project → Settings → Environment Variables** for the live site:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```
4. Redeploy (or restart `npm run dev` locally). Uploads now work.

The site is already configured to display Cloudinary images — no other change is needed.

### Optional — AI Stylist concierge

The on-site AI stylist works out of the box using a built-in guided flow. To power
it with live Claude conversations, set one more variable (same two places):
```
ANTHROPIC_API_KEY=sk-ant-...
```
Leave it unset and the stylist quietly uses its built-in flow — nothing breaks.
