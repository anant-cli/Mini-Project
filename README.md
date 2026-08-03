# ParkShare – Peer-to-Peer Smart Parking Marketplace

ParkShare is a two-sided marketplace for parking ("Airbnb for parking"), built as a college mini project. It connects space owners with drivers looking for guaranteed, verified parking. The platform features live availability via WebSockets, escrow-style payments based on actual time parked, EV charging support, and a QR-based dual-verification check-in process.

## 🚀 Key Features

*   **Two-Sided Marketplace:** Drivers search for parking; hosts list unused driveways or lots.
*   **Live Slot Updates:** Map pins and slot grids update instantly as slots are booked (Socket.io).
*   **QR-Based Verification:** The booking clock doesn't start until the driver arrives and the host scans their unique QR pass. Check-out is also verified by scan.
*   **Escrow Payments:** Driver payments are held securely until checkout, preventing fraud on both sides. Overtime is calculated and billed automatically.
*   **EV Ready:** Filter map by EV charging. Hosts can add chargers with specific connector types, power ratings, and per-kWh pricing.
*   **Mock Data Fallback:** The frontend gracefully falls back to interactive mock data if the backend server is unreachable, making it perfect for immediate demonstrations.

## 🛠 Tech Stack

*   **Frontend:** React (Vite), Tailwind CSS, React Router, Leaflet (Map), Socket.io-client.
*   **Backend:** Node.js, Express, PostgreSQL, Socket.io (real-time updates).
*   **Authentication:** JWT (JSON Web Tokens) with bcrypt password hashing.

## 📦 Running the Application

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)

### 2. Database Setup
1. Create a PostgreSQL database named `parkshare`.
2. Run the `backend/db/schema.sql` file to create the tables.
3. Run the `backend/db/seed.sql` file to populate demo data (includes hashed passwords).

### 3. Backend Setup
```bash
cd backend
npm install
# Create a .env file based on .env.example
npm start
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🔐 Demo Credentials

If you seeded the database using `seed.sql`, you can log in with:

*   **Driver:** `asha.driver@example.com`
*   **Host:** `vikram.host@example.com`
*   **Admin:** `admin@parkshare.app`
*   **Password:** `Password123!` (for all accounts)

## 💡 Frontend-Only Demo Mode
If you start the frontend *without* starting the backend, it will automatically enter **Demo Mode**. This will load mock data onto the map and allow you to view the UI and interact with map filters without a database connection.
