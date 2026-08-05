import { z } from 'zod';
import {
  addFavorite, removeFavorite, getFavoriteLocationIds, getFavoriteLocations,
} from '../models/favorite.model.js';
import { getLocationById } from '../models/location.model.js';
import { ApiError } from '../middleware/errorHandler.js';

const favoriteParamsSchema = z.object({
  locationId: z.string().uuid(),
});

export const listFavorites = async (req, res, next) => {
  try {
    const locations = await getFavoriteLocations(req.user.user_id);
    const ids = locations.map((location) => location.location_id);
    res.json({ favorites: locations, ids });
  } catch (err) {
    next(err);
  }
};

export const listFavoriteIds = async (req, res, next) => {
  try {
    const ids = await getFavoriteLocationIds(req.user.user_id);
    res.json({ ids });
  } catch (err) {
    next(err);
  }
};

export const saveFavorite = async (req, res, next) => {
  try {
    const { locationId } = favoriteParamsSchema.parse(req.params);
    const location = await getLocationById(locationId);
    if (!location) throw new ApiError(404, 'Listing not found');
    const favorite = await addFavorite(req.user.user_id, locationId);
    res.status(201).json({ favorite });
  } catch (err) {
    next(err);
  }
};

export const deleteFavorite = async (req, res, next) => {
  try {
    const { locationId } = favoriteParamsSchema.parse(req.params);
    await removeFavorite(req.user.user_id, locationId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
