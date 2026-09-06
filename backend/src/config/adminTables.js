// ---------------------------------------------------------------------------
// Admin Console — table registry
// ---------------------------------------------------------------------------
// Single source of truth describing every table the admin console is allowed
// to browse/edit, and exactly which columns are safe to read, write, search,
// sort, and chart. The generic CRUD + analytics controllers never accept a
// raw table/column name from the client without checking it against this
// registry first — that's what keeps a "generic admin table editor" from
// turning into a SQL-injection / arbitrary-query hole.
//
// Column `type` drives both input validation on the way in and the form
// widget the frontend renders:
//   uuid | text | textarea | number | boolean | enum | datetime | timestamp | json | array
//
// `editable: false` columns are shown but can never be sent in create/update.
// `required: true` columns must be present on create.
// `heavy: true` columns (large blobs — the KYC images) are never included in
// a generic SELECT * / RETURNING * — they're excluded at the query-building
// level in the controller, not just hidden in the UI, so a paginated table
// list can never accidentally pull megabytes of base64 image data per row.
// ---------------------------------------------------------------------------

const ENUMS = {
  user_role: ['driver', 'host', 'business_host', 'admin'],
  kyc_status: ['unsubmitted', 'pending', 'approved', 'rejected'],
  slot_status: ['available', 'booked', 'occupied', 'disabled'],
  vehicle_type: ['two_wheeler', 'car', 'suv', 'ev_car', 'ev_two_wheeler'],
  booking_status: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'disputed'],
  checkin_method: ['qr', 'geofence_auto', 'manual_override'],
  payment_status: ['authorized', 'captured', 'refunded', 'failed'],
  payout_status: ['held', 'released', 'reversed'],
  charger_status: ['available', 'in_use', 'out_of_service'],
  dispute_status: ['open', 'resolved'],
};

export const ADMIN_TABLES = {
  users: {
    table: 'users',
    label: 'Users',
    pk: ['user_id'],
    defaultSort: { column: 'created_at', dir: 'desc' },
    columns: [
      { name: 'user_id', type: 'uuid', editable: false, label: 'ID' },
      { name: 'name', type: 'text', editable: true, required: true, searchable: true },
      { name: 'email', type: 'text', editable: true, required: true, searchable: true },
      { name: 'phone', type: 'text', editable: true, searchable: true },
      { name: 'role', type: 'enum', enum: ENUMS.user_role, editable: true, required: true },
      { name: 'avg_rating', type: 'number', editable: false, label: 'Avg. rating' },
      { name: 'id_verified', type: 'boolean', editable: true, label: 'ID verified' },
      { name: 'kyc_status', type: 'enum', enum: ENUMS.kyc_status, editable: true, label: 'KYC status' },
      { name: 'is_suspended', type: 'boolean', editable: true, label: 'Suspended' },
      { name: 'created_at', type: 'timestamp', editable: false },
      { name: 'updated_at', type: 'timestamp', editable: false },
      // password_hash is intentionally never exposed to the admin console.
    ],
    analytics: {
      dateColumns: ['created_at'],
      categoryColumns: ['role', 'kyc_status', 'id_verified', 'is_suspended'],
      numericColumns: ['avg_rating'],
    },
    protectSelfDelete: true,
  },

  locations: {
    table: 'locations',
    label: 'Locations',
    pk: ['location_id'],
    defaultSort: { column: 'created_at', dir: 'desc' },
    columns: [
      { name: 'location_id', type: 'uuid', editable: false, label: 'ID' },
      { name: 'owner_id', type: 'uuid', editable: false, label: 'Owner ID', references: 'users' },
      { name: 'name', type: 'text', editable: true, required: true, searchable: true },
      { name: 'address', type: 'textarea', editable: true, required: true, searchable: true },
      { name: 'latitude', type: 'number', editable: true, required: true },
      { name: 'longitude', type: 'number', editable: true, required: true },
      { name: 'total_slots', type: 'number', editable: true, required: true },
      { name: 'price_per_hour', type: 'number', editable: true, required: true },
      { name: 'vehicle_types_allowed', type: 'array', editable: false, label: 'Vehicle types' },
      { name: 'has_ev_charging', type: 'boolean', editable: true, label: 'EV charging' },
      { name: 'operating_hours', type: 'json', editable: false },
      { name: 'photos', type: 'array', editable: false },
      { name: 'is_verified', type: 'boolean', editable: true },
      { name: 'surge_enabled', type: 'boolean', editable: true },
      { name: 'created_at', type: 'timestamp', editable: false },
    ],
    analytics: {
      dateColumns: ['created_at'],
      categoryColumns: ['is_verified', 'has_ev_charging', 'surge_enabled'],
      numericColumns: ['price_per_hour', 'total_slots'],
    },
  },

  slots: {
    table: 'slots',
    label: 'Slots',
    pk: ['slot_id'],
    defaultSort: { column: 'slot_number', dir: 'asc' },
    columns: [
      { name: 'slot_id', type: 'uuid', editable: false, label: 'ID' },
      { name: 'location_id', type: 'uuid', editable: true, required: true, references: 'locations' },
      { name: 'slot_number', type: 'text', editable: true, required: true, searchable: true },
      { name: 'status', type: 'enum', enum: ENUMS.slot_status, editable: true, required: true },
      { name: 'vehicle_type', type: 'enum', enum: ENUMS.vehicle_type, editable: true, required: true },
    ],
    analytics: {
      dateColumns: [],
      categoryColumns: ['status', 'vehicle_type'],
      numericColumns: [],
    },
  },

  ev_chargers: {
    table: 'ev_chargers',
    label: 'EV Chargers',
    pk: ['charger_id'],
    defaultSort: { column: 'status', dir: 'asc' },
    columns: [
      { name: 'charger_id', type: 'uuid', editable: false, label: 'ID' },
      { name: 'location_id', type: 'uuid', editable: true, required: true, references: 'locations' },
      { name: 'connector_type', type: 'text', editable: true, required: true, searchable: true },
      { name: 'current_type', type: 'text', editable: true, required: true },
      { name: 'power_kw', type: 'number', editable: true, required: true, label: 'Power (kW)' },
      { name: 'price_per_kwh', type: 'number', editable: true, required: true, label: 'Price/kWh' },
      { name: 'status', type: 'enum', enum: ENUMS.charger_status, editable: true, required: true },
    ],
    analytics: {
      dateColumns: [],
      categoryColumns: ['status', 'current_type'],
      numericColumns: ['power_kw', 'price_per_kwh'],
    },
  },

  bookings: {
    table: 'bookings',
    label: 'Bookings',
    pk: ['booking_id'],
    defaultSort: { column: 'created_at', dir: 'desc' },
    columns: [
      { name: 'booking_id', type: 'uuid', editable: false, label: 'ID' },
      { name: 'user_id', type: 'uuid', editable: false, references: 'users' },
      { name: 'slot_id', type: 'uuid', editable: false, references: 'slots' },
      { name: 'vehicle_number', type: 'text', editable: true, required: true, searchable: true },
      { name: 'start_time', type: 'datetime', editable: true, required: true },
      { name: 'end_time', type: 'datetime', editable: true, required: true },
      { name: 'checkin_time', type: 'datetime', editable: true },
      { name: 'checkout_time', type: 'datetime', editable: true },
      { name: 'checkin_method', type: 'enum', enum: ENUMS.checkin_method, editable: true },
      { name: 'qr_token', type: 'text', editable: false, searchable: true },
      { name: 'estimated_amount', type: 'number', editable: true, required: true },
      { name: 'total_amount', type: 'number', editable: true },
      { name: 'overtime_amount', type: 'number', editable: true },
      { name: 'status', type: 'enum', enum: ENUMS.booking_status, editable: true, required: true },
      { name: 'created_at', type: 'timestamp', editable: false },
    ],
    analytics: {
      dateColumns: ['created_at', 'start_time'],
      categoryColumns: ['status', 'checkin_method'],
      numericColumns: ['estimated_amount', 'total_amount', 'overtime_amount'],
    },
  },

  payments: {
    table: 'payments',
    label: 'Payments',
    pk: ['payment_id'],
    defaultSort: { column: 'transaction_time', dir: 'desc' },
    columns: [
      { name: 'payment_id', type: 'uuid', editable: false, label: 'ID' },
      { name: 'booking_id', type: 'uuid', editable: false, references: 'bookings' },
      { name: 'amount', type: 'number', editable: true, required: true },
      { name: 'payment_mode', type: 'text', editable: true, required: true },
      { name: 'payment_status', type: 'enum', enum: ENUMS.payment_status, editable: true, required: true },
      { name: 'payout_status', type: 'enum', enum: ENUMS.payout_status, editable: true, required: true },
      { name: 'gateway_ref', type: 'text', editable: true, searchable: true },
      { name: 'transaction_time', type: 'timestamp', editable: false },
    ],
    analytics: {
      dateColumns: ['transaction_time'],
      categoryColumns: ['payment_status', 'payout_status', 'payment_mode'],
      numericColumns: ['amount'],
    },
  },

  reviews: {
    table: 'reviews',
    label: 'Reviews',
    pk: ['review_id'],
    defaultSort: { column: 'created_at', dir: 'desc' },
    columns: [
      { name: 'review_id', type: 'uuid', editable: false, label: 'ID' },
      { name: 'booking_id', type: 'uuid', editable: false, references: 'bookings' },
      { name: 'location_id', type: 'uuid', editable: false, references: 'locations' },
      { name: 'reviewed_user', type: 'uuid', editable: false, references: 'users' },
      { name: 'author_id', type: 'uuid', editable: false, references: 'users' },
      { name: 'rating', type: 'number', editable: true, required: true },
      { name: 'comment', type: 'textarea', editable: true, searchable: true },
      { name: 'created_at', type: 'timestamp', editable: false },
    ],
    analytics: {
      dateColumns: ['created_at'],
      categoryColumns: ['rating'],
      numericColumns: ['rating'],
    },
  },

  favorites: {
    table: 'favorites',
    label: 'Favorites',
    pk: ['user_id', 'location_id'],
    supportsUpdate: false,
    defaultSort: { column: 'created_at', dir: 'desc' },
    columns: [
      { name: 'user_id', type: 'uuid', editable: true, required: true, references: 'users' },
      { name: 'location_id', type: 'uuid', editable: true, required: true, references: 'locations' },
      { name: 'created_at', type: 'timestamp', editable: false },
    ],
    analytics: {
      dateColumns: ['created_at'],
      categoryColumns: [],
      numericColumns: [],
    },
  },

  disputes: {
    table: 'disputes',
    label: 'Disputes',
    pk: ['dispute_id'],
    defaultSort: { column: 'created_at', dir: 'desc' },
    columns: [
      { name: 'dispute_id', type: 'uuid', editable: false, label: 'ID' },
      { name: 'booking_id', type: 'uuid', editable: false, references: 'bookings' },
      { name: 'raised_by', type: 'uuid', editable: false, references: 'users' },
      { name: 'reason', type: 'textarea', editable: true, required: true, searchable: true },
      { name: 'resolution', type: 'textarea', editable: true },
      { name: 'resolved_by', type: 'uuid', editable: false, references: 'users' },
      { name: 'status', type: 'enum', enum: ENUMS.dispute_status, editable: true, required: true },
      { name: 'created_at', type: 'timestamp', editable: false },
      { name: 'resolved_at', type: 'datetime', editable: true },
    ],
    analytics: {
      dateColumns: ['created_at', 'resolved_at'],
      categoryColumns: ['status'],
      numericColumns: [],
    },
  },

  kyc_submissions: {
    table: 'kyc_submissions',
    label: 'KYC Submissions',
    pk: ['kyc_id'],
    // Read-only in the generic browser on purpose: approving/rejecting here
    // has to also flip users.kyc_status and users.id_verified together (see
    // reviewKycSubmission in kyc.model.js), and a plain column edit can't do
    // that atomically. Use the "Identity Verification" tab for that — this
    // view exists so admins can see submission history and search/purge it.
    supportsUpdate: false,
    supportsCreate: false,
    defaultSort: { column: 'created_at', dir: 'desc' },
    columns: [
      { name: 'kyc_id', type: 'uuid', editable: false, label: 'ID' },
      { name: 'user_id', type: 'uuid', editable: false, references: 'users' },
      // id_document_image / selfie_image deliberately omitted: they're
      // multi-megabyte base64 blobs, and there's already a dedicated,
      // image-previewing review flow for them (Identity Verification tab).
      // A generic column with `heavy: true` is never selected or returned
      // by the CRUD controller, so it can't leak into a list/edit response
      // even if someone added it here by mistake.
      { name: 'id_document_image', type: 'text', editable: false, heavy: true },
      { name: 'selfie_image', type: 'text', editable: false, heavy: true },
      { name: 'consent_type', type: 'text', editable: false },
      { name: 'consent_version', type: 'text', editable: false },
      { name: 'consent_accepted_at', type: 'timestamp', editable: false },
      { name: 'consent_ip', type: 'text', editable: false },
      { name: 'status', type: 'enum', enum: ENUMS.kyc_status.filter((s) => s !== 'unsubmitted'), editable: false },
      { name: 'rejection_reason', type: 'textarea', editable: false },
      { name: 'reviewed_by', type: 'uuid', editable: false, references: 'users' },
      { name: 'reviewed_at', type: 'datetime', editable: false },
      { name: 'created_at', type: 'timestamp', editable: false },
    ],
    analytics: {
      dateColumns: ['created_at', 'reviewed_at'],
      categoryColumns: ['status', 'consent_type'],
      numericColumns: [],
    },
  },
};

export const TABLE_NAMES = Object.keys(ADMIN_TABLES);

export function getTableDef(name) {
  return ADMIN_TABLES[name];
}

// Every value that reaches an interpolated identifier (table/column names)
// is checked against the registry above, never against this regex alone —
// but it's kept as a defense-in-depth sanity check on top of that.
export const isSafeIdentifier = (value) => /^[a-z_][a-z0-9_]*$/.test(value || '');
