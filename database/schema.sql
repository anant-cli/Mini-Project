CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TYPE user_role         AS ENUM ('driver', 'host', 'business_host', 'admin');
CREATE TYPE slot_status       AS ENUM ('available', 'booked', 'occupied', 'disabled');
CREATE TYPE vehicle_type      AS ENUM ('two_wheeler', 'car', 'suv', 'ev_car', 'ev_two_wheeler');
CREATE TYPE booking_status    AS ENUM ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'disputed');
CREATE TYPE checkin_method    AS ENUM ('qr', 'geofence_auto', 'manual_override');
CREATE TYPE payment_status    AS ENUM ('authorized', 'captured', 'refunded', 'failed');
CREATE TYPE payout_status     AS ENUM ('held', 'released', 'reversed');
CREATE TYPE charger_status    AS ENUM ('available', 'in_use', 'out_of_service');
CREATE TYPE kyc_status        AS ENUM ('unsubmitted', 'pending', 'approved', 'rejected');
CREATE TYPE otp_purpose       AS ENUM ('email_verify', 'password_reset');
CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(120) NOT NULL,
    email           VARCHAR(160) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    role            user_role NOT NULL DEFAULT 'driver',
    avg_rating      NUMERIC(2,1) DEFAULT 5.0 CHECK (avg_rating BETWEEN 0 AND 5),
    id_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    kyc_status      kyc_status NOT NULL DEFAULT 'unsubmitted',
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspended    BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts SMALLINT NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
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
    owner_consent_confirmed_at TIMESTAMPTZ,
    is_verified          BOOLEAN NOT NULL DEFAULT FALSE,
    surge_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_locations_geo ON locations (latitude, longitude);
CREATE INDEX idx_locations_owner ON locations (owner_id);
CREATE INDEX idx_locations_verified ON locations (is_verified);
CREATE TABLE slots (
    slot_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id  UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    slot_number  VARCHAR(20) NOT NULL,
    status       slot_status NOT NULL DEFAULT 'available',
    vehicle_type vehicle_type NOT NULL DEFAULT 'car',
    UNIQUE (location_id, slot_number)
);
CREATE INDEX idx_slots_location_status ON slots (location_id, status);
CREATE TABLE ev_chargers (
    charger_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id     UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    connector_type  VARCHAR(20) NOT NULL,
    current_type    VARCHAR(5)  NOT NULL DEFAULT 'AC',
    power_kw        NUMERIC(5,2) NOT NULL,
    price_per_kwh   NUMERIC(6,2) NOT NULL,
    status          charger_status NOT NULL DEFAULT 'available'
);
CREATE INDEX idx_ev_chargers_location ON ev_chargers (location_id);
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
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE TABLE payments (
    payment_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id       UUID NOT NULL UNIQUE REFERENCES bookings(booking_id) ON DELETE CASCADE,
    amount           NUMERIC(9,2) NOT NULL,
    payment_mode     VARCHAR(30) NOT NULL DEFAULT 'card',
    payment_status   payment_status NOT NULL DEFAULT 'authorized',
    payout_status    payout_status NOT NULL DEFAULT 'held',
    gateway_ref       VARCHAR(120),
    transaction_time TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE reviews (
    review_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id    UUID NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    location_id   UUID REFERENCES locations(location_id) ON DELETE CASCADE,
    reviewed_user UUID REFERENCES users(user_id) ON DELETE CASCADE,
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
CREATE INDEX idx_reviews_location ON reviews (location_id);
CREATE INDEX idx_reviews_reviewed_user ON reviews (reviewed_user);

CREATE TABLE favorites (
    user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, location_id)
);
CREATE INDEX idx_favorites_location ON favorites (location_id);
CREATE TABLE disputes (
    dispute_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id   UUID NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    raised_by    UUID REFERENCES users(user_id) ON DELETE SET NULL,
    reason       TEXT NOT NULL,
    resolution   TEXT,
    resolved_by  UUID REFERENCES users(user_id) ON DELETE SET NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at  TIMESTAMPTZ
);
CREATE INDEX idx_disputes_booking ON disputes (booking_id);
CREATE INDEX idx_disputes_status ON disputes (status) WHERE status = 'open';
CREATE TABLE kyc_submissions (
    kyc_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    id_document_image   TEXT NOT NULL,
    selfie_image        TEXT NOT NULL,
    consent_type        VARCHAR(40) NOT NULL,
    consent_version     VARCHAR(20) NOT NULL,
    consent_accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    consent_ip          VARCHAR(64),
    status              kyc_status NOT NULL DEFAULT 'pending',
    rejection_reason    TEXT,
    reviewed_by         UUID REFERENCES users(user_id) ON DELETE SET NULL,
    reviewed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_kyc_user ON kyc_submissions (user_id);
CREATE INDEX idx_kyc_pending ON kyc_submissions (status) WHERE status = 'pending';
CREATE TABLE otp_tokens (
    otp_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    purpose      otp_purpose NOT NULL,
    token_hash   VARCHAR(255) NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    attempts     SMALLINT NOT NULL DEFAULT 0,
    consumed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_user_purpose ON otp_tokens (user_id, purpose);
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
