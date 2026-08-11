# 🧠 ELLORA PROJECT MEMORY
> Last Updated: August 11, 2026
> Read this file at the start of every conversation to understand project context.
> **Standing rule**: update this file after every meaningful change (not just at session end) —
> add what changed, why, and what's still not built, the same level of detail as existing entries.
> Don't leave it to go stale, and don't leave a superseded note uncorrected (see html/ note below —
> it was wrong for months before anyone fixed it).

---

## 📌 PROJECT OVERVIEW

**What**: Ellora Fashion & Lifestyle Store — a ThemeForest HTML template being converted into a fully dynamic e-commerce platform with an enterprise-grade admin panel (25 modules).

**Where**: `c:\Users\DELL-G3 15-3500\Downloads\themeforest-erJI4BDo-ellora-fashion-lifestyle-store-html-template\`

**Goal**: Build a production-grade admin panel at `/admin` with 25 modules covering products, orders, inventory, CRM, marketing, finance, AI, and more — starting with 8 essential modules first.

**Vision**: Shopify-level admin panel that can scale to handle lakhs of data points.

---

## ▶️ HOW TO RUN

**First time only** — install dependencies for root, `server/`, and `admin/`:
```bash
npm run install:all
```

**Run everything together** (storefront + Express API + admin panel):
```bash
npm run dev:full
```

Or run pieces individually, in separate terminals:
```bash
npm run dev         # storefront only  -> http://localhost:3000
npm run dev:server  # Express API only -> http://localhost:4000
npm run dev:admin   # admin panel only -> http://localhost:5173
```

**Admin panel login**: open `http://localhost:5173/login` and sign in with:
- Email: `admin@ellora.test`
- Password: `EllroaAdmin@2026`

**Requires** `server/.env` and `admin/.env` to have real Supabase keys (already filled in — see NEXT ACTION section for what's in them). If either dev server won't start, check nothing else is already using ports 4000/5173/3000.

**Storefront port can vary**: `browser-sync` defaults to port 3000, but if 3000 is occupied it auto-picks the next free port (3001, 3002, …). The Express server's CORS config (`server/index.js`) now uses a dynamic regex that allows **any localhost port**, so this is no longer a problem. If you see "Failed to fetch" on the storefront, the issue is the Express API server not running — not a port mismatch.

---

## 🛠️ CONFIRMED TECH STACK (Hybrid Approach)

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend API** | Express.js | Simple, flexible, full control |
| **Frontend** | React + Vite | Modern SPA for admin panel |
| **UI Components** | Shadcn/ui + Tailwind CSS | Premium component library |
| **Database** | Supabase (cloud PostgreSQL) | Scalable, free tier, built-in features |
| **Auth** | Supabase Auth | 2FA, SSO, session management, RBAC |
| **File Storage** | Supabase Storage | Cloud buckets for images/videos |
| **Realtime** | Supabase Realtime | Live order updates, stock alerts |
| **Image Storage** | Cloudinary | Image optimization & CDN |

### Previous Stack (ABANDONED)
~~Express + EJS + SQLite + bcrypt~~ → replaced with the hybrid approach above.

---

## ✅ WHAT HAS BEEN COMPLETED

### 1. Static Template Setup (Done ✅)
- Explored the full template structure (29 HTML pages, CSS, JS, fonts, images)
- Set up `browser-sync` dev server to run the template locally at `http://localhost:3000`
- Created `package.json` with dev scripts

### 2. Planning & Documentation (Done ✅)
- Created Backend Architecture Report (Word doc with 8 diagrams): `Ellora_Backend_Architecture_Report.docx`
- Analyzed reference documents: `Building a production Admin Panel.docx` + `Required key components in Admin panel.docx`
- Mapped out all 25 modules and prioritized into phases

### 3. Key Decisions (Confirmed ✅)
| Decision | Answer |
|----------|--------|
| Stack | Hybrid — Express API + React/Shadcn + Supabase |
| Database | Supabase (cloud PostgreSQL, free tier) |
| Auth | Supabase Auth |
| File storage | Supabase Storage + Cloudinary |
| First release scope | 8 essential modules |
| Full vision | 25 modules (build incrementally) |
| admin accounts | Single admin first, expand to 7 roles later |

### 4. Storefront Customer Portal & Authentication (Done ✅)
- **Auth Infrastructure**: Created [auth.js](file:///c:/Users/ADMIN/Downloads/Saint-Roman/html/js/auth.js) to wrap Supabase Client functionality (register, login, session management, and `apiFetch`).
- **Backend API**: Implemented [customer.js](file:///c:/Users/ADMIN/Downloads/Saint-Roman/server/routes/customer.js) to securely handle customer-specific data (profile details/updates, password changes, address book CRUD, order history, and wishlist).
- **Account HTML/JS Pages**: Integrated dynamic scripts (`account-*.js` files in [js/](file:///c:/Users/ADMIN/Downloads/Saint-Roman/html/js/)) and linked them with customer storefront HTML dashboards (`account-*.html` files in [html/](file:///c:/Users/ADMIN/Downloads/Saint-Roman/html/)) for real-time customer data presentation.

### 5. Storefront Compilation & Optimization (Done ✅)
- Created a custom build script [build-html.js](file:///c:/Users/ADMIN/Downloads/Saint-Roman/scripts/build-html.js) that copies static assets, minifies HTML, and extracts and minifies inline scripts to `dist/js/generated/` to optimize load times and compile the storefront for production.

### 6. Dynamic Storefront Assets (Done ✅)
- Connected storefront homepage hero, mega menu categories/tags, and product listings to fetch dynamically from live database entities rather than using static mock assets.

### 7. Barcode Generation, Scanning & Printing (Done ✅)
- **Code128 Generation Logic**: Implemented [barcode.js](file:///c:/Users/ADMIN/Downloads/Saint-Roman/server/lib/barcode.js) to programmatically generate unique Code128 barcodes prefixed with `ELR` followed by 10 digits.
- **Scanner & Renderer Components**: Created a barcode scanner page [BarcodeScannerPage.tsx](file:///c:/Users/ADMIN/Downloads/Saint-Roman/admin/src/pages/BarcodeScannerPage.tsx) and inline renderer [BarcodeSvg.tsx](file:///c:/Users/ADMIN/Downloads/Saint-Roman/admin/src/components/shared/BarcodeSvg.tsx) using the `JsBarcode` framework.
- **Label Printer Utility**: Developed [barcodePrint.ts](file:///c:/Users/ADMIN/Downloads/Saint-Roman/admin/src/lib/barcodePrint.ts) to construct and prompt printable barcode layouts within separate web context windows.
- **Backfill Script**: Provided a command line script [backfill-barcodes.js](file:///c:/Users/ADMIN/Downloads/Saint-Roman/server/scripts/backfill-barcodes.js) to retroactively populate missing barcodes for historical products.

### 8. Storefront Polish & Blog Wiring (Done ✅ — 2026-08-11, branch `claude/project-review-changes-yjarew`, not yet merged to `main`)
- **Account sidebar**: removed/commented out the "Downloads" link from the account sidebar `<ul>` across all 8 `account-*.html` pages (digital-downloads isn't a real feature here — physical fashion/lifestyle store).
- **Blog wired to real data end-to-end**:
  - `admin/src/pages/BlogPostsPage.tsx` — added featured-image upload (reuses the existing `ImageUpload`/Cloudinary flow), thumbnail column in the posts table.
  - `server/routes/public.js` — new `GET /api/public/blog-posts` (published-only, paginated) and `GET /api/public/blog-posts/:slug` (full post).
  - `server/routes/cms.js` — auto-dedupes `blog_posts.slug` on create/update (appends `-2`, `-3`, ...) instead of raw-erroring on `blog_posts_slug_key` when two posts share a title.
  - `html/blog.html` — hidden-template-card + fetch pattern, replaces the 6 hardcoded posts.
  - `html/blog-single.html` / new `html/js/blog-single-dynamic.js` — fetches by `?slug=`, renders title/date/image/content. Plain-text `content` (admin's Content field is a plain `<Textarea>`, no rich text) is reformatted into real `<p>`/`<ul><li>` blocks instead of one run-on paragraph, via the new shared `html/js/text-format.js` (`EllroaText.render`/`formatPlainText`/`looksLikeHtml`/`escapeHtml`) — extracted here so `product-single-dynamic.js` could reuse the exact same formatter instead of copy-pasting it (see below). List rule: any block of 2+ consecutive non-blank lines is a real `<ul><li>` list, marker optional (`1.`/`-`/`*`/none all work) — one rule covers both the blog's numbered lines and a marker-less feature list. **Real bug fixed**: the theme's `.text-anime-style-3` heading-reveal animation (`js/function.js`) splits+animates whatever text is in the `<h1>` on page load; calling `SplitText.revert()` *after* writing the real title silently reverted it back to the static placeholder — fixed the ordering (revert → set real text → re-split/animate).
  - Homepage "Follow us for daily style" section: consolidated into `html/js/homepage-dynamic-sections.js` (`loadBlogPosts()`) instead of its own duplicate inline `fetch`, matching every other section in that file (categories, new arrivals, offers, featured products, collections, promo banners).
- **Header nav reordered** across all 28 `html/*.html` pages: `Home, Shop, Pages, Contact Us, My Account` — Blog is no longer top-level, it's the first item inside the Pages dropdown.
- **`product-single.html` fixed** (was still 100% static demo content behind a live title/price/description fetch):
  - **Image**: `GET /api/public/products/:slug` was selecting the unused `product_images` gallery table instead of `products.image_url` (the column the admin's image upload actually writes to, added in `phase6_banner_image.sql`) — added it to the select. One image per product (no real gallery), applied to every slide in both the main slider and thumbnail strip.
  - **Currency**: was `'$' + toFixed(2)` here while `products.html` correctly used `₹`. New shared `html/js/currency.js` (`EllroaCurrency.format`) — wired into product-single, cart, checkout, `account-wishlist.js`, `account-orders.js`, `homepage-dynamic-sections.js`, `products.html` (was 5+ independent copies/hand-rolled `$`). Admin side was already correct ₹ everywhere; deduped its one real copy-paste (`formatCurrency` in `DashboardPage.tsx` + `FinancePage.tsx`) into `admin/src/lib/currency.ts`.
  - **Description/Additional Information/Reviews tabs** were the same static "Chic Aura Crop Top" copy on every product regardless of which one was open. Description now renders `products.description` (real column, honest "No description available yet." if empty) — **also went through the `EllroaText`/`text-format.js` plain-text formatter** above (first version wrapped the whole description in one `<p>`, which collapsed the admin's blank-line paragraphs and feature-list lines into one run-on block; fixed same day). Reviews honestly shows "No reviews yet" / "Reviews (0)" — **no reviews table exists anywhere in the schema**, so this was fake data with no backing feature; not rebuilt, just made honest.
  - **Related products**: were 4 hardcoded products on every page. Now reuses the existing `GET /products?category=<slug>` endpoint (same one `products.html`'s main grid uses) — same category as the current product, excludes itself, shows however many are actually available (0–4). No new endpoint needed.
  - Extracted the inline `<script>` into `html/js/product-single-dynamic.js`, matching the project's dynamic-page convention (`blog-single-dynamic.js`, `mega-menu-dynamic.js`, `homepage-dynamic-sections.js`).
- **New: Product Specifications** (`products.specifications jsonb`, `server/supabase/phase8_product_specifications.sql`, registered in `server/scripts/migrate.js`) — the real backing field for the storefront's "Additional Information" tab. JSONB chosen over fixed columns (material/fit/neckline only fit apparel; Ellora also sells watches/beauty/accessories with different attributes) or a separate table, matching existing JSONB precedent in this schema (`orders.shipping_address`, `audit_logs.details`, `settings.payment_gateways`) and, like `tags`, slotting into the product form's *existing* single save payload. Admin: new "Additional Information" add/remove label-value row section in `ProductsPage.tsx`'s edit form, right under Description. Storefront: `product-single-dynamic.js` renders the real pairs or "No additional information available" if none are set. **Not yet run against the live Supabase instance from this session** — needs `npm run migrate` (or the SQL Editor) before it'll actually work.
- **`account-order-details.html` wired to the real order** — it was loading `account-dashboard.js` (wrong script, a copy-paste leftover) and never read `?id=` at all, so every order showed the same static demo data ("Sophia Brown", a London address, one fake line item, and a "Tax: ₹105" line with no backing column on `orders`). New `html/js/account-order-details.js` uses the customer API that already existed for this (`server/routes/customer.js` `GET /api/customer/orders/:id`, already ownership-checked) — real line items, subtotal/shipping/discount/total via `EllroaCurrency`, payment method; dropped the fake Tax line (no tax column on `orders`). Both Billing and Shipping sections render the same real `orders.shipping_address` snapshot, since `checkout.html` only ever collects one address — no separate billing form exists to pull a different one from. **Accepted limitation** (same as cart.html/checkout.html): `order_items` has no product-image column, so line items use the same generic placeholder image those two pages already use for the same reason. `order-received.html` has the **same kind of unwired-static-content problem and is still not fixed** — only its `$`→`₹` symbol was corrected earlier, not the underlying wiring.
- **`cart.html` "You May be interested:"** was 3 hardcoded products (Chic Aura Crop Top / Velvet Charm Gown / Elegant Flow Kurti) with broken placeholder images, identical regardless of cart contents. Cart line items (`js/ellora-cart.js`) only store variantId/productSlug/productName/variantLabel/price/quantity — no category — so rather than add new "related to cart" server logic, it reuses the exact same featured-products-with-newest-fallback query `homepage-dynamic-sections.js`'s `loadFeaturedProducts` already uses (`GET /products?tag=featured`, falls back to `?sort=newest`), excluding whatever product slugs are already in the cart. Mutates the 3 existing cards in place (same pattern as `product-single-dynamic.js`'s related products), hides extra cards / the whole section if nothing's left to recommend.
- **🔴 Real checkout was broken — fixed, in two rounds**: `server/routes/public.js`'s checkout (`POST /api/public/orders`) turned out to have **three** places where it inserted into columns/RPCs that no migration had ever actually created — the whole handler had apparently never been tested against the real deployed schema (testing had only gone through the admin's own order-creation dialog, a different code path). Found by actually clicking "Place Order" and reading each schema-cache error in turn, fixing, retrying:
  1. `orders.payment_method` / `orders.payment_status` — `Could not find the 'payment_method' column of 'orders' in the schema cache`. Fixed in `server/supabase/phase9_order_payment_method.sql`.
  2. `customers.address` — same error pattern, next: `Could not find the 'address' column of 'customers' in the schema cache`. `customers` (`phase4_customers.sql`) only ever had id/name/email/phone/notes.
  3. `decrement_stock(uuid, int)` RPC — found while auditing the rest of the same handler for more of the same bug class, not from a user-visible error, since it's wrapped in `.catch(() => {})`. **Every real storefront checkout order has placed successfully without ever actually decrementing stock** — silently broken since real checkout was first built. Admin-created orders (`server/routes/orders.js`) decrement stock a different way (direct update, not this RPC), so that path was unaffected.
  #2 and #3 fixed together in `server/supabase/phase10_checkout_schema_gaps.sql`. Both new migrations registered in `server/scripts/migrate.js`. **If checkout throws another `Could not find the '...' column` error after running phase10, there may be a fourth gap — audit the rest of the `POST /orders` handler in `server/routes/public.js` line by line against the real table definitions rather than assuming these three were the only ones.**
  - **Also fixed while debugging this live**: `npm run migrate` didn't actually exist — `server/package.json` had no `"migrate"` script, only `dev`/`start`; `server/scripts/migrate.js` had to be run directly (`node scripts/migrate.js`). Added the script alias so `npm run migrate` (referenced throughout this file, including right above) actually works.

---

## 🔨 BUILD PLAN — 8 ESSENTIAL MODULES (First Release)

### Phase 1: Foundation
- [x] Set up Supabase project — **DONE.** Project `gxbebydzhrmjvnkyryub` (region `ap-south-1`) created, `server/.env` + `admin/.env` filled with real keys, schema deployed (see "Verified working end-to-end" note below).
- [x] Create Express API server with Supabase client (`server/index.js`, `config/supabase.js`, `middleware/auth.js`, routes for auth + settings)
- [x] Set up React + Vite + Tailwind + Shadcn/ui for admin frontend (`admin/`)
- [x] **Module 22: Auth & User Management (RBAC now real)** — Login page, session via Supabase Auth, `AuthContext`, `ProtectedRoute`. **RBAC was silently broken until 2026-07-21**: `requireRole()` checked `user_metadata.role`, which nothing ever set — every check defaulted to `'admin'` and passed regardless of real role. Fixed to read the real `profiles.role`. New `TeamPage.tsx`/`server/routes/team.js` (admin-only): list team members, create new ones (no email-invite system — generates and displays a one-time temp password), change roles. Applied `requireRole('admin')` to `PUT /api/settings` and `GET /api/audit` as proof points (most other routes still have no role restriction). **Tested live, the real proof**: created a `manager`-role user, logged in as them, confirmed `GET /api/audit` → 403 and `PUT /api/settings` → 403 while `GET /api/settings` stayed 200. No 2FA/SSO (no external provider).
- [x] **Module 23: Settings (extended)** — site title, currency, tax; added announcement bar text, footer copyright text, and **Maintenance Mode** (`server/supabase/phase5_maintenance_mode.sql`). Maintenance Mode wired into `products.html` (whole-page replacement with a "We will be back soon" message when enabled). **Tested live, on and off**: enabled it, confirmed the storefront blocked; disabled it, confirmed normal operation returned. Not built: Payment Gateway/Email/SMS/WhatsApp-API-key/CDN/Image-Compression/Backup config — storing settings for providers that don't exist would be inert fields.

### Phase 2: Core Commerce
- [x] **Module 4: Category Management** — `categories` table (unlimited depth via `parent_id`), CRUD API (`server/routes/categories.js`), admin page with list + create dialog (`admin/src/pages/CategoriesPage.tsx`). **Tested live**: created a real "Men's Fashion" category. Sub-category UI (nested tree), collections, and an edit button are not yet built — first pass is flat list, create/delete only.
- [x] **Module 2: Product Management** — `products` table (core fields: SKU, barcode, brand, HSN, GST%, category, price, status, SEO title/description — not the full 27+ field spec yet), CRUD API (`server/routes/products.js`), admin page (`ProductsPage.tsx`) with **create, edit, and delete** all wired and tested live (created "Classic Denim Jacket," edited its price 2499 → 1999, later added Brand/Barcode/HSN/GST fields to the form and verified they persist). Delete now has a confirmation prompt. Image upload (Media Matrix / Cloudinary) and the AI description optimizer are still not built — deliberately deferred until there's Supabase Storage/Cloudinary and an LLM integration to back them.
- [x] **Module 3: Variant Management** — `product_variants` table (size/color/pack/price/stock), nested create/update in the products API and inline variant rows in the product form (variants can be added but not individually removed from the form). Per-variant images not yet wired.

**Verified working end-to-end (2026-07-21):** the Supabase connection was live but the schema had never actually been run — all tables came back "not found." Fixed by running `server/supabase/schema.sql` + `phase2_catalog.sql` via a new script, `server/scripts/migrate.js` (uses the `pg` package, connects via `DATABASE_URL` in `server/.env` — the **session pooler** string, `aws-1-ap-south-1.pooler.supabase.com:5432`, not the direct `db.<ref>.supabase.co` host, which only resolves over IPv6 and isn't reachable from this network). Test login: `admin@ellora.test` / `EllroaAdmin@2026`. Both servers run via `npm run dev:server` (port 4000) and `npm run dev:admin` (port 5173).

### Phase 3: Operations
- [x] **Module 5: Inventory Management (first pass)** — added `reserved_quantity` to `product_variants` + a new `inventory_adjustments` audit-log table (`server/supabase/phase3_inventory.sql`), API (`server/routes/inventory.js`: `GET /`, `POST /adjust`, `GET /:variantId/history`), admin page (`admin/src/pages/InventoryPage.tsx`) listing every variant with on-hand/reserved/available stock and an "Adjust" dialog (quantity delta + reason: purchase order / manual adjustment / cycle count / return / damage + optional note). **Tested live**: added a size/color variant to the test product, adjusted its stock +25 through the UI, confirmed the number updated, persisted after a fresh page reload, and the audit row landed in `inventory_adjustments` with the correct `created_by`. Not yet built: multi-warehouse breakdown (single implicit warehouse for now), Purchase Order entities as their own trackable object (POs are currently just an adjustment reason, not a full PO workflow), stock transfer between warehouses, cycle-count sessions, low-stock alerts/thresholds, and an inventory history view in the UI (the `GET /:variantId/history` endpoint exists but isn't wired to any page yet).
- [x] **Module 6: Order Management (first pass)** — new `orders`/`order_items` tables with the full 10-status `order_status` enum from the spec (`server/supabase/phase3_orders.sql`), API (`server/routes/orders.js`: `GET/POST /`, `GET /:id`, `PUT /:id` for status/tracking), admin page (`OrdersPage.tsx`) — create-order dialog picks line items from the Inventory variant list and computes totals, inline per-row status-change dropdown. Creating an order decrements the linked variant's stock. **Tested live end-to-end**: created an order for "Rahul Verma" (1× Classic Denim Jacket M/Blue + ₹99 shipping), confirmed total = ₹2098, confirmed the variant's stock dropped 75→74 in Inventory, changed status pending→processing via the dropdown and saw it persist. Not yet built: Module 7 Customer Management (customer name/email/phone live directly on the order row for now, no `customers` table or order history per customer), invoice generation, real shipment/tracking integration (just a plain text `tracking_number`/`courier` field), partial shipment/cancellation, fraud score, gift wrap, order notes UI (the column exists, no UI yet). Also: no public storefront checkout exists, so orders are admin-entered only; the stock-decrement-per-line-item loop on order creation isn't wrapped in a DB transaction, so a mid-loop failure could leave stock partially decremented — fine for single-admin testing, worth revisiting before multi-user use.
- [x] **Module 17: CMS** — Blog Posts + FAQs (`server/supabase/phase3_cms.sql`, `server/routes/cms.js`, `BlogPostsPage.tsx`/`FaqsPage.tsx`), plus later Announcement Bar + Banners + Footer (`server/supabase/phase5_cms_content.sql`, new `banners` table, `BannersPage.tsx`, `settings.announcement_text`/`footer_copyright_text`). **Tested live**: FAQ/blog post creation with auto-slug; announcement bar and footer copyright both confirmed showing live admin-set text on `products.html`; banner CRUD confirmed round-tripping through the public API. **(Update 2026-07-27: banners now have a display surface** — a hero strip on `products.html` renders active banners with images; see the Image uploads / Media Library note near the end.) Still not built: Homepage Builder, Landing Pages, Popup Management, Mega Menu — all need either a real page-builder UI or a display mechanism this static template lacks.

---

## 📋 FULL 25-MODULE VISION (Future Phases)

### Phase 4: Customer & Finance (After first release)
- [x] **Module 7: Customer Management (first pass)** — new `customers` table + `orders.customer_id` FK (`server/supabase/phase4_customers.sql`), API `server/routes/customers.js` (list endpoint computes `order_count`/`lifetime_value` by joining orders), `CustomersPage.tsx`, and an "Existing customer" picker added to the Orders "New order" dialog (auto-fills name/email/phone, links `customer_id`). **Tested live end-to-end**: created customer "Priya Sharma," placed an order for her via the picker, confirmed her record updated to `order_count: 1` / `lifetime_value: 1999`. Not built: wishlist, wallet, reward points, buying-frequency/preferred-category analytics, support tickets — all deferred until there's more real purchase history and a public storefront to generate it. No Supabase Auth link (still admin-entered only, no public signup).
- [x] **Module 10: Coupon Engine (first pass)** — unblocked once real checkout existed. `coupons` table (percentage/flat/free_shipping) + `orders.coupon_code`/`discount_amount` (`server/supabase/phase5_coupons.sql`). Shared `server/lib/coupons.js` validation used by both a live-preview endpoint and order creation (always re-validated server-side, never trusts a client-supplied discount). `CouponsPage.tsx`, real coupon box on `checkout.html`. **Tested live**: applied SAVE10 (10%) to a ₹1999 item, confirmed -₹199.90 discount and ₹1799.10 total, confirmed `usage_count` incremented after the order placed. Not built: BOGO, Buy X Get Y, referral/employee coupon types.
- [x] **Module 14: Returns & Refunds (first pass)** — `returns` table with a `return_status` enum, tied to a specific `order_item` (`server/supabase/phase4_returns.sql`), API `server/routes/returns.js` (create computes refund amount; marking "refunded" **automatically restocks the variant** and logs it in `inventory_adjustments`), `ReturnsPage.tsx` (order → item picker, inline status dropdown). **Tested live end-to-end**: created a return, marked it refunded, confirmed Inventory stock incremented automatically. Not built: approval workflow gating (any status can be set at any time), exchange-to-different-item flow, return shipping/pickup logistics.
- [x] **Module 15: Finance Dashboard (first pass)** — no new tables, pure aggregation off `orders`+`returns` (`GET /api/finance/summary` in `server/routes/finance.js`), `FinancePage.tsx` with stat cards (revenue, refunds, net revenue, avg order value, pending returns) + orders-by-status breakdown. **Tested live and hand-verified every number** against known order/return data — all correct. Deliberately did not build Invoices, Credit/Debit Notes, Payouts, Vendor Payments, or GST reporting — none have a real data source yet (no vendors, no payout runs, tax isn't captured per-order-line at sale time), so building UI for them now would be speculative.

### Phase 5: Growth & Intelligence
- [x] **Module 1: Executive Dashboard (first pass)** — no new tables, pure aggregation over `orders`/`customers`/`products`/`product_variants`/`returns` (`GET /api/dashboard/summary` in `server/routes/dashboard.js`). Replaced the literal `DashboardPage.tsx` placeholder (four cards showing "—") with real stat cards (orders, revenue, customers, active products, pending returns) + a recent-orders table + a low-stock table (≤10 units) + an orders-by-status badge row + a live notification bell (Module 21, see below). **Tested live, every number hand-verified**: Orders 5, Revenue ₹8,794 (checked by hand against the 5 known order totals), Customers 4, Active Products 3 — all correct. No drag-and-drop widgets (Module 25) — fixed layout, not the customizable grid from the full spec; not built at all.
- [x] **Module 8: CRM (first pass)** — `customer_segments` table (rule-based: `min_orders` + `min_spend`) (`server/supabase/phase6_crm.sql`, `server/routes/crm.js`, `CrmPage.tsx`). Segment membership is **evaluated live** against real customers each request — `order_count`/`lifetime_value` computed from actual orders (same join the Customers module uses), never stored stale. **Tested live**: created a segment, confirmed it evaluated across the 6 real customers with correct member counts, expandable member list in the UI. Not built: email/SMS campaign sending (no ESP/SMS provider), ML/behavioural segmentation.
- [x] **Module 9: Marketing Dashboard (first pass)** — `marketing_campaigns` table (name/channel/spend/coupon_code) (`server/supabase/phase6_marketing.sql`, `server/routes/marketing.js`, `MarketingPage.tsx`). Reuses the **coupon-attribution** approach from the Influencer module: attributed revenue/orders/ROAS are computed server-side from real orders that used the campaign's coupon — not typed-in performance numbers. Summary stat cards (total spend, attributed revenue, overall ROAS). **Tested live** end-to-end (create → attribution read-back → delete). Not built: live Google/Meta/TikTok ad-account API sync (needs real ad accounts + OAuth).
- [x] **Module 16: Reports & Analytics (first pass)** — added `products.cost_price` (admin-only) to enable a real Profit Report. Single generic `GET /api/reports/:type` (`server/routes/reports.js`) supporting Sales/Customer/Inventory/Product Performance/Returns/Profit, `ReportsPage.tsx` renders any of them generically + client-side CSV export. **Tested live** across multiple report types, all correct. Not built: Marketing/Warehouse/Employee reports (no data source), true Excel/PDF generation or Schedule Reports (no doc-gen lib or job scheduler — CSV substitutes). **Found and fixed a real bug while testing this**: `PUT /api/products/:id` was deleting and recreating all variants (fresh UUIDs) on every edit, which via `ON DELETE SET NULL` silently orphaned `order_items.variant_id` on every historical order each time a product was edited. Fixed to upsert variants by `(size, color)` instead — verified a variant's `id` now survives an edit.

### Phase 6: Advanced
- [x] **Module 11: Influencer Dashboard (first pass)** — ties to the Coupon Engine rather than a separate discount system: `influencers.coupon_code` FKs `coupons.code`. Sales/commission computed server-side from real `orders.total` where the coupon was used — not manually entered. `server/routes/influencers.js`, `InfluencersPage.tsx`. **Tested live**: influencer tied to SAVE10 correctly showed ₹1799.1 sales / ₹179.91 commission (10%), matching the one real order that used it. No follower/engagement/content tracking (no social API).
- [x] **Module 12: Warehouse Dashboard (first pass)** — no new backend at all; `WarehousePage.tsx` is a 3-column Kanban (Picking/QC/Ready to ship) filtered from the existing Orders API, "advance stage" buttons call the existing order-status endpoint. **Tested live**: an order moved through stages, board updated in real time.
- [x] **Module 13: Shipping (first pass)** — `shipping_rates` config table (zone / min-order / rate / free-above) (`server/supabase/phase6_shipping.sql`, `server/routes/shipping.js`, `ShippingPage.tsx`). Plus a **Shipments view derived from real orders** (`GET /shipping/shipments` filters orders in fulfilment statuses); courier + tracking number are edited inline and written straight back onto the order row. **Tested live**: rate-rule CRUD + shipments list returned a real order. Not built: courier API rate-shopping / label generation / webhook tracking (needs a Shiprocket/Delhivery-style integration) — courier/tracking stay plain fields.
- [ ] Module 18: Mobile App Management — deferred, no mobile app exists to manage
- [x] **Module 19: AI Control Center (first pass — Google Gemini)** — `server/lib/gemini.js` (thin wrapper over Gemini's `generateContent` REST API; key + model from `GEMINI_API_KEY`/`GEMINI_MODEL` in `server/.env`, default model `gemini-2.0-flash`, key never leaves the server), `server/routes/ai.js` (`GET /status`, `POST /generate-description`, `POST /generate-seo`), `AiPage.tsx` (product-detail form → generated description + SEO title/meta, each copyable; shows a "add your key" card when unconfigured). **Tested live without a key**: `/ai/status` → `{configured:false, model:'gemini-2.0-flash'}`, and generation returns a clean 502 "GEMINI_API_KEY is not set" instead of crashing. Full generation works as soon as a real key is added to `server/.env` (the user chose Gemini over Anthropic/OpenAI/Ollama). Not built: bulk generation, image generation, chat assistant, per-call cost tracking.
- [x] **Module 20: Customer Support (first pass)** — `support_tickets` table, admin CRUD (`SupportPage.tsx`), and a public ticket-creation endpoint wired to `html/contact.html`'s previously-dead contact form. **Tested live end-to-end**: submitted the real contact form, ticket appeared in admin, changed its status, confirmed it persisted. No live chat/WhatsApp/calls (no provider).
- [x] **Module 21: Notifications (first pass — "Internal Alerts" only)** — no persisted table; `GET /api/notifications` derives a live feed each request from recent orders/low-stock/pending-returns/open-tickets (same approach as Dashboard/Reports). Bell icon + count badge added to the admin `Header.tsx`. **Tested live**: badge showed 5, panel listed the 5 real recent orders. No email/SMS/WhatsApp/Push/Slack (no provider).
- [x] **Module 24: Audit Logs (first pass)** — new `audit_logs` table + `server/lib/audit.js` `logAudit()` helper. Instrumented the highest-value mutation points only (not a blanket "log every API call"): admin logins, product price changes, product deletions, order status changes, refunds. **Found along the way**: `POST /api/auth/login` is dead code (frontend signs in via the Supabase SDK directly) — added `POST /api/auth/log-login`, called by `AuthContext.tsx` right after a successful client-side sign-in, as the only way to observe logins server-side. **Tested live**: signed out/in → login logged; changed a price → price_change logged with exact before/after; advanced an order → status_change logged correctly.
- [x] **Module 25: Drag-and-Drop Dashboard Widgets** — `DashboardPage.tsx` refactored into a widget registry (stats / recent orders / low stock / orders-by-status). A "Customize" toggle reveals drag handles (native HTML5 DnD, no new dependency) + per-widget show/hide; order + hidden set persist to `localStorage` (`ellora.dashboard.order` / `ellora.dashboard.hidden`), with a "Reset layout" button. All numbers still come from the live `/dashboard/summary`.

---

## 📁 TARGET FILE STRUCTURE (Revised)

```
project-root/
├── html/                          # Storefront development code (SRC)
│   ├── account-address.html
│   ├── account-addresses.html
│   ├── account-dashboard.html
│   ├── account-details.html
│   ├── account-download.html
│   ├── account-order-details.html
│   ├── account-order.html
│   ├── account-wishlist.html
│   ├── forgot-password.html
│   ├── reset-password.html
│   ├── index.html
│   ├── products.html
│   └── js/
│       ├── auth.js                # Supabase Auth Client wrapper
│       ├── account-dashboard.js
│       ├── account-details.js
│       ├── account-wishlist.js
│       ├── account-addresses.js
│       ├── account-orders.js
│       ├── forgot-password.js
│       ├── reset-password.js
│       └── mega-menu-dynamic.js
├── dist/                          # Compiled storefront output (minified HTML, extracted minified JS)
├── scripts/
│   └── build-html.js              # Production build compiler for storefront
├── server/                        # Express API backend
│   ├── index.js                   # Express entry point
│   ├── config/
│   │   └── supabase.js            # Supabase client init
│   ├── middleware/
│   │   └── auth.js                # RBAC security middleware
│   ├── lib/
│   │   ├── audit.js               # Audit logger helper
│   │   ├── barcode.js             # Code128 generation logic
│   │   ├── cloudinary.js          # Cloudinary media connector
│   │   ├── coupons.js             # Discount validations
│   │   └── gemini.js              # Google Gemini wrapper
│   ├── routes/
│   │   ├── ai.js                  # Gemini details/SEO suggestions
│   │   ├── audit.js               # Admin audit log routes
│   │   ├── auth.js                # Core auth logic
│   │   ├── banners.js             # Layout banner adjustments
│   │   ├── categories.js          # Catalog classification APIs
│   │   ├── cms.js                 # Blog, FAQ, Page resources
│   │   ├── coupons.js             # Promotion codes management
│   │   ├── crm.js                 # Customer segmentation rules
│   │   ├── customer.js            # Storefront secure customer dashboard APIs
│   │   ├── customers.js           # Admin customer records list
│   │   ├── dashboard.js           # Aggregated statistics
│   │   ├── finance.js             # Transaction totals & analytics
│   │   ├── influencers.js         # Affiliate coupons and payments
│   │   ├── inventory.js           # Stocks adjustments & history
│   │   ├── marketing.js           # Ad campaign attribution rates
│   │   ├── media.js               # Cloudinary library asset index
│   │   ├── notifications.js       # Auto-derived operational triggers
│   │   ├── orders.js              # Transaction lifecycle management
│   │   ├── products.js            # Base catalog CRUD & variants upsert
│   │   ├── public.js              # Public site content (products/banners)
│   │   ├── reports.js             # Performance report exports
│   │   ├── returns.js             # Returns & auto-restocking logic
│   │   ├── settings.js            # Global configuration details
│   │   ├── shipping.js            # Rate zones definition
│   │   ├── support.js             # User ticketing logs
│   │   ├── tags.js                # Meta tag queries
│   │   ├── team.js                # Role configurations
│   │   └── upload.js              # Media base64 upload pipeline
│   ├── scripts/
│   │   ├── backfill-barcodes.js   # Barcode population script
│   │   └── migrate.js             # PostgreSQL migrate executor
│   ├── supabase/                  # Database migration schemas
│   └── .env
├── admin/                         # React admin frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # Shadcn primitives
│   │   │   └── shared/
│   │   │       ├── BarcodeSvg.tsx # Inline SVG barcode renderer
│   │   │       ├── Sidebar.tsx
│   │   │       ├── Header.tsx
│   │   │       └── ImageUpload.tsx
│   │   ├── pages/                 # UI pages for all 25 modules
│   │   │   ├── AiPage.tsx
│   │   │   ├── AuditLogsPage.tsx
│   │   │   ├── BannersPage.tsx
│   │   │   ├── BarcodeScannerPage.tsx
│   │   │   ├── BlogPostsPage.tsx
│   │   │   ├── CategoriesPage.tsx
│   │   │   ├── CouponsPage.tsx
│   │   │   ├── CrmPage.tsx
│   │   │   ├── CustomersPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── FaqsPage.tsx
│   │   │   ├── FinancePage.tsx
│   │   │   ├── InfluencersPage.tsx
│   │   │   ├── InventoryPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── MarketingPage.tsx
│   │   │   ├── MediaPage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   ├── ReturnsPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── ShippingPage.tsx
│   │   │   ├── SupportPage.tsx
│   │   │   ├── TeamPage.tsx
│   │   │   └── WarehousePage.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── lib/
│   │   │   ├── barcodePrint.ts    # Print layout configuration for labels
│   │   │   └── supabaseClient.ts
│   │   └── App.tsx
│   └── package.json
└── package.json
```

---

## 🗄️ DATABASE (Supabase PostgreSQL)

Key tables currently deployed:
1. `profiles` — Admin users with roles (admin, manager, warehouse, marketing, finance, support, vendor).
2. `settings` — Global configuration, announcement parameters, and maintenance mode status.
3. `categories` — Parent-child hierarchical database tags.
4. `products` — Base catalog descriptions including SKU, barcode, cost price, base price, brand, HSN, GST%, `image_url` (the real single product image, added `phase6_banner_image.sql`), and `specifications` jsonb (added `phase8_product_specifications.sql` — label/value pairs for the storefront's Additional Information tab, e.g. `{"Material": "Cotton", "Fit": "Regular Fit"}`).
5. `product_variants` — Product attribute sets containing specific size, color, stock, and pricing increments.
6. `product_images` — **Legacy/unused.** Nothing in the codebase (admin or server) ever inserts into this table — the admin's image upload writes straight to `products.image_url` instead. `GET /api/public/products/:slug` still selects it (harmless, always empty) but don't build anything new against it; use `products.image_url`.
7. `inventory_adjustments` — Variant adjustments log storing reasons (damages, count, purchase, returns).
8. `orders` — Store customer transactions mapped through statuses (pending, processing, shipping, completed, refunded).
9. `order_items` — Line items referencing individual variants.
10. `cms_pages` / `blog_posts` / `faqs` — Customer support, general static and dynamic reading contents.
11. `banners` — Store banner layout descriptors.
12. `media_assets` — Uploaded storage files cache mapped to Cloudinary paths.
13. `customers` — Storefront account profiles (first_name, last_name, display_name, email, phone).
14. `customer_addresses` — Address books with type classification (billing/shipping).
15. `customer_wishlist` — Saved custom catalogs per shopper.
16. `customer_segments` — Analytical filter blocks grouping matching customers.
17. `marketing_campaigns` — Cost budgets and conversion data points linked to code inputs.
18. `shipping_rates` — Logistics rules grouped by target zone and cart requirements.
19. `support_tickets` — Inquiries coming from web contact forms.
20. `audit_logs` — Traceable system events (admin logins, price alterations, deletions, refunds).

---

## 🔐 AUTH & ROLES

| Role | Access |
|------|--------|
| admin | Everything |
| manager | Products, orders, customers, reports |
| warehouse | Inventory, warehouse, shipping |
| marketing | CRM, coupons, marketing, influencers |
| finance | Finance, reports, invoices |
| support | Customer support, returns |
| vendor | Own products, own orders |

**First release**: Single admin role only. Multi-role RBAC added later.

---

## 📝 IMPORTANT NOTES

1. ~~The `html/` folder is the ORIGINAL template — never modify it, keep as reference~~ **Stale — this stopped being true a while ago and nobody had corrected it.** `html/` is the actively-developed storefront source (served by `npm run dev` / browser-sync at `:3000`); most pages are wired to live data via inline `<script>` blocks and/or dedicated `html/js/*-dynamic.js` files (`mega-menu-dynamic.js`, `homepage-dynamic-sections.js`, `blog-single-dynamic.js`, `product-single-dynamic.js`, `products-hero-dynamic.js`, `currency.js`, `ellora-cart.js`, `auth.js`, `account-*.js`, ...). `dist/` is the separate compiled/minified build output (via `scripts/build-html.js`) — that's the one to leave alone and regenerate, not hand-edit.
2. Supabase project is created and connected (see NEXT ACTION) — no need to create another
3. User needs a **Cloudinary account** at https://cloudinary.com (free tier) — still not set up, needed once product image upload is built
4. Reference docs are in project root: `Building a production Admin Panel.docx` (the real phased build spec) and `Required key components in Admin panel.docx` (flat 25-module feature checklist)
5. **Ignore** `Ellora_Backend_Architecture_Report.docx`/`.pdf` (there's a `.pdf` copy directly in `C:\Users\DELL-G3 15-3500\Downloads\`, outside this project folder) — it documents a completely different, abandoned Express+EJS+SQLite architecture from before the Supabase/React pivot. Confirmed stale 2026-07-21.
6. Admin panel should feel premium — dark sidebar, clean forms, Shadcn/ui components
7. **Git**: project now has its own repo, scoped to this folder — pushed to `https://github.com/Puneethgowda4653/Saint-Roman`. Still avoid `git add -A`/`git add .` from the home directory (`C:\Users\DELL-G3 15-3500`) — that separate, unrelated repo still exists at home and is a different concern.
8. **Active branch (as of 2026-08-11)**: recent work (section 8 above — Downloads sidebar, blog wiring, nav reorder, product-single.html fixes, product specifications) is on `claude/project-review-changes-yjarew`, **not yet merged to `main`**. Check which branch you're actually running before assuming a fix described here is live locally — `git checkout claude/project-review-changes-yjarew && git pull` to get it.

---

## 🚀 NEXT ACTION

**As of August 11, 2026**: Blog is now fully wired (admin → API → storefront, homepage + blog.html + blog-single.html), the storefront header nav was reordered, and `product-single.html` went from mostly-static-demo-content to fully live (image, ₹ currency, real description, real Additional Information via the new `specifications` field, real category-based related products) — see section 8 above for the full breakdown. All of this is on branch `claude/project-review-changes-yjarew`, unmerged.

### Current Status
- **🔴 Not yet run, actively blocking checkout**: `server/supabase/phase9_order_payment_method.sql` AND `phase10_checkout_schema_gaps.sql` haven't been applied to the live Supabase instance from this session (no DB credentials available there) — **the public storefront checkout is broken until both run**. Run `npm run migrate` (runs everything, safe — every file uses `if not exists`/`or replace`) or paste both into the Supabase SQL Editor in order — before anything else, this is a real outage, not a missing nice-to-have. See the "Real checkout was broken" entry in section 8 for what each one fixes and why there might be a fourth gap still waiting.
- **Not yet run**: `server/supabase/phase8_product_specifications.sql` hasn't been applied to the live Supabase instance from this session either (no DB credentials available there) — run `npm run migrate` or paste it into the Supabase SQL Editor before the new Additional Information admin section will actually persist anything.
- **Storefront Compilation**: The storefront can be compiled into a production-ready `dist` folder using the custom `node scripts/build-html.js` command.

### Next Priorities
1. **Merge `claude/project-review-changes-yjarew` into `main`** once verified locally (or keep developing on it — just don't lose track of which branch has the latest work).
2. **Run the phase8 migration**, then in admin add 2-3 specification rows to a couple of real products and confirm they render on that product's storefront Additional Information tab.
3. **Cloudinary Integration**: Set up Cloudinary keys (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `server/.env`) to enable product and banner image uploads in the media library.
4. **Razorpay Secure Checkout**: Implement and test the Razorpay payment gateway to replace the current Cash-on-Delivery (COD) checkout method.
5. **Reviews feature**: product-single.html's Reviews tab is now honest ("No reviews yet") instead of fake, but there's still no real reviews table/submission backend — build one if customer reviews are actually wanted.
6. **`order-received.html`** is still static/unwired to real order data (only its `$`→`₹` symbol was fixed on 2026-08-11, not the underlying wiring) — `account-order-details.html` had the same problem and was fixed the same day (see section 8).

Local dev: `npm run install:all` (root) once per machine, then `npm run dev:full` (root) runs storefront + Express API + admin Vite dev server together. Test login: `admin@ellora.test` / `EllroaAdmin@2026`.