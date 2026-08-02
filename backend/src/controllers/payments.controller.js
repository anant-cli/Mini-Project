import { query } from '../config/db.js';
import { getPaymentByBooking } from '../models/payment.model.js';
import { ApiError } from '../middleware/errorHandler.js';

export const getPaymentForBooking = async (req, res, next) => {
  try {
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
    const { rows } = await query(
      `INSERT INTO disputes (booking_id, raised_by, reason) VALUES ($1,$2,$3) RETURNING *`,
      [booking_id, req.user.user_id, reason]
    );
    await query(`UPDATE bookings SET status = 'disputed' WHERE booking_id = $1`, [booking_id]);
    res.status(201).json({ dispute: rows[0] });
  } catch (err) {
    next(err);
  }
};
