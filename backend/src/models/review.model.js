import { query } from '../config/db.js';

// Driver rates the space (location review)
export const addLocationReview = async ({ booking_id, location_id, author_id, rating, comment }) => {
  const { rows } = await query(
    `INSERT INTO reviews (booking_id, location_id, author_id, rating, comment)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [booking_id, location_id, author_id, rating, comment || null]
  );
  return rows[0];
};

// Host rates the driver
export const addDriverReview = async ({ booking_id, reviewed_user, author_id, rating, comment }) => {
  const { rows } = await query(
    `INSERT INTO reviews (booking_id, reviewed_user, author_id, rating, comment)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [booking_id, reviewed_user, author_id, rating, comment || null]
  );
  return rows[0];
};

export const getReviewsForLocation = async (locationId) => {
  const { rows } = await query(
    `SELECT r.*, u.name AS author_name FROM reviews r
     JOIN users u ON u.user_id = r.author_id
     WHERE r.location_id = $1 ORDER BY r.created_at DESC`,
    [locationId]
  );
  return rows;
};
