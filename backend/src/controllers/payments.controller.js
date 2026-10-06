import { query, withTransaction } from '../config/db.js';
import { getPaymentByBooking } from '../models/payment.model.js';
import { findBookingById } from '../models/booking.model.js';
import { ApiError } from '../middleware/errorHandler.js';

const assertCanViewBookingPayment = async (req, booking) => {
  if (req.user.role === 'admin') return;
  if (booking.user_id === req.user.user_id) return;

  const { rows } = await query(
    `SELECT l.owner_id FROM locations l
     JOIN slots s ON s.location_id = l.location_id
     WHERE s.slot_id = $1`,
    [booking.slot_id]
  );
  if (rows[0]?.owner_id === req.user.user_id) return;

  throw new ApiError(403, 'You do not have access to this booking');
};

export const getPaymentForBooking = async (req, res, next) => {
  try {
    const booking = await findBookingById(req.params.bookingId);
    if (!booking) throw new ApiError(404, 'No payment found for this booking');
    await assertCanViewBookingPayment(req, booking);

    const payment = await getPaymentByBooking(req.params.bookingId);
    if (!payment) throw new ApiError(404, 'No payment found for this booking');
    res.json({ payment });
  } catch (err) {
    next(err);
  }
};

export const raiseDispute = async (req, res, next) => {
  try {
    const { booking_id, reason } = req.body;
    if (!booking_id || !reason?.trim()) {
      throw new ApiError(400, 'booking_id and reason are required');
    }

    const booking = await findBookingById(booking_id);
    if (!booking) throw new ApiError(404, 'Booking not found');
    await assertCanViewBookingPayment(req, booking);

    if (booking.status === 'cancelled') throw new ApiError(400, 'Cancelled bookings cannot be disputed');

    const dispute = await withTransaction(async (client) => {
      await client.query(`SELECT 1 FROM bookings WHERE booking_id = $1 FOR UPDATE`, [booking_id]);
      const { rows: open } = await client.query(
        `SELECT 1 FROM disputes WHERE booking_id = $1 AND status = 'open' LIMIT 1`,
        [booking_id]
      );
      if (open.length) throw new ApiError(409, 'There is already an open dispute for this booking');
      const { rows } = await client.query(
        `INSERT INTO disputes (booking_id, raised_by, reason) VALUES ($1,$2,$3) RETURNING *`,
        [booking_id, req.user.user_id, reason.trim().replace(/\s+/g, ' ').slice(0, 2000)]
      );
      await client.query(`UPDATE bookings SET status = 'disputed' WHERE booking_id = $1`, [booking_id]);
      return rows[0];
    });
    res.status(201).json({ dispute });
  } catch (err) {
    next(err);
  }
};
