import { query, withTransaction } from '../config/db.js';
import { reversePayment } from '../models/payment.model.js';
import { deleteUser, findUserById } from '../models/user.model.js';
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
    if (!rows[0]) throw new ApiError(404, 'User not found');
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
    if (!rows[0]) throw new ApiError(404, 'User not found');
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

// Admin can remove any account. Same cascade guarantee as self-service
// deletion: a host's listings/slots or a driver's bookings/payments/
// reviews/favorites are removed automatically via ON DELETE CASCADE.
export const deleteUserByAdmin = async (req, res, next) => {
  try {
    if (req.params.id === req.user.user_id) {
      throw new ApiError(400, 'Use account settings to delete your own account.');
    }
    const target = await findUserById(req.params.id);
    if (!target) throw new ApiError(404, 'User not found');

    await deleteUser(req.params.id);
    res.status(200).json({ message: `${target.name}'s account and all associated data have been deleted.` });
  } catch (err) {
    next(err);
  }
};

export const listAllListings = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT l.*, u.name AS host_name, u.email AS host_email,
              (SELECT COUNT(*) FROM slots s WHERE s.location_id = l.location_id) AS total_slot_count
       FROM locations l
       JOIN users u ON u.user_id = l.owner_id
       ORDER BY l.created_at DESC`
    );
    res.json({ listings: rows });
  } catch (err) {
    next(err);
  }
};
