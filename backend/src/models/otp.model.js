import { query } from '../config/db.js';

// Invalidate any earlier unconsumed codes for the same purpose before
// issuing a new one, so only the most recently sent code is ever valid.
export const createOtp = async (userId, purpose, tokenHash, expiresAt) => {
  await query(
    `UPDATE otp_tokens SET consumed_at = now()
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [userId, purpose]
  );
  const { rows } = await query(
    `INSERT INTO otp_tokens (user_id, purpose, token_hash, expires_at)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, purpose, tokenHash, expiresAt]
  );
  return rows[0];
};

export const getActiveOtp = async (userId, purpose) => {
  const { rows } = await query(
    `SELECT * FROM otp_tokens
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose]
  );
  return rows[0];
};

// Used to enforce a resend cooldown regardless of whether the previous
// code has expired or been consumed yet.
export const getMostRecentOtp = async (userId, purpose) => {
  const { rows } = await query(
    `SELECT * FROM otp_tokens WHERE user_id = $1 AND purpose = $2
     ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose]
  );
  return rows[0];
};

export const incrementOtpAttempts = async (otpId) => {
  await query(`UPDATE otp_tokens SET attempts = attempts + 1 WHERE otp_id = $1`, [otpId]);
};

export const consumeOtp = async (otpId) => {
  await query(`UPDATE otp_tokens SET consumed_at = now() WHERE otp_id = $1`, [otpId]);
};
