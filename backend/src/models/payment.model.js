import { query } from '../config/db.js';

const mockGatewayRef = () => `SIM-${Math.random().toString(36).slice(2, 10).toUpperCase()}${Date.now().toString(36).toUpperCase().slice(-6)}`;

export const createHeldPayment = async (client, { booking_id, amount, payment_mode, gateway_ref }) => {
  const { rows } = await client.query(
    `INSERT INTO payments (booking_id, amount, payment_mode, payment_status, payout_status, gateway_ref)
     VALUES ($1,$2,$3,'authorized','held',$4)
     RETURNING *`,
    [booking_id, amount, payment_mode || 'card', gateway_ref || mockGatewayRef()]
  );
  return rows[0];
};

// Release payout to host only after checkout is confirmed, adjusting the
// captured amount to the final (possibly overtime-inclusive) total.
export const releasePayment = async (bookingId, finalAmount, commissionPercent, client = null) => {
  const platformCut = Number((finalAmount * (commissionPercent / 100)).toFixed(2));
  const hostPayout = Number((finalAmount - platformCut).toFixed(2));

  const runner = client ? client.query.bind(client) : query;
  const { rows } = await runner(
    `UPDATE payments
     SET amount = $2, payment_status = 'captured', payout_status = 'released'
     WHERE booking_id = $1 RETURNING *`,
    [bookingId, finalAmount]
  );
  return { payment: rows[0], platformCut, hostPayout };
};

export const getPaymentByBooking = async (bookingId) => {
  const { rows } = await query(`SELECT * FROM payments WHERE booking_id = $1`, [bookingId]);
  return rows[0];
};

export const reversePayment = async (bookingId, client = null) => {
  const runner = client ? client.query.bind(client) : query;
  const { rows } = await runner(
    `UPDATE payments
     SET payment_status = 'refunded', payout_status = 'reversed'
     WHERE booking_id = $1 RETURNING *`,
    [bookingId]
  );
  return rows[0];
};
