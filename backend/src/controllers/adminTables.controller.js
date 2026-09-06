import { z } from 'zod';
import { query } from '../config/db.js';
import { ADMIN_TABLES, TABLE_NAMES, getTableDef } from '../config/adminTables.js';
import { ApiError } from '../middleware/errorHandler.js';

const quote = (id) => `"${id}"`;

// Resolves the requested table against the registry. Every generic CRUD /
// analytics handler goes through this first — an unknown table name is a
// 404, never a query built from unchecked input.
function resolveTable(name) {
  const def = getTableDef(name);
  if (!def) throw new ApiError(404, `Unknown table "${name}"`);
  return def;
}

function resolveColumn(def, name, { mustExist = true } = {}) {
  const col = def.columns.find((c) => c.name === name);
  if (!col && mustExist) throw new ApiError(400, `Unknown column "${name}" on ${def.table}`);
  return col;
}

// Coerces a raw JSON value into the right JS type for its column, and
// rejects it outright if it doesn't fit (bad enum value, non-numeric
// number, etc.) rather than silently passing bad data through to Postgres.
function coerceValue(col, raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  switch (col.type) {
    case 'boolean': {
      if (typeof raw === 'boolean') return raw;
      if (raw === 'true' || raw === '1' || raw === 1) return true;
      if (raw === 'false' || raw === '0' || raw === 0) return false;
      throw new ApiError(400, `Invalid boolean for "${col.name}"`);
    }
    case 'number': {
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new ApiError(400, `Invalid number for "${col.name}"`);
      return n;
    }
    case 'enum': {
      if (!col.enum.includes(raw)) {
        throw new ApiError(400, `"${raw}" is not a valid value for "${col.name}" (expected one of: ${col.enum.join(', ')})`);
      }
      return raw;
    }
    case 'datetime':
    case 'timestamp': {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) throw new ApiError(400, `Invalid date for "${col.name}"`);
      return d.toISOString();
    }
    default:
      return String(raw);
  }
}

// Builds { column, value } pairs for every editable column present in the
// request body, validating each one. Used by both create and update.
function buildEditableAssignments(def, body, { forCreate }) {
  const assignments = [];
  for (const col of def.columns) {
    if (!col.editable) continue;
    const present = Object.prototype.hasOwnProperty.call(body, col.name);
    if (!present) {
      if (forCreate && col.required) {
        throw new ApiError(400, `"${col.label || col.name}" is required`);
      }
      continue;
    }
    assignments.push({ column: col.name, value: coerceValue(col, body[col.name]) });
  }
  return assignments;
}

function pkWhereClause(def, pkValues, startIndex = 1) {
  const clauses = def.pk.map((col, i) => `${quote(col)} = $${startIndex + i}`);
  return { clause: clauses.join(' AND '), params: def.pk.map((col) => pkValues[col]) };
}

// ---------------------------------------------------------------------------
// Table metadata (drives the frontend's table picker + auto-generated forms)
// ---------------------------------------------------------------------------
export const listTableDefs = async (req, res, next) => {
  try {
    const counts = await Promise.all(
      TABLE_NAMES.map(async (name) => {
        const { rows } = await query(`SELECT COUNT(*)::int AS count FROM ${quote(ADMIN_TABLES[name].table)}`);
        return [name, rows[0].count];
      })
    );
    const countMap = Object.fromEntries(counts);

    const tables = TABLE_NAMES.map((name) => {
      const def = ADMIN_TABLES[name];
      return {
        name,
        label: def.label,
        pk: def.pk,
        supportsUpdate: def.supportsUpdate !== false,
        defaultSort: def.defaultSort,
        rowCount: countMap[name],
        columns: def.columns.map((c) => ({
          name: c.name,
          label: c.label || c.name,
          type: c.type,
          editable: !!c.editable,
          required: !!c.required,
          enum: c.enum || undefined,
          references: c.references || undefined,
        })),
      };
    });
    res.json({ tables });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Generic list with search / sort / pagination
// ---------------------------------------------------------------------------
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  sort: z.string().max(60).optional(),
  dir: z.enum(['asc', 'desc']).optional(),
});

export const listRows = async (req, res, next) => {
  try {
    const def = resolveTable(req.params.table);
    const { page, limit, search, sort, dir } = listQuerySchema.parse(req.query);

    let sortColumn = def.defaultSort.column;
    let sortDir = def.defaultSort.dir;
    if (sort) {
      resolveColumn(def, sort); // throws if not a real column
      sortColumn = sort;
    }
    if (dir) sortDir = dir;

    const searchableCols = def.columns.filter((c) => c.searchable);
    const params = [];
    let whereClause = '';
    if (search && searchableCols.length) {
      const clauses = searchableCols.map((c) => {
        params.push(`%${search}%`);
        return `${quote(c.name)}::text ILIKE $${params.length}`;
      });
      whereClause = `WHERE ${clauses.join(' OR ')}`;
    }

    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS count FROM ${quote(def.table)} ${whereClause}`,
      params
    );
    const total = countRows[0].count;

    const limitParamIdx = params.length + 1;
    const offsetParamIdx = params.length + 2;
    const { rows } = await query(
      `SELECT * FROM ${quote(def.table)} ${whereClause}
       ORDER BY ${quote(sortColumn)} ${sortDir === 'desc' ? 'DESC' : 'ASC'}
       LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
      [...params, limit, (page - 1) * limit]
    );

    res.json({ rows, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    next(err);
  }
};

export const createRow = async (req, res, next) => {
  try {
    const def = resolveTable(req.params.table);
    const assignments = buildEditableAssignments(def, req.body || {}, { forCreate: true });
    if (assignments.length === 0) throw new ApiError(400, 'No fields provided');

    const columns = assignments.map((a) => quote(a.column));
    const placeholders = assignments.map((_, i) => `$${i + 1}`);
    const values = assignments.map((a) => a.value);

    const { rows } = await query(
      `INSERT INTO ${quote(def.table)} (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      values
    );
    res.status(201).json({ row: rows[0] });
  } catch (err) {
    next(mapDbError(err));
  }
};

export const updateRow = async (req, res, next) => {
  try {
    const def = resolveTable(req.params.table);
    if (def.supportsUpdate === false) {
      throw new ApiError(400, `${def.label} rows can't be edited in place — delete and re-create instead.`);
    }
    const pkValues = extractPk(def, req.params);
    const assignments = buildEditableAssignments(def, req.body || {}, { forCreate: false });
    if (assignments.length === 0) throw new ApiError(400, 'No editable fields provided');

    const setClauses = assignments.map((a, i) => `${quote(a.column)} = $${i + 1}`);
    const { clause: whereClause, params: whereParams } = pkWhereClause(def, pkValues, assignments.length + 1);

    const { rows } = await query(
      `UPDATE ${quote(def.table)} SET ${setClauses.join(', ')}
       WHERE ${whereClause}
       RETURNING *`,
      [...assignments.map((a) => a.value), ...whereParams]
    );
    if (!rows[0]) throw new ApiError(404, 'Row not found');
    res.json({ row: rows[0] });
  } catch (err) {
    next(mapDbError(err));
  }
};

export const deleteRow = async (req, res, next) => {
  try {
    const def = resolveTable(req.params.table);
    const pkValues = extractPk(def, req.params);

    if (def.protectSelfDelete && pkValues.user_id === req.user.user_id) {
      throw new ApiError(400, 'Use account settings to delete your own account.');
    }

    const { clause: whereClause, params } = pkWhereClause(def, pkValues, 1);
    const { rows } = await query(
      `DELETE FROM ${quote(def.table)} WHERE ${whereClause} RETURNING *`,
      params
    );
    if (!rows[0]) throw new ApiError(404, 'Row not found');
    res.json({ message: 'Row deleted', row: rows[0] });
  } catch (err) {
    next(mapDbError(err));
  }
};

// The route always carries a single `:id` — for composite-key tables
// (favorites) the client joins the key parts with a comma, in pk order.
function extractPk(def, params) {
  const parts = String(params.id).split(',');
  if (parts.length !== def.pk.length) {
    throw new ApiError(400, `Expected ${def.pk.length} key part(s) for ${def.table}`);
  }
  return Object.fromEntries(def.pk.map((col, i) => [col, parts[i]]));
}

function mapDbError(err) {
  if (err instanceof ApiError) return err;
  // Postgres error codes: 23505 unique_violation, 23503 foreign_key_violation, 23502 not_null_violation
  if (err?.code === '23505') return new ApiError(409, 'That value already exists (unique constraint).');
  if (err?.code === '23503') return new ApiError(409, 'That would violate a foreign key relationship.');
  if (err?.code === '23502') return new ApiError(400, `Missing required field: ${err.column || 'unknown'}`);
  if (err?.code === '22P02') return new ApiError(400, 'Invalid input value for one of the fields.');
  return err;
}

// ---------------------------------------------------------------------------
// Analytics — admin picks a table + how to slice it, we build one whitelisted
// aggregate query. Nothing here accepts a raw SQL fragment from the client:
// every table/column/interval/metric is checked against the registry or a
// fixed enum before it's interpolated.
// ---------------------------------------------------------------------------
export const analyticsOptions = async (req, res, next) => {
  try {
    const options = TABLE_NAMES.map((name) => {
      const def = ADMIN_TABLES[name];
      return {
        name,
        label: def.label,
        dateColumns: def.analytics.dateColumns,
        categoryColumns: def.analytics.categoryColumns,
        numericColumns: def.analytics.numericColumns,
      };
    });
    res.json({ tables: options });
  } catch (err) {
    next(err);
  }
};

const INTERVALS = { day: 'day', week: 'week', month: 'month' };

const seriesSchema = z.object({
  table: z.string(),
  mode: z.enum(['trend', 'breakdown']),
  metric: z.enum(['count', 'sum', 'avg']).default('count'),
  valueColumn: z.string().optional(),
  dateColumn: z.string().optional(),
  interval: z.enum(['day', 'week', 'month']).default('day'),
  groupColumn: z.string().optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const analyticsSeries = async (req, res, next) => {
  try {
    const input = seriesSchema.parse(req.query);
    const def = resolveTable(input.table);
    const allowed = def.analytics;

    if (input.metric !== 'count') {
      if (!input.valueColumn || !allowed.numericColumns.includes(input.valueColumn)) {
        throw new ApiError(400, `"${input.valueColumn}" isn't a chartable numeric column on ${def.table}`);
      }
    }

    const metricExpr =
      input.metric === 'count'
        ? 'COUNT(*)'
        : `${input.metric.toUpperCase()}(${quote(input.valueColumn)})`;

    if (input.mode === 'trend') {
      if (!input.dateColumn || !allowed.dateColumns.includes(input.dateColumn)) {
        throw new ApiError(400, `"${input.dateColumn}" isn't a chartable date column on ${def.table}`);
      }
      const bucket = `date_trunc('${INTERVALS[input.interval]}', ${quote(input.dateColumn)})`;
      const { rows } = await query(
        `SELECT ${bucket} AS bucket, ${metricExpr} AS value
         FROM ${quote(def.table)}
         WHERE ${quote(input.dateColumn)} >= now() - $1::interval
         GROUP BY bucket
         ORDER BY bucket ASC`,
        [`${input.days} days`]
      );
      res.json({
        mode: 'trend',
        table: input.table,
        metric: input.metric,
        interval: input.interval,
        series: rows.map((r) => ({ label: r.bucket, value: Number(r.value) || 0 })),
      });
      return;
    }

    // breakdown mode
    if (!input.groupColumn || !allowed.categoryColumns.includes(input.groupColumn)) {
      throw new ApiError(400, `"${input.groupColumn}" isn't a chartable category column on ${def.table}`);
    }
    const { rows } = await query(
      `SELECT ${quote(input.groupColumn)} AS bucket, ${metricExpr} AS value
       FROM ${quote(def.table)}
       GROUP BY ${quote(input.groupColumn)}
       ORDER BY value DESC
       LIMIT 25`
    );
    res.json({
      mode: 'breakdown',
      table: input.table,
      metric: input.metric,
      groupColumn: input.groupColumn,
      series: rows.map((r) => ({ label: String(r.bucket), value: Number(r.value) || 0 })),
    });
  } catch (err) {
    if (err?.name === 'ZodError') return next(new ApiError(400, 'Invalid analytics query'));
    next(err);
  }
};
