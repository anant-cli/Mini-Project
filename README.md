# ParkSlot - Peer-to-Peer Smart Parking Marketplace

ParkSlot connects drivers with verified parking spaces listed by hosts. Features include live slot availability via Socket.io, MapLibre/OpenFreeMap maps, QR-based check-in/check-out, escrow-style mock payments, EV charger metadata, saved listings, reviews, and admin approval.

## Tech Stack

- **Frontend:** Plain HTML5 + vanilla JS, Vite bundler, multi-page (no SPA framework), MapLibre + OpenFreeMap + Nominatim, Socket.io client
- **Backend:** Node.js, Express, Socket.io, PostgreSQL (via Neon)
- **Auth:** JWT (jsonwebtoken) + bcrypt password hashing
- **Database:** PostgreSQL, schema in `database/schema.sql`

## Project Layout

```text
backend/    Express API, Socket.io, route controllers, models, middleware
database/   PostgreSQL schema (schema.sql)
frontend/   HTML pages, vanilla JS modules, CSS, Vite config
```

## Run Locally

### 1. Prerequisites

- Node.js 18+
- A PostgreSQL database (local install, or a free cloud instance on Neon)

### 2. Database

Apply the schema against your database:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

Or run via npm inside the `backend` directory:

```bash
npm run migrate
```

Admin bootstrapping is manual. Create a normal user first, then promote it in SQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

After deploying to Neon for the first time, also run the `ALTER TABLE` migration if the column isn't in your live schema yet:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;
```

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Key environment variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (Neon or local) |
| `JWT_SECRET` | Long random string for JWT signing |
| `CORS_ORIGIN` | Frontend origin(s), comma-separated. Required in production. |
| `PORT` | API port (default 5000) |
| `PLATFORM_COMMISSION_PERCENT` | Host payout commission (default 15) |

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
npm run preview
```

Set `VITE_API_URL=https://your-render-url.onrender.com/api` in Vercel environment variables so the built frontend hits the deployed backend.

## API Notes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/bookings/quote?slot_id=...&start_time=...&end_time=...` | Returns `{ price_per_hour, hours, estimated_amount }` for the checkout summary. |
| `PATCH` | `/api/admin/users/:id/unsuspend` | Reverses an admin user suspension. |
| `GET` | `/api/config` | Returns public non-secret config such as `platform_commission_percent`. |

## Deployment

| Service | Config |
|---|---|
| **Vercel** | Root directory: `frontend`. Set `VITE_API_URL` env var. |
| **Render** | Root directory: `backend`. Start command: `node src/server.js`. Set all backend env vars. |
| **Neon** | Free Postgres. Paste `DATABASE_URL` into Render. |

## Security Notes

Helmet's `contentSecurityPolicy` block in `backend/src/server.js` applies to Render API responses. The static frontend also defines its own CSP through Vercel response headers in `frontend/vercel.json`, so browser-loaded HTML is protected at the edge.

Payments are a fully mocked escrow simulation. No real Razorpay or Stripe calls are made.

## Admin Console — Database Tables & Analytics (latest pass)

On top of the existing moderation tabs (Pending Listings, Identity Verification, Users,
Disputes, All Listings), the admin console now has:

- **Dashboard** — stat cards (users, listings, bookings, open disputes, pending KYC, revenue)
  and a chart builder: pick any table, a date or category column, count/sum/avg, and line or
  bar. Rendered as plain inline SVG (`frontend/js/charts.js`) — no chart library, no CDN
  script, so the `script-src 'self'` CSP in `vercel.json` stays intact.
- **Database tables** — full CRUD browser/editor for every table, backed by a whitelist-only
  registry (`backend/src/config/adminTables.js`) so the client never controls a raw SQL
  identifier. `password_hash` is never exposed. `kyc_submissions` is deliberately **read-only**
  here — approving/rejecting has to flip `users.kyc_status` and `users.id_verified` together,
  which only the "Identity Verification" tab does atomically — and its large base64 image
  columns are excluded from every query the generic browser runs (`heavy: true` in the
  registry), so they can never appear in a list/edit response even by accident.

Verified end-to-end against a fresh schema load: CRUD, search/sort/pagination, composite
keys (`favorites`), self-delete protection, enum/date validation, SQL-identifier injection
attempts (rejected), and both analytics modes (trend + breakdown).
