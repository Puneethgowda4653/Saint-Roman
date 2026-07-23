# 🧠 ELLORA PROJECT MEMORY
> Last Updated: July 23, 2026
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
| Admin accounts | Single admin first, expand to 7 roles later |

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
- [x] **Module 17: CMS** — Blog Posts + FAQs (`server/supabase/phase3_cms.sql`, `server/routes/cms.js`, `BlogPostsPage.tsx`/`FaqsPage.tsx`), plus later Announcement Bar + Banners + Footer (`server/supabase/phase5_cms_content.sql`, new `banners` table, `BannersPage.tsx`, `settings.announcement_text`/`footer_copyright_text`). **Tested live**: FAQ/blog post creation with auto-slug; announcement bar and footer copyright both confirmed showing live admin-set text on `products.html`; banner CRUD confirmed round-tripping through the public API — **but banners have no display surface yet** (no hero section wired on any storefront page). Still not built: Homepage Builder, Landing Pages, Popup Management, Mega Menu — all need either a real page-builder UI or a display mechanism this static template lacks.

---

## 📋 FULL 25-MODULE VISION (Future Phases)

### Phase 4: Customer & Finance (After first release)
- [x] **Module 7: Customer Management (first pass)** — new `customers` table + `orders.customer_id` FK (`server/supabase/phase4_customers.sql`), API `server/routes/customers.js` (list endpoint computes `order_count`/`lifetime_value` by joining orders), `CustomersPage.tsx`, and an "Existing customer" picker added to the Orders "New order" dialog (auto-fills name/email/phone, links `customer_id`). **Tested live end-to-end**: created customer "Priya Sharma," placed an order for her via the picker, confirmed her record updated to `order_count: 1` / `lifetime_value: 1999`. Not built: wishlist, wallet, reward points, buying-frequency/preferred-category analytics, support tickets — all deferred until there's more real purchase history and a public storefront to generate it. No Supabase Auth link (still admin-entered only, no public signup).
- [x] **Module 10: Coupon Engine (first pass)** — unblocked once real checkout existed. `coupons` table (percentage/flat/free_shipping) + `orders.coupon_code`/`discount_amount` (`server/supabase/phase5_coupons.sql`). Shared `server/lib/coupons.js` validation used by both a live-preview endpoint and order creation (always re-validated server-side, never trusts a client-supplied discount). `CouponsPage.tsx`, real coupon box on `checkout.html`. **Tested live**: applied SAVE10 (10%) to a ₹1999 item, confirmed -₹199.90 discount and ₹1799.10 total, confirmed `usage_count` incremented after the order placed. Not built: BOGO, Buy X Get Y, referral/employee coupon types.
- [x] **Module 14: Returns & Refunds (first pass)** — `returns` table with a `return_status` enum, tied to a specific `order_item` (`server/supabase/phase4_returns.sql`), API `server/routes/returns.js` (create computes refund amount; marking "refunded" **automatically restocks the variant** and logs it in `inventory_adjustments`), `ReturnsPage.tsx` (order → item picker, inline status dropdown). **Tested live end-to-end**: created a return, marked it refunded, confirmed Inventory stock incremented automatically. Not built: approval workflow gating (any status can be set at any time), exchange-to-different-item flow, return shipping/pickup logistics.
- [x] **Module 15: Finance Dashboard (first pass)** — no new tables, pure aggregation off `orders`+`returns` (`GET /api/finance/summary` in `server/routes/finance.js`), `FinancePage.tsx` with stat cards (revenue, refunds, net revenue, avg order value, pending returns) + orders-by-status breakdown. **Tested live and hand-verified every number** against known order/return data — all correct. Deliberately did not build Invoices, Credit/Debit Notes, Payouts, Vendor Payments, or GST reporting — none have a real data source yet (no vendors, no payout runs, tax isn't captured per-order-line at sale time), so building UI for them now would be speculative.

### Phase 5: Growth & Intelligence
- [x] **Module 1: Executive Dashboard (first pass)** — no new tables, pure aggregation over `orders`/`customers`/`products`/`product_variants`/`returns` (`GET /api/dashboard/summary` in `server/routes/dashboard.js`). Replaced the literal `DashboardPage.tsx` placeholder (four cards showing "—") with real stat cards (orders, revenue, customers, active products, pending returns) + a recent-orders table + a low-stock table (≤10 units) + an orders-by-status badge row + a live notification bell (Module 21, see below). **Tested live, every number hand-verified**: Orders 5, Revenue ₹8,794 (checked by hand against the 5 known order totals), Customers 4, Active Products 3 — all correct. No drag-and-drop widgets (Module 25) — fixed layout, not the customizable grid from the full spec; not built at all.
- [ ] Module 8: CRM — deferred, only 4 customers exist, segmentation/campaign tooling has nothing real to segment yet
- [ ] Module 9: Marketing Dashboard — deferred, needs real Google/Meta/TikTok ad account APIs
- [x] **Module 16: Reports & Analytics (first pass)** — added `products.cost_price` (admin-only) to enable a real Profit Report. Single generic `GET /api/reports/:type` (`server/routes/reports.js`) supporting Sales/Customer/Inventory/Product Performance/Returns/Profit, `ReportsPage.tsx` renders any of them generically + client-side CSV export. **Tested live** across multiple report types, all correct. Not built: Marketing/Warehouse/Employee reports (no data source), true Excel/PDF generation or Schedule Reports (no doc-gen lib or job scheduler — CSV substitutes). **Found and fixed a real bug while testing this**: `PUT /api/products/:id` was deleting and recreating all variants (fresh UUIDs) on every edit, which via `ON DELETE SET NULL` silently orphaned `order_items.variant_id` on every historical order each time a product was edited. Fixed to upsert variants by `(size, color)` instead — verified a variant's `id` now survives an edit.

### Phase 6: Advanced
- [x] **Module 11: Influencer Dashboard (first pass)** — ties to the Coupon Engine rather than a separate discount system: `influencers.coupon_code` FKs `coupons.code`. Sales/commission computed server-side from real `orders.total` where the coupon was used — not manually entered. `server/routes/influencers.js`, `InfluencersPage.tsx`. **Tested live**: influencer tied to SAVE10 correctly showed ₹1799.1 sales / ₹179.91 commission (10%), matching the one real order that used it. No follower/engagement/content tracking (no social API).
- [x] **Module 12: Warehouse Dashboard (first pass)** — no new backend at all; `WarehousePage.tsx` is a 3-column Kanban (Picking/QC/Ready to ship) filtered from the existing Orders API, "advance stage" buttons call the existing order-status endpoint. **Tested live**: an order moved through stages, board updated in real time.
- [ ] Module 13: Shipping — deferred, real courier selection/rate comparison/tracking needs a courier API (Shiprocket/Delhivery-style); `orders.tracking_number`/`courier` exist as plain fields only
- [ ] Module 18: Mobile App Management — deferred, no mobile app exists to manage
- [ ] Module 19: AI Control Center — deferred, needs an LLM API key/provider decision
- [x] **Module 20: Customer Support (first pass)** — `support_tickets` table, admin CRUD (`SupportPage.tsx`), and a public ticket-creation endpoint wired to `html/contact.html`'s previously-dead contact form. **Tested live end-to-end**: submitted the real contact form, ticket appeared in admin, changed its status, confirmed it persisted. No live chat/WhatsApp/calls (no provider).
- [x] **Module 21: Notifications (first pass — "Internal Alerts" only)** — no persisted table; `GET /api/notifications` derives a live feed each request from recent orders/low-stock/pending-returns/open-tickets (same approach as Dashboard/Reports). Bell icon + count badge added to the admin `Header.tsx`. **Tested live**: badge showed 5, panel listed the 5 real recent orders. No email/SMS/WhatsApp/Push/Slack (no provider).
- [x] **Module 24: Audit Logs (first pass)** — new `audit_logs` table + `server/lib/audit.js` `logAudit()` helper. Instrumented the highest-value mutation points only (not a blanket "log every API call"): admin logins, product price changes, product deletions, order status changes, refunds. **Found along the way**: `POST /api/auth/login` is dead code (frontend signs in via the Supabase SDK directly) — added `POST /api/auth/log-login`, called by `AuthContext.tsx` right after a successful client-side sign-in, as the only way to observe logins server-side. **Tested live**: signed out/in → login logged; changed a price → price_change logged with exact before/after; advanced an order → status_change logged correctly.
- [ ] Module 25: Drag-and-Drop Dashboard Widgets — not built, fixed layout only

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

**As of 2026-07-23: 19 of 25 modules built (16 as genuine first passes tested live, 3 partial — Auth, Settings, CMS — extended incrementally throughout).** Every module listed with `[x]` above has been exercised live in a real browser against the real Supabase project, with the resulting numbers hand-checked, not just "code written." 6 modules remain unstarted, all deliberately, all blocked on the same thing: a real external account/API this project doesn't have yet.

### What's still missing, and why

| Module | Blocked on |
|---|---|
| 8. CRM | Real customer volume (only ~5 test customers) — segmentation has nothing to segment |
| 9. Marketing Dashboard | Google/Meta/TikTok ad account APIs |
| 13. Shipping (real courier integration) | A courier API (Shiprocket/Delhivery-style) |
| 18. Mobile App Management | An actual mobile app to manage |
| 19. AI Control Center | An LLM provider/API key decision |
| 25. Dashboard Widgets (drag-and-drop) | Not blocked, just lower value — convenience layer over data already visible elsewhere |

None of these need more admin-panel engineering to unblock — they need the user to make an account/vendor decision first (which courier? which LLM? is there ad spend yet?).

### Storefront: still far short of the full site

Only `products.html`, `product-single.html`, `faqs.html`, and `contact.html` were ever wired to real data — the other ~25 static pages (Categories browsing, `index.html`/homepage/hero, `blog.html`, account pages, etc.) are still 100% the original template. A real checkout was built (cash-on-delivery only, no payment gateway) — genuinely outside both documented plans (`html/` was meant to stay "reference only"), done with explicit user go-ahead. Banners are manageable in the admin panel but have no display surface anywhere yet.

### Real bugs found and fixed along the way (worth knowing about if similar symptoms show up again)
1. **Product edits silently orphaned order history** — `PUT /api/products/:id` deleted and recreated all variants (fresh UUIDs) on every edit; via `ON DELETE SET NULL` this nulled `order_items.variant_id` on every historical order line each time a product was touched. Fixed to upsert by `(size, color)`.
2. **RBAC was decorative, not real, all session** — `requireRole()` checked `user_metadata.role`, which nothing ever wrote; every check silently defaulted to `'admin'`. Fixed to read real `profiles.role`.
3. **`POST /api/auth/login` is dead code** — the admin frontend authenticates via the Supabase SDK directly (`AuthContext.tsx`), never through that backend route. Harmless, but don't trust it if referenced later.
4. **CORS blocked storefront data when browser-sync picked a non-3000 port** — the storefront ran on `localhost:3002` (3000 was occupied), but `server/index.js` CORS only allowed `localhost:3000` and `localhost:5173`. Every `fetch()` from `products.html` etc. was silently blocked by the browser → "Could not load products (Failed to fetch)." Fixed by replacing the static origin list in `server/index.js` with a dynamic function that allows any `http(s)://localhost:<port>` origin, so port drift never causes this again. Also added 3001/3002 to `server/.env` `CORS_ORIGIN` as a belt-and-suspenders fallback.

### What I'd genuinely recommend prioritizing next (not just "what's left")
1. **Cloudinary account** — the single missing piece blocking the most other work: product images, category images, blog images, banner images all need it, and it's just a signup, not an engineering blocker.
2. **Wire the rest of the storefront to real data** (Categories, `index.html`, `blog.html`) — the admin panel is now feature-rich but most of the storefront still doesn't reflect it.
3. **Extend RBAC beyond the 2 proof-point routes** — real roles now work, but only Settings-write and Audit-logs-read actually check them; the full Role Permission Matrix from the spec isn't applied anywhere else yet.
4. **A payment gateway decision** (Razorpay/Stripe) — checkout is COD-only; that's a real ceiling on this being a usable store.

Local dev: `npm run install:all` (root) once per machine, then `npm run dev:full` (root) runs storefront + Express API + admin Vite dev server together. Test login: `admin@ellora.test` / `EllroaAdmin@2026`.
