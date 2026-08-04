import { query } from '../config/db.js';

export const createLocation = async (owner_id, data) => {
  const {
    name, address, latitude, longitude, total_slots,
    price_per_hour, vehicle_types_allowed, has_ev_charging,
    operating_hours, photos,
  } = data;

  const { rows } = await query(
    `INSERT INTO locations
      (owner_id, name, address, latitude, longitude, total_slots,
       price_per_hour, vehicle_types_allowed, has_ev_charging, operating_hours, photos)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [owner_id, name, address, latitude, longitude, total_slots,
     price_per_hour, vehicle_types_allowed, has_ev_charging,
     JSON.stringify(operating_hours || {}), photos || []]
  );

  // Auto-create the physical slot rows for this listing.
  const location = rows[0];
  const slotInserts = [];
  for (let i = 1; i <= total_slots; i++) {
    slotInserts.push(
      query(
        `INSERT INTO slots (location_id, slot_number, vehicle_type) VALUES ($1,$2,$3)`,
        [location.location_id, `S${i}`, vehicle_types_allowed?.[0] || 'car']
      )
    );
  }
  await Promise.all(slotInserts);
  return location;
};

// Nearby search — uses the haversine_km() SQL function defined in schema.sql.
// Swap to PostGIS ST_DWithin for production-scale geo-indexing.
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
            (SELECT COUNT(*) FROM slots s WHERE s.location_id = l.location_id AND s.status = 'available') AS available_slots
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
    `SELECT l.*, u.name AS host_name
     FROM locations l
     JOIN users u ON u.user_id = l.owner_id
     WHERE l.location_id = $1`,
    [locationId]
  );
  return rows[0];
};

export const getLocationsByOwner = async (ownerId) => {
  const { rows } = await query(`SELECT * FROM locations WHERE owner_id = $1 ORDER BY created_at DESC`, [ownerId]);
  return rows;
};

// Used by ownership checks (EV chargers, etc.) — cheap lookup of just the owner_id.
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
