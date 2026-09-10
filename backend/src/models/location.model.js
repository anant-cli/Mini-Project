import { withTransaction } from '../config/db.js';

export const createLocation = async (owner_id, data) => {
  const {
    name, address, latitude, longitude, total_slots,
    price_per_hour, vehicle_types_allowed, has_ev_charging,
    operating_hours, photos, ownership_consent,
  } = data;

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO locations
        (owner_id, name, address, latitude, longitude, total_slots,
         price_per_hour, vehicle_types_allowed, has_ev_charging, operating_hours, photos,
         owner_consent_confirmed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [owner_id, name, address, latitude, longitude, total_slots,
       price_per_hour, vehicle_types_allowed, Boolean(has_ev_charging),
       JSON.stringify(operating_hours || { open: '00:00', close: '23:59' }), photos || [],
       ownership_consent ? new Date() : null]
    );

    const location = rows[0];
    const vehicleType = vehicle_types_allowed?.[0] || 'car';
    const slotNumbers = Array.from({ length: total_slots }, (_, i) => `S${i + 1}`);
    await client.query(
      `INSERT INTO slots (location_id, slot_number, vehicle_type)
       SELECT $1, s.slot_number, $2::vehicle_type
       FROM unnest($3::text[]) AS s(slot_number)`,
      [location.location_id, vehicleType, slotNumbers]
    );

    return location;
  });
};

export const findNearbyLocations = async ({ lat, lng, radiusKm = 5, vehicleType, evOnly, maxPrice }) => {
  const conditions = ['is_verified = true'];
  const params = [lat, lng, radiusKm];
  let idx = 4;

  if (vehicleType) {
    conditions.push(`$${idx} = ANY(vehicle_types_allowed)`);
    params.push(vehicleType);
    idx++;
  }
  if (evOnly) {
    conditions.push(`has_ev_charging = true`);
  }
  if (maxPrice) {
    conditions.push(`price_per_hour <= $${idx}`);
    params.push(maxPrice);
    idx++;
  }

  const { rows } = await query(
    `SELECT l.*, haversine_km($1, $2, l.latitude, l.longitude) AS distance_km,
            (SELECT COUNT(*) FROM slots s WHERE s.location_id = l.location_id AND s.status = 'available') AS available_slots,
            (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.location_id = l.location_id) AS avg_rating,
            (SELECT COUNT(*) FROM reviews r WHERE r.location_id = l.location_id) AS review_count
     FROM locations l
     WHERE ${conditions.join(' AND ')}
       AND haversine_km($1, $2, l.latitude, l.longitude) < $3
     ORDER BY distance_km ASC`,
    params
  );
  return rows;
};

export const getLocationById = async (locationId) => {
  const { rows } = await query(
    `SELECT l.*, u.name AS host_name,
            (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.location_id = l.location_id) AS avg_rating,
            (SELECT COUNT(*) FROM reviews r WHERE r.location_id = l.location_id) AS review_count
     FROM locations l
     JOIN users u ON u.user_id = l.owner_id
     WHERE l.location_id = $1`,
    [locationId]
  );
  return rows[0];
};

export const getLocationsByOwner = async (ownerId) => {
  const { rows } = await query(
    `SELECT l.*,
            COALESCE(
              (SELECT json_agg(
                        json_build_object(
                          'slot_id', s.slot_id,
                          'slot_number', s.slot_number,
                          'status', s.status,
                          'vehicle_type', s.vehicle_type
                        ) ORDER BY s.slot_number
                      )
               FROM slots s WHERE s.location_id = l.location_id),
              '[]'
            ) AS slots,
            (SELECT COUNT(*) FROM slots s WHERE s.location_id = l.location_id AND s.status = 'available') AS available_slots
     FROM locations l
     WHERE l.owner_id = $1
     ORDER BY l.created_at DESC`,
    [ownerId]
  );
  return rows;
};

export const getLocationOwnerId = async (locationId) => {
  const { rows } = await query(`SELECT owner_id FROM locations WHERE location_id = $1`, [locationId]);
  return rows[0]?.owner_id || null;
};

export const verifyLocation = async (locationId, verified = true) => {
  const { rows } = await query(
    `UPDATE locations SET is_verified = $2 WHERE location_id = $1 RETURNING *`,
    [locationId, verified]
  );
  return rows[0];
};

export const getUnverifiedLocations = async () => {
  const { rows } = await query(`SELECT * FROM locations WHERE is_verified = false ORDER BY created_at ASC`);
  return rows;
};
