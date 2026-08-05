import { z } from 'zod';
import {
  createLocation, findNearbyLocations, getLocationById,
  getLocationsByOwner, verifyLocation, getUnverifiedLocations,
} from '../models/location.model.js';
import { getSlotsByLocation } from '../models/slot.model.js';
import { ApiError } from '../middleware/errorHandler.js';

const listingSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(4).max(300),
  latitude: z.number(),
  longitude: z.number(),
  total_slots: z.number().int().positive(),
  price_per_hour: z.number().positive(),
  vehicle_types_allowed: z.array(z.string().max(30)).nonempty(),
  has_ev_charging: z.boolean().optional(),
  operating_hours: z.object({ open: z.string().max(5), close: z.string().max(5) }).optional(),
  photos: z.array(z.string().max(500)).optional(),
});

export const createListing = async (req, res, next) => {
  try {
    const data = listingSchema.parse(req.body);
    const location = await createLocation(req.user.user_id, data);
    res.status(201).json({ location });
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
    const slots = await getSlotsByLocation(location.location_id);
    res.json({ location, slots });
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

// --- Admin ---
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
    res.json({ location });
  } catch (err) {
    next(err);
  }
};
