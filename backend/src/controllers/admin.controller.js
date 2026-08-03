import { query } from '../config/db.js';

export const platformReport = async (req, res, next) => {
  try {
    const { rows: revenue } = await query(
      `SELECT COALESCE(SUM(amount),0) AS gross_volume,
              COUNT(*) AS total_transactions
       FROM payments WHERE payment_status = 'captured'`
    );
    const { rows: bookingCounts } = await query(
      `SELECT status, COUNT(*) FROM bookings GROUP BY status`
    );
    const { rows: userCounts } = await query(
      `SELECT role, COUNT(*) FROM users GROUP BY role`
    );
    res.json({ revenue: revenue[0], bookingCounts, userCounts });
  } catch (err) {
    next(err);
  }
};

export const listDisputes = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT d.*, b.checkin_time, b.checkout_time, b.total_amount, b.vehicle_number
       FROM disputes d JOIN bookings b ON b.booking_id = d.booking_id
       WHERE d.status = 'open' ORDER BY d.created_at ASC`
    );
    res.json({ disputes: rows });
  } catch (err) {
    next(err);
  }
};

export const resolveDispute = async (req, res, next) => {
  try {
    const { resolution } = req.body;
    const { rows } = await query(
      `UPDATE disputes SET status = 'resolved', resolution = $2, resolved_by = $3, resolved_at = now()
       WHERE dispute_id = $1 RETURNING *`,
      [req.params.id, resolution, req.user.user_id]
    );
    res.json({ dispute: rows[0] });
  } catch (err) {
    next(err);
  }
};

export const suspendUser = async (req, res, next) => {
  try {
    // A minimal "suspend" flag could be added to the users table; kept
    // simple here via id_verified=false to block new bookings/listings.
    const { rows } = await query(
      `UPDATE users SET id_verified = false WHERE user_id = $1 RETURNING user_id, name, email, role, id_verified`,
      [req.params.id]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT user_id, name, email, phone_number, role, id_verified, avg_rating, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
};
