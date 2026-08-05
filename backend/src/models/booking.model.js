import { query } from '../config/db.js';

export const createBookingRow = async (client, data) => {
  const {
    user_id, slot_id, vehicle_number, start_time, end_time,
    qr_token, estimated_amount,
  } = data;
  const { rows } = await client.query(
    `INSERT INTO bookings
      (user_id, slot_id, vehicle_number, start_time, end_time, qr_token, estimated_amount, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed')
     RETURNING *`,
    [user_id, slot_id, vehicle_number, start_time, end_time, qr_token, estimated_amount]
  );
  return rows[0];
};

export const findBookingByQrToken = async (qrToken) => {
  const { rows } = await query(`SELECT * FROM bookings WHERE qr_token = $1`, [qrToken]);
  return rows[0];
};

export const findBookingById = async (bookingId) => {
  const { rows } = await query(`SELECT * FROM bookings WHERE booking_id = $1`, [bookingId]);
  return rows[0];
};

export const getBookingsForUser = async (userId) => {
  const { rows } = await query(
    `SELECT b.*, l.name AS location_name, l.address,
            lr.review_id AS location_review_id
     FROM bookings b
     JOIN slots s ON s.slot_id = b.slot_id
     JOIN locations l ON l.location_id = s.location_id
     LEFT JOIN reviews lr ON lr.booking_id = b.booking_id AND lr.location_id IS NOT NULL
     WHERE b.user_id = $1
     ORDER BY b.start_time DESC`,
    [userId]
  );
  return rows;
};

export const getBookingsForHost = async (ownerId) => {
  const { rows } = await query(
    `SELECT b.*, l.location_id, l.name AS location_name, l.address, s.slot_number,
            u.name AS driver_name, u.email AS driver_email,
            dr.review_id AS driver_review_id
     FROM bookings b
     JOIN slots s ON s.slot_id = b.slot_id
     JOIN locations l ON l.location_id = s.location_id
     JOIN users u ON u.user_id = b.user_id
     LEFT JOIN reviews dr ON dr.booking_id = b.booking_id AND dr.reviewed_user IS NOT NULL
     WHERE l.owner_id = $1
     ORDER BY b.start_time DESC`,
    [ownerId]
  );
  return rows;
};

export const recordCheckin = async (bookingId, method = 'qr') => {
  const { rows } = await query(
    `UPDATE bookings
     SET checkin_time = now(), checkin_method = $2, status = 'checked_in'
     WHERE booking_id = $1 RETURNING *`,
    [bookingId, method]
  );
  return rows[0];
};

// Computes the final bill from the *actual* checkin→checkout duration,
// charging overtime per minute past the booked end_time — see Section 4.2.
export const recordCheckout = async (bookingId, pricePerHour) => {
  const booking = await findBookingById(bookingId);
  if (!booking) throw new Error('Booking not found');

  const checkoutTime = new Date();
  const checkinTime = new Date(booking.checkin_time);
  const bookedEnd = new Date(booking.end_time);

  const actualMinutes = Math.max(1, Math.ceil((checkoutTime - checkinTime) / 60000));
  const baseAmount = Number(booking.estimated_amount);

  let overtimeAmount = 0;
  if (checkoutTime > bookedEnd) {
    const overtimeMinutes = Math.ceil((checkoutTime - bookedEnd) / 60000);
    const perMinuteRate = Number(pricePerHour) / 60;
    overtimeAmount = Number((overtimeMinutes * perMinuteRate).toFixed(2));
  }

  const totalAmount = Number((baseAmount + overtimeAmount).toFixed(2));

  const { rows } = await query(
    `UPDATE bookings
     SET checkout_time = $2, total_amount = $3, overtime_amount = $4, status = 'completed'
     WHERE booking_id = $1 RETURNING *`,
    [bookingId, checkoutTime, totalAmount, overtimeAmount]
  );
  return { booking: rows[0], actualMinutes };
};

export const cancelBooking = async (bookingId) => {
  const { rows } = await query(
    `UPDATE bookings SET status = 'cancelled' WHERE booking_id = $1 RETURNING *`,
    [bookingId]
  );
  return rows[0];
};
