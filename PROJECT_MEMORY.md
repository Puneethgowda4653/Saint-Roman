# 🧠 ELLORA PROJECT MEMORY
> Last Updated: July 21, 2026
> Read this file at the start of every conversation to understand project context.

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
| Admin accounts | Single admin first, expand to 7 roles later |

---

## 🔨 BUILD PLAN — 8 ESSENTIAL MODULES (First Release)

### Phase 1: Foundation
- [x] Set up Supabase project — **DONE.** Project `gxbebydzhrmjvnkyryub` (region `ap-south-1`) created, `server/.env` + `admin/.env` filled with real keys, schema deployed (see "Verified working end-to-end" note below).
- [x] Create Express API server with Supabase client (`server/index.js`, `config/supabase.js`, `middleware/auth.js`, routes for auth + settings)
- [x] Set up React + Vite + Tailwind + Shadcn/ui for admin frontend (`admin/`)
- [x] **Module 22: Auth & User Management** — Login page, session via Supabase Auth, `AuthContext`, `ProtectedRoute`, RBAC skeleton in JWT middleware. **Tested live**: logged in as `admin@ellora.test` and landed on the dashboard.
- [x] **Module 23: Settings** — Settings page (site title, currency, tax) wired to `/api/settings`; SQL schema written and deployed. Not yet click-tested in the browser (Categories/Products were).

### Phase 2: Core Commerce
- [x] **Module 4: Category Management** — `categories` table (unlimited depth via `parent_id`), CRUD API (`server/routes/categories.js`), admin page with list + create dialog (`admin/src/pages/CategoriesPage.tsx`). **Tested live**: created a real "Men's Fashion" category. Sub-category UI (nested tree), collections, and an edit button are not yet built — first pass is flat list, create/delete only.
- [x] **Module 2: Product Management** — `products` table (core fields: SKU, barcode, brand, HSN, GST%, category, price, status, SEO title/description — not the full 27+ field spec yet), CRUD API (`server/routes/products.js`), admin page (`ProductsPage.tsx`) with **create, edit, and delete** all wired and tested live (created "Classic Denim Jacket," edited its price 2499 → 1999, later added Brand/Barcode/HSN/GST fields to the form and verified they persist). Delete now has a confirmation prompt. Image upload (Media Matrix / Cloudinary) and the AI description optimizer are still not built — deliberately deferred until there's Supabase Storage/Cloudinary and an LLM integration to back them.
- [x] **Module 3: Variant Management** — `product_variants` table (size/color/pack/price/stock), nested create/update in the products API and inline variant rows in the product form (variants can be added but not individually removed from the form). Per-variant images not yet wired.

**Verified working end-to-end (2026-07-21):** the Supabase connection was live but the schema had never actually been run — all tables came back "not found." Fixed by running `server/supabase/schema.sql` + `phase2_catalog.sql` via a new script, `server/scripts/migrate.js` (uses the `pg` package, connects via `DATABASE_URL` in `server/.env` — the **session pooler** string, `aws-1-ap-south-1.pooler.supabase.com:5432`, not the direct `db.<ref>.supabase.co` host, which only resolves over IPv6 and isn't reachable from this network). Test login: `admin@ellora.test` / `EllroaAdmin@2026`. Both servers run via `npm run dev:server` (port 4000) and `npm run dev:admin` (port 5173).

### Phase 3: Operations
- [x] **Module 5: Inventory Management (first pass)** — added `reserved_quantity` to `product_variants` + a new `inventory_adjustments` audit-log table (`server/supabase/phase3_inventory.sql`), API (`server/routes/inventory.js`: `GET /`, `POST /adjust`, `GET /:variantId/history`), admin page (`admin/src/pages/InventoryPage.tsx`) listing every variant with on-hand/reserved/available stock and an "Adjust" dialog (quantity delta + reason: purchase order / manual adjustment / cycle count / return / damage + optional note). **Tested live**: added a size/color variant to the test product, adjusted its stock +25 through the UI, confirmed the number updated, persisted after a fresh page reload, and the audit row landed in `inventory_adjustments` with the correct `created_by`. Not yet built: multi-warehouse breakdown (single implicit warehouse for now), Purchase Order entities as their own trackable object (POs are currently just an adjustment reason, not a full PO workflow), stock transfer between warehouses, cycle-count sessions, low-stock alerts/thresholds, and an inventory history view in the UI (the `GET /:variantId/history` endpoint exists but isn't wired to any page yet).
- [x] **Module 6: Order Management (first pass)** — new `orders`/`order_items` tables with the full 10-status `order_status` enum from the spec (`server/supabase/phase3_orders.sql`), API (`server/routes/orders.js`: `GET/POST /`, `GET /:id`, `PUT /:id` for status/tracking), admin page (`OrdersPage.tsx`) — create-order dialog picks line items from the Inventory variant list and computes totals, inline per-row status-change dropdown. Creating an order decrements the linked variant's stock. **Tested live end-to-end**: created an order for "Rahul Verma" (1× Classic Denim Jacket M/Blue + ₹99 shipping), confirmed total = ₹2098, confirmed the variant's stock dropped 75→74 in Inventory, changed status pending→processing via the dropdown and saw it persist. Not yet built: Module 7 Customer Management (customer name/email/phone live directly on the order row for now, no `customers` table or order history per customer), invoice generation, real shipment/tracking integration (just a plain text `tracking_number`/`courier` field), partial shipment/cancellation, fraud score, gift wrap, order notes UI (the column exists, no UI yet). Also: no public storefront checkout exists, so orders are admin-entered only; the stock-decrement-per-line-item loop on order creation isn't wrapped in a DB transaction, so a mid-loop failure could leave stock partially decremented — fine for single-admin testing, worth revisiting before multi-user use.
- [x] **Module 17: CMS (first pass — Blog Posts + FAQs only)** — new `blog_posts`/`faqs` tables (`server/supabase/phase3_cms.sql`), API at `server/routes/cms.js` (mounted `/api/cms`, full CRUD on `/posts` and `/faqs`), admin pages `BlogPostsPage.tsx` + `FaqsPage.tsx`. **Tested live**: created an FAQ and a blog post, confirmed auto-slug and default-draft-status both worked. Scoped down from the full module deliberately — homepage builder, banners, popup management, announcement bar, mega menu, and footer all depend on the public storefront reading from the DB, which doesn't exist yet (see note below), so they weren't worth building blind. Blog/FAQ don't have that dependency and are useful as standalone admin content now.

---

## 📋 FULL 25-MODULE VISION (Future Phases)

### Phase 4: Customer & Finance (After first release)
- [x] **Module 7: Customer Management (first pass)** — new `customers` table + `orders.customer_id` FK (`server/supabase/phase4_customers.sql`), API `server/routes/customers.js` (list endpoint computes `order_count`/`lifetime_value` by joining orders), `CustomersPage.tsx`, and an "Existing customer" picker added to the Orders "New order" dialog (auto-fills name/email/phone, links `customer_id`). **Tested live end-to-end**: created customer "Priya Sharma," placed an order for her via the picker, confirmed her record updated to `order_count: 1` / `lifetime_value: 1999`. Not built: wishlist, wallet, reward points, buying-frequency/preferred-category analytics, support tickets — all deferred until there's more real purchase history and a public storefront to generate it. No Supabase Auth link (still admin-entered only, no public signup).
- [ ] Module 10: Coupon Engine (BOGO, referral, auto-apply) — deferred, needs a live checkout to apply codes against, which doesn't exist
- [x] **Module 14: Returns & Refunds (first pass)** — `returns` table with a `return_status` enum, tied to a specific `order_item` (`server/supabase/phase4_returns.sql`), API `server/routes/returns.js` (create computes refund amount; marking "refunded" **automatically restocks the variant** and logs it in `inventory_adjustments`), `ReturnsPage.tsx` (order → item picker, inline status dropdown). **Tested live end-to-end**: created a return, marked it refunded, confirmed Inventory stock incremented automatically. Not built: approval workflow gating (any status can be set at any time), exchange-to-different-item flow, return shipping/pickup logistics.
- [x] **Module 15: Finance Dashboard (first pass)** — no new tables, pure aggregation off `orders`+`returns` (`GET /api/finance/summary` in `server/routes/finance.js`), `FinancePage.tsx` with stat cards (revenue, refunds, net revenue, avg order value, pending returns) + orders-by-status breakdown. **Tested live and hand-verified every number** against known order/return data — all correct. Deliberately did not build Invoices, Credit/Debit Notes, Payouts, Vendor Payments, or GST reporting — none have a real data source yet (no vendors, no payout runs, tax isn't captured per-order-line at sale time), so building UI for them now would be speculative.

### Phase 5: Growth & Intelligence
- [x] **Module 1: Executive Dashboard (first pass)** — no new tables, pure aggregation over `orders`/`customers`/`products`/`product_variants`/`returns` (`GET /api/dashboard/summary` in `server/routes/dashboard.js`). Replaced the literal `DashboardPage.tsx` placeholder (four cards showing "—") with real stat cards (orders, revenue, customers, active products, pending returns) + a recent-orders table + a low-stock table (≤10 units) + an orders-by-status badge row. **Tested live, every number hand-verified**: Orders 5, Revenue ₹8,794 (checked by hand against the 5 known order totals), Customers 4, Active Products 3 — all correct. No drag-and-drop widgets (Module 25) yet — this is a fixed layout, not the customizable grid from the full spec.
- [ ] Module 8: CRM (email/SMS/WhatsApp campaigns, segmentation)
- [ ] Module 9: Marketing Dashboard (Google/Meta/TikTok ads, ROI)
- [ ] Module 16: Reports & Analytics (10+ report types, export)

### Phase 6: Advanced
- [ ] Module 11: Influencer Dashboard (commissions, affiliate links)
- [ ] Module 12: Warehouse Dashboard (picking, packing, QA, barcode)
- [ ] Module 13: Shipping (courier selection, COD, NDR)
- [ ] Module 18: Mobile App Management (push notifications, deep links)
- [ ] Module 19: AI Control Center (forecasting, chatbot, fraud detection)
- [ ] Module 20: Customer Support (live chat, tickets, escalation)
- [ ] Module 21: Notifications (email, SMS, WhatsApp, Slack, push)
- [ ] Module 24: Audit Logs (immutable change history)
- [ ] Module 25: Drag-and-Drop Dashboard Widgets

---

## 📁 TARGET FILE STRUCTURE (Revised)

```
project-root/
├── html/                        # Original static template (KEEP AS BACKUP)
├── server/                      # Express API backend
│   ├── index.js                 # Express entry point
│   ├── config/
│   │   └── supabase.js          # Supabase client init
│   ├── middleware/
│   │   └── auth.js              # Supabase auth middleware
│   ├── routes/
│   │   ├── auth.js              # Login, logout, session
│   │   ├── products.js          # Products API
│   │   ├── categories.js        # Categories API
│   │   ├── orders.js            # Orders API
│   │   ├── inventory.js         # Inventory API
│   │   ├── settings.js          # Settings API
│   │   ├── cms.js               # CMS API
│   │   └── upload.js            # File upload API
│   └── .env                     # Supabase keys, secrets
├── admin/                       # React admin frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Shadcn/ui components
│   │   │   ├── dashboard/       # Dashboard widgets
│   │   │   └── shared/          # Sidebar, Header, Navbar
│   │   ├── pages/               # Page views per module
│   │   ├── context/
│   │   │   └── AuthContext.tsx   # Auth & RBAC context
│   │   ├── hooks/
│   │   │   └── useSupabase.ts   # Data fetching hooks
│   │   ├── lib/
│   │   │   └── supabaseClient.ts
│   │   └── App.tsx
│   ├── tailwind.config.js
│   └── package.json
├── public/                      # Static assets for storefront
│   ├── css/, js/, fonts/, images/
│   └── uploads/
├── package.json                 # Root package.json
├── PROJECT_MEMORY.md            # ← THIS FILE
├── Ellora_Backend_Architecture_Report.docx
├── Building a production Admin Panel.docx
└── Required key components in Admin panel.docx
```

---

## 🗄️ DATABASE (Supabase PostgreSQL)

Core tables for first release:
1. `profiles` — Admin users with role enum (admin, manager, warehouse, marketing, finance, support, vendor)
2. `settings` — Site configuration (title, logo, tax, currency, payment gateways)
3. `categories` — Product categories (unlimited depth)
4. `products` — Full product info (SKU, barcode, brand, HSN, GST, 27+ fields)
5. `product_variants` — Size/color/pack variants with per-variant pricing & inventory
6. `product_images` — Image gallery (main, back, side, 360, lifestyle)
7. `inventory` — Stock levels per warehouse/variant
8. `orders` — Order lifecycle (10 statuses from pending to refund_completed)
9. `order_items` — Individual items in each order
10. `cms_pages` — Homepage, landing pages, blogs, policies
11. `cms_banners` — Banner/popup management
12. `cms_menus` — Mega menu & footer configuration
13. `coupons` — Discount codes (future)
14. `audit_logs` — Change history (future)

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

1. The `html/` folder is the ORIGINAL template — never modify it, keep as reference
2. Supabase project is created and connected (see NEXT ACTION) — no need to create another
3. User needs a **Cloudinary account** at https://cloudinary.com (free tier) — still not set up, needed once product image upload is built
4. Reference docs are in project root: `Building a production Admin Panel.docx` (the real phased build spec) and `Required key components in Admin panel.docx` (flat 25-module feature checklist)
5. **Ignore** `Ellora_Backend_Architecture_Report.docx`/`.pdf` (there's a `.pdf` copy directly in `C:\Users\DELL-G3 15-3500\Downloads\`, outside this project folder) — it documents a completely different, abandoned Express+EJS+SQLite architecture from before the Supabase/React pivot. Confirmed stale 2026-07-21.
6. Admin panel should feel premium — dark sidebar, clean forms, Shadcn/ui components
7. **Git**: project now has its own repo, scoped to this folder — pushed to `https://github.com/Puneethgowda4653/Saint-Roman` on branch `main`. Still avoid `git add -A`/`git add .` from the home directory (`C:\Users\DELL-G3 15-3500`) — that separate, unrelated repo still exists at home and is a different concern.

---

## 🚀 NEXT ACTION

**Phase 1, 2, and 3 are done as a first pass; Phase 4 has Modules 7 (Customers), 14 (Returns), and 15 (Finance) done** — see checklists above. Only Module 10 (Coupon Engine) and Module 8 (CRM) remain unstarted in Phase 4, both deliberately: Coupons need a live checkout that doesn't exist, CRM needs more real customer volume than the 2 test customers so far. **Every module built so far has been genuinely tested live in-browser and the numbers hand-verified against known data — not just scaffolded.**

Remaining open items, roughly in priority order:

1. **Full Phase 2 spec** (Media Matrix image upload, apparel fields, AI description optimizer) — the quick win (Brand/Barcode/HSN/GST form fields) is done; the two bigger pieces are still deliberately deferred until there's a real use case (Storage/Cloudinary setup, LLM provider choice).
2. **Fill in first-pass gaps as they start to matter**: Inventory has no multi-warehouse/PO objects/transfers/cycle counts/low-stock alerts/history view yet; Orders has no invoicing, real shipment tracking, or transactional stock decrement; CMS is Blog/FAQ only; Customers has no wishlist/wallet/reward points; Finance has no GST/invoices/payouts (no data source yet).
3. **Phases 5-6** (Executive Dashboard/widgets, Marketing, Warehouse/Shipping, Mobile, AI Center, Support, Notifications, Audit Logs) — entirely unstarted, mostly blocked on real integrations (courier APIs, ad platform APIs, LLM provider, mobile app) that don't exist yet.
4. **Cloudinary account** — needed for any image upload work (product images, category images, CMS banners).
5. **Storefront wiring, including a real checkout — done 2026-07-21.** `html/products.html`, `html/product-single.html`, and `html/faqs.html` fetch real data from a new unauthenticated public API (`server/routes/public.js`, `/api/public/*`) instead of static demo content. Along the way, fixed a real bug: the Products form could never actually set `status` to `active` — added a proper Status select. `faqs.html` originally had 5 fake category sections (25 fake Q&As) — simplified to one flat live accordion, matching the admin `faqs` table's real shape.

   **Real checkout (explicitly outside both documented plans — `html/` was originally meant to stay "reference only" — built with the user's explicit go-ahead):** cash-on-delivery only, no payment gateway. `html/js/ellora-cart.js` (localStorage cart) → `product-single.html` "Add to Cart" → `cart.html` (live rendering, removed the non-functional fake promo-code/multi-shipping-rate UI) → `checkout.html` (removed the non-functional fake login/coupon UI, real billing form) → `POST /api/public/orders` (unauthenticated but prices everything server-side from real `product_variants` data, never trusts the client — also matches-or-creates a `customers` row by email) → `order-received.html` (order number only; rest of that page still static). **Tested live twice** — once by this session, once independently by the user — both real orders landed correctly in the admin Orders page and correctly decremented stock and created customer records.

   **Still static/unwired**: Categories page, `blog.html`, most of `order-received.html`. No real shipping-rate calc (free shipping only) or payment gateway (COD only, by design). No product images anywhere (placeholder only, no Cloudinary/Media Matrix). CORS: `server/.env` `CORS_ORIGIN` now includes `http://localhost:3000` — env var changes need a full server restart, `node --watch` only hot-reloads code, not `.env`.

Local dev: `npm run install:all` (root) once per machine, then `npm run dev:full` (root) runs storefront + Express API + admin Vite dev server together. Test login: `admin@ellora.test` / `EllroaAdmin@2026`.
