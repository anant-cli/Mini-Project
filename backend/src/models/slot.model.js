import { query } from '../config/db.js';

export const ACTIVE_BOOKING_STATUSES = `('pending','confirmed','checked_in')`;

export const effectiveSlotStatusSql = (alias = 's') => `CASE
    WHEN ${alias}.status IN ('disabled', 'occupied') THEN ${alias}.status::text
    WHEN EXISTS (
      SELECT 1 FROM bookings bk
      WHERE bk.slot_id = ${alias}.slot_id
        AND bk.status IN ${ACTIVE_BOOKING_STATUSES}
        AND now() >= bk.start_time AND now() < bk.end_time
    ) THEN 'booked'
    ELSE 'available'
  END`;

export const availableSlotsCountSql = (locationExpr) => `(
    SELECT COUNT(*) FROM slots s
    WHERE s.location_id = ${locationExpr} AND (${effectiveSlotStatusSql('s')}) = 'available'
  )`;

export const getSlotsByLocation = async (locationId) => {
  const { rows } = await query(
    `SELECT s.slot_id, s.location_id, s.slot_number, s.vehicle_type, ${effectiveSlotStatusSql('s')} AS status
     FROM slots s WHERE s.location_id = $1 ORDER BY s.slot_number`,
    [locationId]
  );
  return rows;
};

export const lockSlotForUpdate = async (client, slotId) => {
  const { rows } = await client.query(`SELECT * FROM slots WHERE slot_id = $1 FOR UPDATE`, [slotId]);
  return rows[0];
};

export const hasOverlappingBooking = async (client, slotId, startTime, endTime) => {
  const { rows } = await client.query(
    `SELECT 1 FROM bookings
     WHERE slot_id = $1
       AND status IN ${ACTIVE_BOOKING_STATUSES}
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

export const getEffectiveSlotStatus = async (slotId, client = null) => {
  const runner = client ? client.query.bind(client) : query;
  const { rows } = await runner(
    `SELECT ${effectiveSlotStatusSql('s')} AS status FROM slots s WHERE s.slot_id = $1`,
    [slotId]
  );
  return rows[0]?.status || null;
};

export const countAvailableSlots = async (locationId, client = null) => {
  const runner = client ? client.query.bind(client) : query;
  const { rows } = await runner(`SELECT ${availableSlotsCountSql('$1')}::int AS available_slots`, [locationId]);
  return rows[0]?.available_slots ?? 0;
};
