import { query } from '../config/db.js';

export const createUser = async ({ name, email, passwordHash, phone, role }) => {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, phone, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING user_id, name, email, phone, role, avg_rating, id_verified, kyc_status, email_verified, is_suspended, created_at`,
    [name, email, passwordHash, phone, role || 'driver']
  );
  return rows[0];
};

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
    `SELECT user_id, name, email, phone, role, avg_rating, id_verified, kyc_status, email_verified,
            is_suspended, failed_login_attempts, locked_until, created_at
     FROM users WHERE user_id = $1`,
    [userId]
  );
  return rows[0];
};

export const findUserByIdWithPassword = async (userId) => {
  const { rows } = await query(`SELECT * FROM users WHERE user_id = $1`, [userId]);
  return rows[0];
};

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

export const setEmailVerified = async (userId) => {
  await query(`UPDATE users SET email_verified = true WHERE user_id = $1`, [userId]);
};

export const updatePasswordHash = async (userId, passwordHash) => {
  await query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE user_id = $1`, [userId, passwordHash]);
};

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export const registerFailedLogin = async (userId) => {
  const { rows } = await query(
    `UPDATE users SET failed_login_attempts = failed_login_attempts + 1,
        locked_until = CASE
          WHEN failed_login_attempts + 1 >= $2 THEN now() + ($3 || ' minutes')::interval
          ELSE locked_until
        END
     WHERE user_id = $1
     RETURNING failed_login_attempts, locked_until`,
    [userId, MAX_FAILED_LOGIN_ATTEMPTS, LOCKOUT_MINUTES]
  );
  return rows[0];
};

export const clearFailedLogins = async (userId) => {
  await query(`UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = $1`, [userId]);
};
