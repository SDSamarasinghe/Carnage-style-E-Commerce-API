# 🛠 BACKEND COPILOT PROMPT — Carnage-style E-Commerce (NestJS + MongoDB)

> Paste this whole file as your initial prompt in VS Code Copilot Chat (or use it as a project README that Copilot reads). Then go feature-by-feature using the checklist at the bottom.

---

## 1. PROJECT BRIEF

Build a **production-grade e-commerce REST API** for a multi-branch activewear & lifestyle clothing brand (inspired by `incarnage.com`). The store sells men's, women's, and accessory products: oversized t-shirts, leggings, joggers, graphic tees, sports bras, biker shorts, tank tops, shorts, etc. The brand runs **multiple physical store branches**; each branch has its own admin who manages that branch's inventory and orders, while a **super admin** controls the entire system.

### Tech Stack (strict)
- **Framework:** NestJS (latest, TypeScript strict mode)
- **Database:** MongoDB via Mongoose
- **Auth:** JWT (access + refresh tokens) with `@nestjs/jwt` and Passport
- **Validation:** `class-validator` + `class-transformer` + global `ValidationPipe`
- **Config:** `@nestjs/config` + `.env` + Joi schema validation
- **File uploads:** Multer + Cloudinary (or local for dev) for product images
- **Email:** Nodemailer (SMTP) for order confirmations, password reset, etc.
- **Payments:** Stripe (test mode by default) + Cash-on-Delivery option
- **Docs:** Swagger via `@nestjs/swagger` exposed at `/api/docs`
- **Logging:** Built-in Nest logger + global exception filter
- **Testing:** Jest unit tests for services + e2e for controllers

---

## 2. ROLES & PERMISSIONS

Three roles enforced by a **`RolesGuard`** + `@Roles()` decorator on controllers:

| Role | Can Do |
|---|---|
| `customer` | Register/login, browse, cart, wishlist, place orders, view *their own* orders, update profile/addresses, write reviews |
| `branch_admin` | Login, view & update inventory **for their assigned branch only**, view/process orders shipped from their branch, view branch-level reports, manage products' branch-specific stock |
| `super_admin` | Everything: CRUD on branches, branch_admins, products, categories, collections, coupons, view all orders & users, change order statuses globally, run global analytics, manage site settings |

Also support **guest checkout** — orders can be placed without a user account (only email + shipping info required).

---

## 3. DATA MODELS (Mongoose Schemas)

Generate all of the following with proper indexes, timestamps, and refs:

### `User`
- `firstName`, `lastName`, `email` (unique, lowercased), `passwordHash`, `phone`
- `role`: enum `['customer', 'branch_admin', 'super_admin']` (default `customer`)
- `assignedBranch`: ObjectId ref `Branch` (only for `branch_admin`)
- `addresses`: array of embedded `Address` subdocuments (line1, line2, city, district, postalCode, country, isDefault)
- `isActive`, `emailVerified`, `lastLoginAt`
- `refreshTokenHash`

### `Branch`
- `name`, `code` (unique short code, e.g. "CMB01"), `address`, `city`, `district`, `phone`, `email`
- `geoLocation`: { lat, lng }
- `manager`: ObjectId ref `User` (branch_admin)
- `isActive`, `openingHours`

### `Category`
- `name`, `slug` (unique), `parent` (self-ref, for nested categories), `image`, `order`, `isActive`
- Example: Women > Leggings & Biker Shorts

### `Collection`
- `name`, `slug` (unique), `description`, `coverImage`, `products` (array of refs), `isFeatured`, `startsAt`, `endsAt`
- Example: "Desire Collection", "Athleisure"

### `Product`
- `name`, `slug` (unique), `description`, `shortDescription`
- `category`: ref `Category`
- `collections`: array of refs `Collection`
- `gender`: enum `['men', 'women', 'unisex', 'accessories']`
- `images`: array of `{ url, alt, isPrimary, order }`
- `basePrice`, `compareAtPrice` (for "Sale -30%" display), `costPrice` (admin-only)
- `variants`: array of embedded `ProductVariant`:
  - `sku` (unique), `size` (XS/S/M/L/XL/XXL/etc.), `color` (`{ name, hexCode }`), `additionalPrice`, `images` (variant-specific)
- `tags`: array of strings
- `materials`, `careInstructions`, `sizeChart`
- `rating`: { average, count }
- `salesCount`, `viewCount`
- `isPublished`, `isFeatured`, `isNewArrival`
- `seo`: { metaTitle, metaDescription, ogImage }

### `Inventory` (separate collection for branch-level stock)
- `product`: ref `Product`
- `variantSku`: string (the variant's SKU)
- `branch`: ref `Branch`
- `stock`: number
- `lowStockThreshold`: number
- `reservedStock`: number (held during checkout)
- Compound unique index: `(product, variantSku, branch)`

### `Cart`
- `user`: ref `User` (nullable for guest)
- `guestId`: string (for guest carts via cookie/header)
- `items`: array of `{ product, variantSku, quantity, priceSnapshot }`
- `coupon`: ref `Coupon` (nullable)
- TTL index — auto-expire guest carts after 30 days

### `Order`
- `orderNumber`: auto-generated human-readable (e.g. `CRN-2026-00042`)
- `user`: ref `User` (nullable for guest)
- `guestInfo`: { email, phone, firstName, lastName } (for guest checkout)
- `items`: array of snapshotted order items (name, image, variant, qty, unitPrice, lineTotal)
- `fulfillingBranch`: ref `Branch` (which branch ships it)
- `shippingAddress`, `billingAddress`: embedded address
- `subtotal`, `discountAmount`, `shippingFee`, `taxAmount`, `totalAmount`, `currency` (default LKR)
- `coupon`: { code, type, value }
- `paymentMethod`: enum `['card', 'cod']`
- `paymentStatus`: enum `['pending', 'paid', 'failed', 'refunded']`
- `paymentDetails`: { provider, transactionId, paidAt }
- `orderStatus`: enum `['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned']`
- `statusHistory`: array of `{ status, changedBy, changedAt, note }`
- `trackingNumber`, `courier`, `estimatedDelivery`
- `notes` (customer note + internal note)

### `Wishlist`
- `user`: ref `User` (unique)
- `products`: array of refs

### `Review`
- `product`: ref `Product`
- `user`: ref `User`
- `order`: ref `Order` (must have purchased to review)
- `rating`: 1–5
- `title`, `comment`, `images`
- `isApproved` (admin moderation)

### `Coupon`
- `code` (unique, uppercase)
- `type`: enum `['percentage', 'fixed']`
- `value`: number
- `minOrderAmount`, `maxDiscountAmount`
- `usageLimit`, `usageCount`, `perUserLimit`
- `applicableCategories`, `applicableProducts`
- `startsAt`, `endsAt`, `isActive`

### `Notification`
- `user`: ref `User`
- `type`, `title`, `message`, `link`, `isRead`

### `Setting` (singleton — site-wide config managed by super_admin)
- `siteName`, `logo`, `contactEmail`, `supportPhone`
- `currency`, `taxRate`, `freeShippingThreshold`
- `socialLinks`, `bannerImages`, `announcementBar`

---

## 4. MODULE STRUCTURE

Create one Nest module per domain. Final folder layout:

```
src/
├── app.module.ts
├── main.ts
├── common/
│   ├── decorators/   (Roles, CurrentUser, Public)
│   ├── guards/       (JwtAuthGuard, RolesGuard, OptionalAuthGuard, BranchScopedGuard)
│   ├── filters/      (AllExceptionsFilter)
│   ├── interceptors/ (TransformInterceptor, LoggingInterceptor)
│   ├── pipes/        (ParseObjectIdPipe)
│   └── utils/
├── config/
│   ├── configuration.ts
│   └── validation.schema.ts
├── modules/
│   ├── auth/         (register, login, refresh, forgot/reset password, verify email)
│   ├── users/        (profile, addresses, admin user mgmt)
│   ├── branches/     (CRUD, assign admin)
│   ├── categories/
│   ├── collections/
│   ├── products/     (CRUD, search, filters, related)
│   ├── inventory/    (stock per branch, low-stock alerts)
│   ├── cart/         (add/update/remove, merge guest→user on login)
│   ├── wishlist/
│   ├── orders/       (checkout, list, status updates, cancel, returns)
│   ├── reviews/
│   ├── coupons/      (validate, apply, CRUD)
│   ├── payments/     (Stripe webhook, COD confirmation)
│   ├── uploads/      (Cloudinary signed URL or direct upload)
│   ├── notifications/
│   ├── analytics/    (sales, top products, branch performance — super_admin & branch_admin scoped)
│   ├── settings/
│   └── mail/         (transactional email templates)
└── database/
    └── seeds/        (super_admin seed, categories, sample products)
```

---

## 5. KEY API ENDPOINTS

Implement REST routes. Use `kebab-case`. All list endpoints support `?page=&limit=&sort=&search=&filter[...]=`.

### Public
- `GET /products` — list with filters (gender, category, collection, priceMin/Max, color, size, onSale, inStock)
- `GET /products/:slug`
- `GET /products/:slug/related`
- `GET /categories` (tree) / `/categories/:slug`
- `GET /collections` / `/collections/:slug`
- `GET /branches` (for store locator)
- `GET /products/:slug/reviews`

### Auth
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `POST /auth/forgot-password`, `POST /auth/reset-password`
- `GET /auth/me`, `POST /auth/verify-email`

### Customer (auth required)
- `GET/PATCH /users/me`
- `GET/POST/PATCH/DELETE /users/me/addresses[/:id]`
- `GET/POST/PATCH/DELETE /cart` (works with guestId header too)
- `POST /cart/merge` (on login)
- `POST /cart/apply-coupon`
- `GET/POST/DELETE /wishlist`
- `POST /orders` (checkout)
- `GET /orders` (own orders)
- `GET /orders/:orderNumber`
- `POST /orders/:orderNumber/cancel`
- `POST /reviews`

### Branch Admin (auth + role)
- `GET /admin/branch/orders` — only their branch's
- `PATCH /admin/branch/orders/:id/status`
- `GET /admin/branch/inventory`
- `PATCH /admin/branch/inventory/:id` (adjust stock)
- `GET /admin/branch/analytics`

### Super Admin (auth + role)
- Full CRUD: `/admin/users`, `/admin/branches`, `/admin/categories`, `/admin/collections`, `/admin/products`, `/admin/coupons`, `/admin/settings`
- `POST /admin/branches/:id/assign-admin`
- `GET /admin/orders` (all), `PATCH /admin/orders/:id/status`, `PATCH /admin/orders/:id/assign-branch`
- `GET /admin/analytics/overview`, `/admin/analytics/sales`, `/admin/analytics/top-products`, `/admin/analytics/branch-performance`
- `POST /admin/uploads/signed-url`

---

## 6. CROSS-CUTTING REQUIREMENTS

1. **Validation** — every DTO uses class-validator. Reject extra fields (`whitelist: true, forbidNonWhitelisted: true`).
2. **Pagination response shape** — always `{ data: [], meta: { total, page, limit, pages } }`.
3. **Error response shape** — `{ statusCode, message, error, timestamp, path }`.
4. **Soft delete** — use `isActive` flag instead of hard delete for products/users/branches.
5. **Slug generation** — auto-generate slugs from name; ensure uniqueness with counter suffix.
6. **Stock reservation** — when an order is created, decrement `Inventory.stock` atomically (use MongoDB transactions). Restore on cancel.
7. **Fulfilling branch logic** — for each order, pick the nearest branch with full stock; if none, split or assign nearest with partial. Make this a pluggable strategy.
8. **Branch scoping** — `BranchScopedGuard` ensures `branch_admin` can only touch resources where `branch === req.user.assignedBranch`. Throw 403 otherwise.
9. **Rate limiting** — `@nestjs/throttler` global (60 req/min), tighter on auth (5/min).
10. **Security** — Helmet, CORS configurable, bcrypt cost 12, no password ever returned, rotate refresh tokens.
11. **Webhooks** — Stripe webhook endpoint with signature verification updates `paymentStatus`.
12. **Seeders** — npm script seeds: 1 super admin (from .env), 3 branches, 3 branch admins, ~10 categories, ~30 sample products with variants and per-branch inventory.

---

## 7. .env (example)

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/carnage
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Carnage <no-reply@carnage.lk>"
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CLIENT_URL=http://localhost:3000
SUPER_ADMIN_EMAIL=admin@carnage.lk
SUPER_ADMIN_PASSWORD=
```

---

## 8. BUILD ORDER (work through this with Copilot)

1. Project scaffold + config + global pipes/filters/interceptors + Swagger
2. `User` schema + `auth` module (register, login, refresh, JWT strategy, role guard) + seed super admin
3. `branches` module + assign-admin endpoint
4. `categories` + `collections` modules
5. `products` module + variant logic + image upload via Cloudinary
6. `inventory` module + branch-scoped guard + atomic stock ops
7. `cart` module (guest + user, merge on login, coupon application)
8. `coupons` module
9. `orders` module — checkout flow, fulfilling-branch picker, status transitions, status history
10. `payments` module — Stripe intent + webhook, COD path
11. `wishlist`, `reviews`, `notifications`, `mail`
12. `analytics` (aggregation pipelines) — overview, sales over time, top products, branch performance
13. `settings` module
14. Unit tests for services + e2e for auth & orders
15. Dockerfile + docker-compose (api + mongo + mongo-express)

---

## 9. ACCEPTANCE CRITERIA

- All endpoints documented in Swagger with examples
- A `branch_admin` literally cannot see another branch's data (verified by an e2e test)
- Guest can complete checkout, and merge cart on subsequent registration
- Order placement decrements stock and is reversible on cancel
- Stripe test card `4242 4242 4242 4242` completes the full flow including webhook update
- `npm run seed` produces a working demo dataset

> Copilot, please scaffold step 1 first and wait for my "next" before moving to step 2. Use idiomatic Nest patterns, no anti-patterns, no `any` types.
