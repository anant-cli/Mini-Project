import { query, withTransaction } from '../config/db.js';
import { reversePayment } from '../models/payment.model.js';
import { setSlotStatus, getEffectiveSlotStatus, countAvailableSlots } from '../models/slot.model.js';
import { emitSlotUpdate } from '../config/socket.js';
import { deleteUser, findUserById } from '../models/user.model.js';
import { ApiError } from '../middleware/errorHandler.js';
import { LISTING_CARD_COLUMNS } from '../models/location.model.js';

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
    const { rows: totals } = await query(
      `SELECT
         (SELECT COUNT(*) FROM users) AS total_users,
         (SELECT COUNT(*) FROM locations) AS total_listings,
         (SELECT COUNT(*) FROM bookings) AS total_bookings,
         (SELECT COUNT(*) FROM disputes WHERE status = 'open') AS open_disputes,
         (SELECT COUNT(*) FROM kyc_submissions WHERE status = 'pending') AS pending_kyc`
    );
    res.json({
      revenue: revenue[0],
      bookingCounts,
      userCounts,
      totals: totals[0],
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
         WHERE dispute_id = $1 AND status = 'open' RETURNING *`,
        [req.params.id, resolution?.trim().replace(/\s+/g, ' ') || null, req.user.user_id]
      );
      const dispute = rows[0];
      if (!dispute) throw new ApiError(404, 'Open dispute not found');

      const { rows: bookingRows } = await client.query(
        `SELECT * FROM bookings WHERE booking_id = $1 FOR UPDATE`,
        [dispute.booking_id]
      );
      const current = bookingRows[0];
      const parkedNow = current.checkin_time && !current.checkout_time;

      let payment = null;
      let nextStatus;
      if (outcome === 'refund_driver') {
        payment = await reversePayment(dispute.booking_id, client);
        nextStatus = current.checkout_time ? 'completed' : 'cancelled';
        if (parkedNow) await setSlotStatus(current.slot_id, 'available', client);
      } else if (current.checkout_time) {
        nextStatus = 'completed';
      } else if (current.checkin_time) {
        nextStatus = 'checked_in';
      } else {
        nextStatus = 'confirmed';
      }

      const { rows: updated } = await client.query(
        `UPDATE bookings SET status = $2 WHERE booking_id = $1 AND status = 'disputed' RETURNING *`,
        [dispute.booking_id, nextStatus]
      );
      const { rows: loc } = await client.query(`SELECT location_id FROM slots WHERE slot_id = $1`, [current.slot_id]);
      return { dispute, payment, booking: updated[0] || current, locationId: loc[0]?.location_id, slotId: current.slot_id };
    });

    if (result.locationId) {
      emitSlotUpdate(result.locationId, {
        slot_id: result.slotId,
        status: await getEffectiveSlotStatus(result.slotId),
        available_slots: await countAvailableSlots(result.locationId),
      });
    }
    res.json({ dispute: result.dispute, payment: result.payment, booking: result.booking });
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
      `SELECT user_id, name, email, phone, role, id_verified, kyc_status, email_verified, is_suspended, avg_rating, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
};

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
      `SELECT ${LISTING_CARD_COLUMNS('l')}, u.name AS host_name, u.email AS host_email,
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
