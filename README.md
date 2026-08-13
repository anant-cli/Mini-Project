# ParkSlot - Peer-to-Peer Smart Parking Marketplace

ParkSlot connects drivers with verified parking spaces listed by hosts. It includes live slot availability, QR-based check-in/check-out, escrow-style mock payments, EV charger metadata, saved listings, reviews, and basic admin approval.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Leaflet, Socket.io client
- Backend: Node.js, Express, PostgreSQL, Socket.io
- Auth: JWT with bcrypt password hashing
- Data: SQL schema and seed files in `database/`

## Run Locally

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 2. Database

Create a PostgreSQL database named `parkslot`, then run:

```bash
psql -d parkslot -f database/schema.sql
psql -d parkslot -f database/seed.sql
```

### 3. Backend

```bash
cd backend
npm install
npm start
```

Common environment variables:

```env
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/parkslot
JWT_SECRET=change-me
CORS_ORIGIN=http://localhost:5173
PLATFORM_COMMISSION_PERCENT=15
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL=http://localhost:5000/api` if the frontend is not being proxied to the backend.


## System Architecture

```mermaid
flowchart LR
  Driver[Driver browser] --> Frontend[React + Vite frontend]
  Host[Host browser] --> Frontend
  Admin[Admin browser] --> Frontend

  Frontend -->|REST /api| API[Express API]
  Frontend <-->|Socket.io| Realtime[Socket.io server]
  Realtime --- API

  API --> Auth[Auth middleware + JWT]
  API --> Routes[Route controllers]
  Routes --> Models[Database models]
  Models --> DB[(PostgreSQL)]

  Routes --> QR[QR token/data URL utility]
  Routes --> Payments[Escrow-style payment records]
  Routes --> Reviews[Reviews + favorites]
```

## Project Layout

```text
backend/   Express API, Socket.io, route controllers, models, middleware
database/  PostgreSQL schema and seed data
frontend/  React pages, components, auth context, API client
```
