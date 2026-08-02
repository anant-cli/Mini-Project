# ParkShare — Peer-to-Peer Smart Parking Marketplace

A two-sided parking marketplace: drivers search a live map and book slots;
hosts (individuals, malls, hospitals, offices) list unused space; the
platform verifies listings, handles escrow payments, and resolves disputes.

This repo is a working full-stack scaffold matching the project plan:
QR-based check-in/out, escrow payments, real-time slot updates over
WebSocket, EV charging fields, and role-based dashboards for drivers,
hosts, and admins.

```
parkshare/
├── database/
│   ├── schema.sql      # full PostgreSQL schema (run this first)
│   └── seed.sql        # optional sample data
├── backend/             # Node.js + Express API
│   └── src/
│       ├── config/      # db pool, socket.io
│       ├── middleware/  # auth, error handling
│       ├── models/      # raw SQL query layer, one file per table
│       ├── controllers/ # request handlers / business logic
│       ├── routes/      # route definitions
│       └── server.js    # entrypoint
└── frontend/             # React + Vite + Tailwind SPA
    └── src/
        ├── components/  # Navbar, Button, SlotStatusGrid (signature UI)
        ├── context/      # AuthContext
        ├── pages/        # Landing, Login, Signup, DriverMap, HostDashboard, AdminPanel
        └── lib/api.js    # axios client with JWT injection
```

## 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+ (PostGIS optional — a Haversine SQL function is included
  as a fallback for "find nearby slots" geo-queries, so PostGIS is not required)

## 2. Database setup

```bash
createdb parkshare
psql -d parkshare -f database/schema.sql
# optional sample data — see the note in seed.sql about generating real
# bcrypt password hashes before using it
psql -d parkshare -f database/seed.sql
```

## 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env with your PostgreSQL credentials and a real JWT_SECRET
npm run dev
```

The API starts on `http://localhost:5000`. Check `GET /health` to confirm
it's up. Socket.io runs on the same port/server.

## 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app starts on `http://localhost:5173` and proxies `/api` requests to
the backend (see `vite.config.js`).

## 5. Trying it out

1. Sign up as a **Space owner**, then go to **List your space** and submit
   a listing (needs latitude/longitude — grab coordinates from Google Maps
   for a real address).
2. Sign up as an **Admin** manually in the database (`UPDATE users SET
   role = 'admin' WHERE email = '...'`, since the signup form only offers
   driver/host/business_host), log in, and approve the pending listing from
   the **Admin panel**.
3. Sign up as a **Driver**, go to **Find parking**, and book the now-live
   listing. You'll get a QR pass (dataURL image) back from the API.
4. Log back in as the host, go to the dashboard's **Gate check-in /
   check-out** panel, and paste the booking's `qr_token` (visible in the
   booking API response or the Payments table) to simulate a gate scan for
   check-in and check-out. Checkout computes the final bill — including any
   overtime — and releases the escrowed payout.

## 6. Design system

The frontend palette and type system are described inline in
`frontend/tailwind.config.js` — built around real parking infrastructure
(sensor-light teal/amber/coral, asphalt/chalk surfaces, Space Grotesk +
Inter + JetBrains Mono) rather than a generic template palette. The
signature UI element is the animated live slot-status grid
(`src/components/SlotStatusGrid.jsx`), used in the landing hero.

## 7. Notable architectural decisions

- **Double-booking prevention**: `bookings.controller.js` wraps slot
  selection in a database transaction with `SELECT ... FOR UPDATE`
  (`slot.model.js`) so two simultaneous booking requests for the same slot
  can never both succeed.
- **Trust mechanic**: check-in/out both require scanning a unique
  `qr_token` — this is the "two-device proof" described in the project
  plan (Section 4.1). Billing starts from the real `checkin_time`, and
  overtime is computed automatically at checkout (`booking.model.js`).
- **Escrow**: `payment.model.js` holds funds at booking time
  (`payout_status: held`) and only marks them `released` after checkout,
  matching Section 4.3 of the plan.
- **Real-time**: `config/socket.js` broadcasts `slot_updated` events to
  every client watching a given location, so a driver's map updates the
  instant another driver books a slot.

## 8. What's stubbed / next steps

- Payment gateway integration (Razorpay/Stripe) is stubbed — `payment.model.js`
  accepts a `gateway_ref` field ready for a real integration.
- SMS/email notifications (extend reminders, booking confirmations) are not
  wired up — see Section 4.2 of the original plan for the intended flow.
- The QR scanner UI currently accepts a pasted token; swapping in a camera
  scanner (e.g. `html5-qrcode`) is a frontend-only change.
- Geofencing auto-detection (optional upgrade mentioned in the plan) is not
  implemented.
