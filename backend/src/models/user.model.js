import { query } from '../config/db.js';

export const createUser = async ({ name, email, passwordHash, phone, role }) => {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, phone, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING user_id, name, email, phone, role, avg_rating, id_verified, kyc_status, is_suspended, created_at`,
    [name, email, passwordHash, phone, role || 'driver']
  );
  return rows[0];
};

// Promotes a host to business_host once they cross the commercial threshold
// (more than 2 listings or more than 2 slots total). No-op if already at or
// above business_host, or not a host role.
export const promoteToBusinessHostIfNeeded = async (userId) => {
  const { rows } = await query(
    `SELECT
        (SELECT COUNT(*) FROM locations WHERE owner_id = $1) AS listing_count,
        (SELECT COALESCE(SUM(total_slots), 0) FROM locations WHERE owner_id = $1) AS slot_count,
        role
     FROM users WHERE user_id = $1`,
    [userId]
  );
  const info = rows[0];
  if (!info || info.role !== 'host') return null;
  if (Number(info.listing_count) <= 2 && Number(info.slot_count) <= 2) return null;

  const { rows: updated } = await query(
    `UPDATE users SET role = 'business_host' WHERE user_id = $1 RETURNING user_id, role`,
    [userId]
  );
  return updated[0];
};

export const findUserByEmail = async (email) => {
  const { rows } = await query(`SELECT * FROM users WHERE email = $1`, [email]);
  return rows[0];
};

export const findUserById = async (userId) => {
  const { rows } = await query(
    `SELECT user_id, name, email, phone, role, avg_rating, id_verified, kyc_status, is_suspended, created_at
     FROM users WHERE user_id = $1`,
    [userId]
  );
  return rows[0];
};

// Includes password_hash — only for flows that need to re-verify the
// account owner's password (e.g. self-service account deletion).
export const findUserByIdWithPassword = async (userId) => {
  const { rows } = await query(`SELECT * FROM users WHERE user_id = $1`, [userId]);
  return rows[0];
};

// Deletes the user row. Every table that stores a user's own data
// (locations, slots, bookings, payments, reviews, favorites) is wired
// with ON DELETE CASCADE in schema.sql, so removing the user here is
// enough to remove everything that belongs to them in one transaction-safe
// statement — a host's listings/slots go with their account, and a
// driver's bookings/payments/reviews/favorites go with theirs.
export const deleteUser = async (userId) => {
  const { rows } = await query(`DELETE FROM users WHERE user_id = $1 RETURNING user_id`, [userId]);
  return rows[0];
};

export const recomputeUserRating = async (userId) => {
  await query(
    `UPDATE users SET avg_rating = COALESCE((
        SELECT AVG(rating) FROM reviews WHERE reviewed_user = $1
      ), 5.0)
     WHERE user_id = $1`,
    [userId]
  );
};
