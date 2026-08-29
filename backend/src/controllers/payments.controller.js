import { query } from '../config/db.js';
import { getPaymentByBooking } from '../models/payment.model.js';
import { findBookingById } from '../models/booking.model.js';
import { ApiError } from '../middleware/errorHandler.js';

// Only the driver on the booking, the host who owns the location, or an
// admin may view payment details for a booking.
const assertCanViewBookingPayment = async (req, booking) => {
  if (req.user.role === 'admin') return;
  if (booking.user_id === req.user.user_id) return; // the driver

  const { rows } = await query(
    `SELECT l.owner_id FROM locations l
     JOIN slots s ON s.location_id = l.location_id
     WHERE s.slot_id = $1`,
    [booking.slot_id]
  );
  if (rows[0]?.owner_id === req.user.user_id) return; // the host

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

// Driver or host raises a dispute — decided using checkin/checkout logs
// as evidence, per Section 4.4 of the plan.
export const raiseDispute = async (req, res, next) => {
  try {
    const { booking_id, reason } = req.body;
    if (!booking_id || !reason?.trim()) {
      throw new ApiError(400, 'booking_id and reason are required');
    }

    const booking = await findBookingById(booking_id);
    if (!booking) throw new ApiError(404, 'Booking not found');
    await assertCanViewBookingPayment(req, booking);

    const { rows } = await query(
      `INSERT INTO disputes (booking_id, raised_by, reason) VALUES ($1,$2,$3) RETURNING *`,
      [booking_id, req.user.user_id, reason.trim().replace(/\s+/g, ' ')]
    );
    await query(`UPDATE bookings SET status = 'disputed' WHERE booking_id = $1`, [booking_id]);
    res.status(201).json({ dispute: rows[0] });
  } catch (err) {
    next(err);
  }
};
