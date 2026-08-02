import { query } from '../config/db.js';

export const getSlotsByLocation = async (locationId) => {
  const { rows } = await query(`SELECT * FROM slots WHERE location_id = $1 ORDER BY slot_number`, [locationId]);
  return rows;
};

// Locks the slot row (FOR UPDATE) inside the caller's transaction so two
// simultaneous bookings for the same slot/window can never both succeed —
// this is the "real-time slot locking" mechanism described in the plan.
export const lockSlotForUpdate = async (client, slotId) => {
  const { rows } = await client.query(`SELECT * FROM slots WHERE slot_id = $1 FOR UPDATE`, [slotId]);
  return rows[0];
};

export const hasOverlappingBooking = async (client, slotId, startTime, endTime) => {
  const { rows } = await client.query(
    `SELECT 1 FROM bookings
     WHERE slot_id = $1
       AND status IN ('pending','confirmed','checked_in')
       AND tstzrange(start_time, end_time) && tstzrange($2::timestamptz, $3::timestamptz)
     LIMIT 1`,
    [slotId, startTime, endTime]
  );
  return rows.length > 0;
};

export const setSlotStatus = async (slotId, status, client = null) => {
  const runner = client ? client.query.bind(client) : query;
  const { rows } = await runner(`UPDATE slots SET status = $2 WHERE slot_id = $1 RETURNING *`, [slotId, status]);
  return rows[0];
};
