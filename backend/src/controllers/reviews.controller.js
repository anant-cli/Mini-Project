import { z } from 'zod';
import { query } from '../config/db.js';
import {
  addLocationReview, addDriverReview, getReviewsForLocation,
  findLocationReviewForBooking, findDriverReviewForBooking,
} from '../models/review.model.js';
import { recomputeUserRating } from '../models/user.model.js';
import { findBookingById } from '../models/booking.model.js';
import { ApiError } from '../middleware/errorHandler.js';

const reviewSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// Driver reviews the parking space after a completed booking.
export const reviewLocation = async (req, res, next) => {
  try {
    const data = reviewSchema.parse(req.body);
    const booking = await findBookingById(data.booking_id);
    if (!booking) throw new ApiError(404, 'Booking not found');
    if (booking.user_id !== req.user.user_id) throw new ApiError(403, 'Not your booking');
    if (booking.status !== 'completed') throw new ApiError(400, 'Can only review completed bookings');
    const existing = await findLocationReviewForBooking(data.booking_id);
    if (existing) throw new ApiError(409, 'This booking already has a location review');

    const { rows } = await query(`SELECT location_id FROM slots WHERE slot_id = $1`, [booking.slot_id]);

    const review = await addLocationReview({
      booking_id: data.booking_id,
      location_id: rows[0].location_id,
      author_id: req.user.user_id,
      rating: data.rating,
      comment: data.comment,
    });
    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
};

// Host reviews the driver — this is the "mutual trust" half described in
// Section 4.4: bad-actor drivers become visible to future hosts.
export const reviewDriver = async (req, res, next) => {
  try {
    const data = reviewSchema.parse(req.body);
    const booking = await findBookingById(data.booking_id);
    if (!booking) throw new ApiError(404, 'Booking not found');
    if (booking.status !== 'completed') throw new ApiError(400, 'Can only review completed bookings');
    const existing = await findDriverReviewForBooking(data.booking_id);
    if (existing) throw new ApiError(409, 'This booking already has a driver review');

    const { rows } = await import('../config/db.js').then(m => m.query(
      `SELECT l.owner_id FROM slots s
       JOIN locations l ON l.location_id = s.location_id
       WHERE s.slot_id = $1`,
      [booking.slot_id]
    ));
    if (!rows[0] || rows[0].owner_id !== req.user.user_id) throw new ApiError(403, 'Not your hosted booking');

    const { rows: ownerRows } = await query(
      `SELECT l.owner_id FROM locations l
       JOIN slots s ON s.location_id = l.location_id
       WHERE s.slot_id = $1`,
      [booking.slot_id]
    );
    if (ownerRows[0]?.owner_id !== req.user.user_id) {
      throw new ApiError(403, 'You can only review drivers who booked your listing');
    }

    const { rows } = await query(
      `SELECT l.owner_id FROM locations l
       JOIN slots s ON s.location_id = l.location_id
       WHERE s.slot_id = $1`,
      [booking.slot_id]
    );
    if (!rows[0] || rows[0].owner_id !== req.user.user_id) throw new ApiError(403, 'Not your hosted booking');

    const review = await addDriverReview({
      booking_id: data.booking_id,
      reviewed_user: booking.user_id,
      author_id: req.user.user_id,
      rating: data.rating,
      comment: data.comment,
    });
    await recomputeUserRating(booking.user_id);
    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
};

export const listLocationReviews = async (req, res, next) => {
  try {
    const reviews = await getReviewsForLocation(req.params.locationId);
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
};
