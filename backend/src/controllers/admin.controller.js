import { query, withTransaction } from '../config/db.js';
import { reversePayment } from '../models/payment.model.js';
import { ApiError } from '../middleware/errorHandler.js';

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
    res.json({
      revenue: revenue[0],
      bookingCounts,
      userCounts,
      config: { platform_commission_percent: Number(process.env.PLATFORM_COMMISSION_PERCENT || 15) },
    });
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
    const { resolution, outcome = 'no_action' } = req.body;
    if (!['refund_driver', 'no_action'].includes(outcome)) {
      throw new ApiError(400, 'Invalid dispute outcome');
    }

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE disputes SET status = 'resolved', resolution = $2, resolved_by = $3, resolved_at = now()
         WHERE dispute_id = $1 RETURNING *`,
        [req.params.id, resolution?.trim().replace(/\s+/g, ' '), req.user.user_id]
      );
      const dispute = rows[0];
      let payment = null;
      let booking = null;
      if (dispute && outcome === 'refund_driver') {
        payment = await reversePayment(dispute.booking_id, client);
        const { rows: bookingRows } = await client.query(
          `UPDATE bookings
           SET status = CASE WHEN status = 'completed' THEN status ELSE 'cancelled' END
           WHERE booking_id = $1 RETURNING *`,
          [dispute.booking_id]
        );
        booking = bookingRows[0];
      }
      return { dispute, payment, booking };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const suspendUser = async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE users SET is_suspended = true WHERE user_id = $1 RETURNING user_id, name, email, role, is_suspended`,
      [req.params.id]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
};

export const unsuspendUser = async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE users SET is_suspended = false WHERE user_id = $1 RETURNING user_id, name, email, role, is_suspended`,
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
      `SELECT user_id, name, email, phone, role, id_verified, is_suspended, avg_rating, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
};
