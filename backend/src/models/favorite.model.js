import { query } from '../config/db.js';
import { LISTING_CARD_COLUMNS } from './location.model.js';
import { availableSlotsCountSql } from './slot.model.js';

export const addFavorite = async (userId, locationId) => {
  const { rows } = await query(
    `INSERT INTO favorites (user_id, location_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, location_id) DO NOTHING
     RETURNING *`,
    [userId, locationId]
  );
  return rows[0] || { user_id: userId, location_id: locationId };
};

export const removeFavorite = async (userId, locationId) => {
  const { rowCount } = await query(
    `DELETE FROM favorites WHERE user_id = $1 AND location_id = $2`,
    [userId, locationId]
  );
  return rowCount > 0;
};

export const getFavoriteLocationIds = async (userId) => {
  const { rows } = await query(
    `SELECT location_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map((row) => row.location_id);
};

export const getFavoriteLocations = async (userId) => {
  const { rows } = await query(
    `SELECT ${LISTING_CARD_COLUMNS('l')},
            f.created_at AS saved_at,
            ${availableSlotsCountSql('l.location_id')} AS available_slots
     FROM favorites f
     JOIN locations l ON l.location_id = f.location_id
     WHERE f.user_id = $1 AND l.is_verified = true
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows;
};
