-- ============================================================
-- ParkSlot — PostgreSQL Schema
-- Peer-to-peer smart parking marketplace
-- Enable PostGIS if available (optional — Haversine fallback
-- is used in application code if this extension is absent).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS postgis; -- uncomment if PostGIS is installed

-- ---------- ENUM TYPES ----------
CREATE TYPE user_role         AS ENUM ('driver', 'host', 'business_host', 'admin');
CREATE TYPE slot_status       AS ENUM ('available', 'booked', 'occupied', 'disabled');
CREATE TYPE vehicle_type      AS ENUM ('two_wheeler', 'car', 'suv', 'ev_car', 'ev_two_wheeler');
CREATE TYPE booking_status    AS ENUM ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'disputed');
CREATE TYPE checkin_method    AS ENUM ('qr', 'geofence_auto', 'manual_override');
CREATE TYPE payment_status    AS ENUM ('authorized', 'captured', 'refunded', 'failed');
CREATE TYPE payout_status     AS ENUM ('held', 'released', 'reversed');
CREATE TYPE charger_status    AS ENUM ('available', 'in_use', 'out_of_service');

-- ---------- USERS ----------
CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(120) NOT NULL,
    email           VARCHAR(160) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    role            user_role NOT NULL DEFAULT 'driver',
    avg_rating      NUMERIC(2,1) DEFAULT 5.0 CHECK (avg_rating BETWEEN 0 AND 5),
    id_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- LOCATIONS (listed by hosts) ----------
CREATE TABLE locations (
    location_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name                 VARCHAR(160) NOT NULL,
    address              TEXT NOT NULL,
    latitude             DOUBLE PRECISION NOT NULL,
    longitude            DOUBLE PRECISION NOT NULL,
    total_slots          INTEGER NOT NULL DEFAULT 1,
    price_per_hour       NUMERIC(8,2) NOT NULL,
    vehicle_types_allowed vehicle_type[] NOT NULL DEFAULT ARRAY['car']::vehicle_type[],
    has_ev_charging      BOOLEAN NOT NULL DEFAULT FALSE,
    operating_hours      JSONB DEFAULT '{"open": "00:00", "close": "23:59"}',
    photos               TEXT[],
    is_verified          BOOLEAN NOT NULL DEFAULT FALSE,
    surge_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_locations_geo ON locations (latitude, longitude);

-- ---------- SLOTS ----------
CREATE TABLE slots (
    slot_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id  UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    slot_number  VARCHAR(20) NOT NULL,
    status       slot_status NOT NULL DEFAULT 'available',
    vehicle_type vehicle_type NOT NULL DEFAULT 'car',
    UNIQUE (location_id, slot_number)
);

-- ---------- EV CHARGERS ----------
CREATE TABLE ev_chargers (
    charger_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id     UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    connector_type  VARCHAR(20) NOT NULL, -- Type-1, Type-2, CCS, CHAdeMO
    current_type    VARCHAR(5)  NOT NULL DEFAULT 'AC', -- AC / DC
    power_kw        NUMERIC(5,2) NOT NULL,
    price_per_kwh   NUMERIC(6,2) NOT NULL,
    status          charger_status NOT NULL DEFAULT 'available'
);

-- ---------- BOOKINGS ----------
CREATE TABLE bookings (
    booking_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    slot_id          UUID NOT NULL REFERENCES slots(slot_id) ON DELETE CASCADE,
    vehicle_number   VARCHAR(20) NOT NULL,
    start_time       TIMESTAMPTZ NOT NULL,
    end_time         TIMESTAMPTZ NOT NULL,
    checkin_time     TIMESTAMPTZ,
    checkout_time    TIMESTAMPTZ,
    checkin_method   checkin_method,
    qr_token         VARCHAR(64) UNIQUE NOT NULL,
    estimated_amount NUMERIC(9,2) NOT NULL,
    total_amount     NUMERIC(9,2),
    overtime_amount  NUMERIC(9,2) DEFAULT 0,
    status           booking_status NOT NULL DEFAULT 'pending',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_window CHECK (end_time > start_time)
);
CREATE INDEX idx_bookings_slot_time ON bookings (slot_id, start_time, end_time);
CREATE INDEX idx_bookings_user ON bookings (user_id);

-- Prevent double-booking of an overlapping window on the same slot
-- (requires btree_gist for exclusion constraint; using a partial unique
--  approach + application-level transaction lock as the primary guard,
--  documented in booking.model.js)

-- ---------- PAYMENTS ----------
CREATE TABLE payments (
    payment_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id       UUID NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    amount           NUMERIC(9,2) NOT NULL,
    payment_mode     VARCHAR(30) NOT NULL DEFAULT 'card',
    payment_status   payment_status NOT NULL DEFAULT 'authorized',
    payout_status    payout_status NOT NULL DEFAULT 'held',
    gateway_ref       VARCHAR(120),
    transaction_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- REVIEWS (bidirectional: location reviews + driver reviews) ----------
CREATE TABLE reviews (
    review_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id    UUID NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    location_id   UUID REFERENCES locations(location_id) ON DELETE CASCADE,
    reviewed_user UUID REFERENCES users(user_id) ON DELETE CASCADE, -- set when a host rates a driver
    author_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (location_id IS NOT NULL OR reviewed_user IS NOT NULL)
);
CREATE UNIQUE INDEX idx_reviews_one_location_review_per_booking
    ON reviews (booking_id)
    WHERE location_id IS NOT NULL;
CREATE UNIQUE INDEX idx_reviews_one_driver_review_per_booking
    ON reviews (booking_id)
    WHERE reviewed_user IS NOT NULL;

-- ---------- FAVORITES ----------
CREATE TABLE favorites (
    user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, location_id)
);

-- ---------- DISPUTES ----------
CREATE TABLE disputes (
    dispute_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id   UUID NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    raised_by    UUID NOT NULL REFERENCES users(user_id),
    reason       TEXT NOT NULL,
    resolution   TEXT,
    resolved_by  UUID REFERENCES users(user_id),
    status       VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at  TIMESTAMPTZ
);

-- ---------- Helper: haversine distance function (fallback if no PostGIS) ----------
CREATE OR REPLACE FUNCTION haversine_km(lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
                                         lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    r DOUBLE PRECISION := 6371;
    dlat DOUBLE PRECISION := radians(lat2 - lat1);
    dlon DOUBLE PRECISION := radians(lon2 - lon1);
    a DOUBLE PRECISION;
BEGIN
    a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)^2;
    RETURN r * 2 * asin(sqrt(a));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Example nearby-search query (used by listings.model.js):
-- SELECT *, haversine_km(:lat, :lng, latitude, longitude) AS distance_km
-- FROM locations
-- WHERE is_verified = true
-- AND haversine_km(:lat, :lng, latitude, longitude) < :radius_km
-- ORDER BY distance_km ASC;
