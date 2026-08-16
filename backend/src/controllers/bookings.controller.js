import { z } from 'zod';
import { withTransaction, query } from '../config/db.js';
import { lockSlotForUpdate, hasOverlappingBooking, setSlotStatus, countAvailableSlots } from '../models/slot.model.js';
import {
  createBookingRow, findBookingByQrToken, findBookingById,
  getBookingsForUser, getBookingsForHost, recordCheckin, recordCheckout, cancelBooking,
} from '../models/booking.model.js';
import { createHeldPayment, releasePayment } from '../models/payment.model.js';
import { generateQrToken, generateQrDataUrl } from '../utils/qrcode.js';
import { emitSlotUpdate, emitBookingEvent } from '../config/socket.js';
import { ApiError } from '../middleware/errorHandler.js';

export const getQrPass = async (req, res, next) => {
  try {
    const booking = await findBookingById(req.params.id);
    if (!booking) throw new ApiError(404, 'Booking not found');
    if (booking.user_id !== req.user.user_id) throw new ApiError(403, 'Not your booking');

    const qrDataUrl = await generateQrDataUrl(booking.qr_token);
    res.json({ booking, qr_pass: qrDataUrl });
  } catch (err) {
    next(err);
  }
};

const bookingSchema = z.object({
  slot_id: z.string().uuid(),
  vehicle_number: z.string().min(3).max(20),
  start_time: z.string().max(40),
  end_time: z.string().max(40),
});

const assertCanManageBooking = async (req, booking) => {
  if (req.user.role === 'admin') return;

  const { rows } = await query(
    `SELECT l.owner_id
     FROM locations l
     JOIN slots s ON s.location_id = l.location_id
     WHERE s.slot_id = $1`,
    [booking.slot_id]
  );

  if (rows[0]?.owner_id === req.user.user_id) return;
  throw new ApiError(403, 'You do not have access to manage this booking');
};

// Step 1-4 of the "How a request flows end-to-end" example in the plan:
// lock the slot row, verify no overlapping booking exists, hold funds,
// write the booking, generate the QR pass.
export const createBooking = async (req, res, next) => {
  try {
    const data = bookingSchema.parse(req.body);
    const startTime = new Date(data.start_time);
    const endTime = new Date(data.end_time);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new ApiError(400, 'start_time and end_time must be valid dates');
    }
    if (startTime.getTime() < Date.now() - 2 * 60 * 1000) {
      throw new ApiError(400, 'Start time cannot be in the past');
    }
    if (endTime <= startTime) throw new ApiError(400, 'end_time must be after start_time');

    const result = await withTransaction(async (client) => {
      const slot = await lockSlotForUpdate(client, data.slot_id);
      if (!slot) throw new ApiError(404, 'Slot not found');
      if (slot.status === 'disabled') throw new ApiError(400, 'Slot is not available for booking');

      const overlap = await hasOverlappingBooking(client, data.slot_id, startTime, endTime);
      if (overlap) throw new ApiError(409, 'This slot is already booked for the selected time window');

      // Fetch price from the parent location to compute the fare preview.
      const { rows: locRows } = await client.query(
        `SELECT l.price_per_hour, l.location_id FROM locations l
         JOIN slots s ON s.location_id = l.location_id WHERE s.slot_id = $1`,
        [data.slot_id]
      );
      if (!locRows[0]) throw new ApiError(404, 'Location not found for slot');
      const pricePerHour = Number(locRows[0].price_per_hour);
      const hours = (endTime - startTime) / 3600000;
      const estimatedAmount = Number((pricePerHour * hours).toFixed(2));

      const qrToken = generateQrToken();
      const booking = await createBookingRow(client, {
        user_id: req.user.user_id,
        slot_id: data.slot_id,
        vehicle_number: data.vehicle_number,
        start_time: startTime,
        end_time: endTime,
        qr_token: qrToken,
        estimated_amount: estimatedAmount,
      });

      await setSlotStatus(data.slot_id, 'booked', client);
      const payment = await createHeldPayment(client, {
        booking_id: booking.booking_id,
        amount: estimatedAmount,
        payment_mode: 'card',
      });

      const availableSlots = await countAvailableSlots(locRows[0].location_id, client);

      return { booking, payment, locationId: locRows[0].location_id, availableSlots, pricePerHour };
    });

    const qrDataUrl = await generateQrDataUrl(result.booking.qr_token);

    emitSlotUpdate(result.locationId, {
      slot_id: data.slot_id,
      status: 'booked',
      available_slots: result.availableSlots,
    });

    res.status(201).json({
      booking: result.booking,
      payment: result.payment,
      qr_pass: qrDataUrl,
    });
  } catch (err) {
    next(err);
  }
};

export const listMyBookings = async (req, res, next) => {
  try {
    const bookings = await getBookingsForUser(req.user.user_id);
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
};

export const listHostedBookings = async (req, res, next) => {
  try {
    const bookings = await getBookingsForHost(req.user.user_id);
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
};

export const listHostBookings = listHostedBookings;


// Host/staff scans the driver's QR at the gate on arrival.
export const checkin = async (req, res, next) => {
  try {
    const { qr_token } = req.body;
    const booking = await findBookingByQrToken(qr_token);
    if (!booking) throw new ApiError(404, 'Invalid QR code');
    if (booking.status !== 'confirmed') throw new ApiError(400, `Booking is not in a checkin-eligible state (current: ${booking.status})`);
    await assertCanManageBooking(req, booking);

    const updated = await recordCheckin(booking.booking_id, 'qr');
    await setSlotStatus(booking.slot_id, 'occupied');

    emitBookingEvent(booking.booking_id, { type: 'checked_in', checkin_time: updated.checkin_time });
    res.json({ booking: updated });
  } catch (err) {
    next(err);
  }
};

// Host/staff scans again on departure — computes final bill (incl.
// overtime) and releases the escrowed payout to the host.
export const checkout = async (req, res, next) => {
  try {
    const { qr_token } = req.body;
    const booking = await findBookingByQrToken(qr_token);
    if (!booking) throw new ApiError(404, 'Invalid QR code');
    if (booking.status !== 'checked_in') throw new ApiError(400, 'Booking has not been checked in yet');
    await assertCanManageBooking(req, booking);

    const { rows } = await query(
      `SELECT l.price_per_hour, l.location_id FROM locations l
       JOIN slots s ON s.location_id = l.location_id WHERE s.slot_id = $1`,
      [booking.slot_id]
    );
    if (!rows[0]) throw new ApiError(404, 'Location not found for slot');
    const pricePerHour = Number(rows[0].price_per_hour);

    const { booking: completed, actualMinutes } = await recordCheckout(booking.booking_id, pricePerHour);
    await setSlotStatus(booking.slot_id, 'available');
    const availableSlots = await countAvailableSlots(rows[0].location_id);

    const commissionPercent = Number(process.env.PLATFORM_COMMISSION_PERCENT || 15);
    const { platformCut, hostPayout } = await releasePayment(booking.booking_id, completed.total_amount, commissionPercent);

    emitSlotUpdate(rows[0].location_id, {
      slot_id: booking.slot_id,
      status: 'available',
      available_slots: availableSlots,
    });
    emitBookingEvent(booking.booking_id, {
      type: 'checked_out',
      total_amount: completed.total_amount,
      overtime_amount: completed.overtime_amount,
    });

    res.json({ booking: completed, actualMinutes, platformCut, hostPayout });
  } catch (err) {
    next(err);
  }
};

export const cancel = async (req, res, next) => {
  try {
    const booking = await findBookingById(req.params.id);
    if (!booking) throw new ApiError(404, 'Booking not found');
    if (booking.user_id !== req.user.user_id) throw new ApiError(403, 'Not your booking');
    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new ApiError(400, 'Only pending/confirmed bookings can be cancelled');
    }
    const cancelled = await cancelBooking(booking.booking_id);
    await setSlotStatus(booking.slot_id, 'available');
    const { rows } = await query(
      `SELECT location_id FROM slots WHERE slot_id = $1`,
      [booking.slot_id]
    );
    if (rows[0]) {
      const availableSlots = await countAvailableSlots(rows[0].location_id);
      emitSlotUpdate(rows[0].location_id, {
        slot_id: booking.slot_id,
        status: 'available',
        available_slots: availableSlots,
      });
    }
    res.json({ booking: cancelled });
  } catch (err) {
    next(err);
  }
};
