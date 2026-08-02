import { z } from 'zod';
import { query } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';

const chargerSchema = z.object({
  location_id: z.string().uuid(),
  connector_type: z.enum(['Type-1', 'Type-2', 'CCS', 'CHAdeMO']),
  current_type: z.enum(['AC', 'DC']).default('AC'),
  power_kw: z.number().positive(),
  price_per_kwh: z.number().positive(),
});

export const addCharger = async (req, res, next) => {
  try {
    const data = chargerSchema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO ev_chargers (location_id, connector_type, current_type, power_kw, price_per_kwh)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [data.location_id, data.connector_type, data.current_type, data.power_kw, data.price_per_kwh]
    );
    res.status(201).json({ charger: rows[0] });
  } catch (err) {
    next(err);
  }
};

export const getChargersForLocation = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM ev_chargers WHERE location_id = $1`, [req.params.locationId]);
    res.json({ chargers: rows });
  } catch (err) {
    next(err);
  }
};

export const setChargerStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['available', 'in_use', 'out_of_service'].includes(status)) {
      throw new ApiError(400, 'Invalid charger status');
    }
    const { rows } = await query(
      `UPDATE ev_chargers SET status = $2 WHERE charger_id = $1 RETURNING *`,
      [req.params.id, status]
    );
    res.json({ charger: rows[0] });
  } catch (err) {
    next(err);
  }
};
