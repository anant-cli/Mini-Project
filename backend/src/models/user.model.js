import { query } from '../config/db.js';

export const createUser = async ({ name, email, passwordHash, phone, role }) => {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, phone, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING user_id, name, email, phone, role, avg_rating, id_verified, is_suspended, created_at`,
    [name, email, passwordHash, phone, role || 'driver']
  );
  return rows[0];
};

export const findUserByEmail = async (email) => {
  const { rows } = await query(`SELECT * FROM users WHERE email = $1`, [email]);
  return rows[0];
};

export const findUserById = async (userId) => {
  const { rows } = await query(
    `SELECT user_id, name, email, phone, role, avg_rating, id_verified, is_suspended, created_at
     FROM users WHERE user_id = $1`,
    [userId]
  );
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
