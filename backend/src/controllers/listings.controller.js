import { z } from 'zod';
import {
  createLocation, findNearbyLocations, getLocationById,
  getLocationsByOwner, verifyLocation, getUnverifiedLocations,
} from '../models/location.model.js';
import { getSlotsByLocation } from '../models/slot.model.js';
import { promoteToBusinessHostIfNeeded } from '../models/user.model.js';
import { query } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';

const normalizeText = (value) => value.trim().replace(/\s+/g, ' ');

const photoDataUrl = z.string()
  .min(100)
  .max(3_000_000)
  .refine((v) => /^data:image\/(png|jpe?g|webp);base64,/.test(v), 'Each photo must be a base64 image data URL');

const listingSchema = z.object({
  name: z.string().min(2).max(100).transform(normalizeText),
  address: z.string().min(4).max(300).transform(normalizeText),
  latitude: z.number(),
  longitude: z.number(),
  total_slots: z.number().int().positive().max(200),
  price_per_hour: z.number().positive().max(100000),
  vehicle_types_allowed: z.array(z.enum(['two_wheeler', 'car', 'suv', 'ev_car', 'ev_two_wheeler'])).nonempty(),
  has_ev_charging: z.boolean().optional(),
  operating_hours: z.object({ open: z.string().max(5), close: z.string().max(5) }).optional(),
  photos: z.array(photoDataUrl).min(1, 'At least one photo of the slot or place is required').max(5),
  ownership_consent: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm you own or are authorized to list this place' }),
  }),
});

export const createListing = async (req, res, next) => {
  try {
    const data = listingSchema.parse(req.body);
    const location = await createLocation(req.user.user_id, data);
    const promotion = await promoteToBusinessHostIfNeeded(req.user.user_id);
    res.status(201).json({ location, promoted_to: promotion?.role || null });
  } catch (err) {
    next(err);
  }
};

export const searchListings = async (req, res, next) => {
  try {
    const { lat, lng, radiusKm, vehicleType, evOnly, maxPrice } = req.query;
    if (!lat || !lng) throw new ApiError(400, 'lat and lng query params are required');

    const results = await findNearbyLocations({
      lat: Number(lat),
      lng: Number(lng),
      radiusKm: radiusKm ? Number(radiusKm) : 5,
      vehicleType: vehicleType || null,
      evOnly: evOnly === 'true',
      maxPrice: maxPrice ? Number(maxPrice) : null,
    });
    res.json({ results });
  } catch (err) {
    next(err);
  }
};

export const getListing = async (req, res, next) => {
  try {
    const location = await getLocationById(req.params.id);
    if (!location) throw new ApiError(404, 'Listing not found');
    const isOwner = req.user?.user_id && location.owner_id === req.user.user_id;
    const isAdmin = req.user?.role === 'admin';
    if (!location.is_verified && !isOwner && !isAdmin) {
      throw new ApiError(404, 'Listing not found');
    }
    const slots = await getSlotsByLocation(location.location_id);

    let ev_chargers = [];
    if (location.has_ev_charging) {
      const { rows } = await query(
        `SELECT * FROM ev_chargers WHERE location_id = $1`,
        [location.location_id]
      );
      ev_chargers = rows;
    }

    res.json({ location, slots, ev_chargers });
  } catch (err) {
    next(err);
  }
};

export const myListings = async (req, res, next) => {
  try {
    const listings = await getLocationsByOwner(req.user.user_id);
    res.json({ listings });
  } catch (err) {
    next(err);
  }
};

export const pendingListings = async (req, res, next) => {
  try {
    const listings = await getUnverifiedLocations();
    res.json({ listings });
  } catch (err) {
    next(err);
  }
};

export const reviewListing = async (req, res, next) => {
  try {
    const { approve } = req.body;
    const location = await verifyLocation(req.params.id, !!approve);
    if (!location) throw new ApiError(404, 'Listing not found');
    res.json({ location });
  } catch (err) {
    next(err);
  }
};
