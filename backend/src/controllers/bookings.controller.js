import { z } from 'zod';
import { withTransaction, query } from '../config/db.js';
import { lockSlotForUpdate, hasOverlappingBooking, setSlotStatus, countAvailableSlots } from '../models/slot.model.js';
import {
  createBookingRow, lockBookingByQrToken, findBookingById,
  getBookingsForUser, getBookingsForHost, recordCheckin, recordCheckout, cancelBooking,
} from '../models/booking.model.js';
import { createHeldPayment, releasePayment, reversePayment } from '../models/payment.model.js';
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

const quoteSchema = z.object({
  slot_id: z.string().uuid(),
  start_time: z.string().max(40),
  end_time: z.string().max(40),
});

const parseBookingWindow = ({ start_time, end_time }) => {
  const startTime = new Date(start_time);
  const endTime = new Date(end_time);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new ApiError(400, 'start_time and end_time must be valid dates');
  }
  if (startTime.getTime() < Date.now() - 2 * 60 * 1000) {
    throw new ApiError(400, 'Start time cannot be in the past');
  }
  if (endTime <= startTime) throw new ApiError(400, 'end_time must be after start_time');
  return { startTime, endTime };
};

const getSlotQuote = async (runner, slotId, startTime, endTime) => {
  const { rows } = await runner(
    `SELECT l.price_per_hour, l.location_id FROM locations l
     JOIN slots s ON s.location_id = l.location_id WHERE s.slot_id = $1`,
    [slotId]
  );
  if (!rows[0]) throw new ApiError(404, 'Location not found for slot');
  const pricePerHour = Number(rows[0].price_per_hour);
  const hours = (endTime - startTime) / 3600000;
  const estimatedAmount = Number((pricePerHour * hours).toFixed(2));
  return { locationId: rows[0].location_id, pricePerHour, hours, estimatedAmount };
};

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

export const createBooking = async (req, res, next) => {
  try {
    const data = bookingSchema.parse(req.body);
    const { startTime, endTime } = parseBookingWindow(data);

    const result = await withTransaction(async (client) => {
      const slot = await lockSlotForUpdate(client, data.slot_id);
      if (!slot) throw new ApiError(404, 'Slot not found');
      if (slot.status === 'disabled') throw new ApiError(400, 'Slot is not available for booking');

      const overlap = await hasOverlappingBooking(client, data.slot_id, startTime, endTime);
      if (overlap) throw new ApiError(409, 'This slot is already booked for the selected time window');

      const quote = await getSlotQuote(client.query.bind(client), data.slot_id, startTime, endTime);

      const qrToken = generateQrToken();
      const booking = await createBookingRow(client, {
        user_id: req.user.user_id,
        slot_id: data.slot_id,
        vehicle_number: data.vehicle_number,
        start_time: startTime,
        end_time: endTime,
        qr_token: qrToken,
        estimated_amount: quote.estimatedAmount,
      });

      await setSlotStatus(data.slot_id, 'booked', client);
      const payment = await createHeldPayment(client, {
        booking_id: booking.booking_id,
        amount: quote.estimatedAmount,
        payment_mode: 'card',
      });

      const availableSlots = await countAvailableSlots(quote.locationId, client);

      return { booking, payment, locationId: quote.locationId, availableSlots, pricePerHour: quote.pricePerHour };
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

export const quoteBooking = async (req, res, next) => {
  try {
    const data = quoteSchema.parse(req.method === 'GET' ? req.query : req.body);
    const { startTime, endTime } = parseBookingWindow(data);
    const quote = await getSlotQuote(query, data.slot_id, startTime, endTime);
    res.json({
      price_per_hour: quote.pricePerHour,
      hours: quote.hours,
      estimated_amount: quote.estimatedAmount,
      total_amount: quote.estimatedAmount,
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
    const bookings = await getBookingsForHost(req.user.user_id, req.user.role === 'admin');
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
};

export const listHostBookings = listHostedBookings;


export const checkin = async (req, res, next) => {
  try {
    const { qr_token } = req.body;
    const { booking, updated } = await withTransaction(async (client) => {
      const booking = await lockBookingByQrToken(client, qr_token);
      if (!booking) throw new ApiError(404, 'Invalid QR code');
      if (booking.status !== 'confirmed') throw new ApiError(400, `Booking is not in a checkin-eligible state (current: ${booking.status})`);
      await assertCanManageBooking(req, booking);
      const updated = await recordCheckin(booking.booking_id, 'qr', client);
      await setSlotStatus(booking.slot_id, 'occupied', client);
      return { booking, updated };
    });

    emitBookingEvent(booking.booking_id, { type: 'checked_in', checkin_time: updated.checkin_time });
    res.json({ booking: updated });
  } catch (err) {
    next(err);
  }
};

export const checkout = async (req, res, next) => {
  try {
    const { qr_token } = req.body;
    const commissionPercent = Number(process.env.PLATFORM_COMMISSION_PERCENT || 15);
    const result = await withTransaction(async (client) => {
      const booking = await lockBookingByQrToken(client, qr_token);
      if (!booking) throw new ApiError(404, 'Invalid QR code');
      if (booking.status !== 'checked_in') throw new ApiError(400, 'Booking has not been checked in yet');
      await assertCanManageBooking(req, booking);

      const quote = await getSlotQuote(client.query.bind(client), booking.slot_id, new Date(booking.start_time), new Date(booking.end_time));
      const { booking: completed, actualMinutes } = await recordCheckout(booking.booking_id, quote.pricePerHour, client, booking);
      await setSlotStatus(booking.slot_id, 'available', client);
      const availableSlots = await countAvailableSlots(quote.locationId, client);
      const { platformCut, hostPayout } = await releasePayment(booking.booking_id, completed.total_amount, commissionPercent, client);

      return { booking, completed, actualMinutes, availableSlots, locationId: quote.locationId, platformCut, hostPayout };
    });

    emitSlotUpdate(result.locationId, {
      slot_id: result.booking.slot_id,
      status: 'available',
      available_slots: result.availableSlots,
    });
    emitBookingEvent(result.booking.booking_id, {
      type: 'checked_out',
      total_amount: result.completed.total_amount,
      overtime_amount: result.completed.overtime_amount,
    });

    res.json({ booking: result.completed, actualMinutes: result.actualMinutes, platformCut: result.platformCut, hostPayout: result.hostPayout });
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
    const result = await withTransaction(async (client) => {
      const cancelled = await cancelBooking(booking.booking_id, client);
      const payment = await reversePayment(booking.booking_id, client);
      await setSlotStatus(booking.slot_id, 'available', client);
      return { cancelled, payment };
    });
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
    res.json({ booking: result.cancelled, payment: result.payment });
  } catch (err) {
    next(err);
  }
};
