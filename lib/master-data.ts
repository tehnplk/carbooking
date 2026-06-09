import { queryWithEncoding } from '@/lib/db';
import { publishBookingRealtime } from '@/lib/booking-realtime';

export interface MasterOption {
  id: number;
  name: string;
  is_active: boolean;
}

export interface DriverTypeOption extends MasterOption {}
export interface TripTypeOption extends MasterOption {}
export interface FuelReimbursementOption extends MasterOption {}
export interface UserRoleOption extends MasterOption {}
export interface BookingStatusOption extends MasterOption {}
export interface DepartmentOption extends MasterOption {}
export interface CarTypeOption extends MasterOption {}

export interface BookingStatusIds {
  pending: number;
  assigned: number;
  rejected: number;
  completed: number;
  cancelled: number;
}

let masterDataSchemaReady = false;
let cachedBookingStatusIds: BookingStatusIds | null = null;

async function ensureIdSequence(tableName: string, sequenceName: string) {
  await queryWithEncoding(`CREATE SEQUENCE IF NOT EXISTS ${sequenceName}`);
  await queryWithEncoding(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS id INTEGER`);
  await queryWithEncoding(`ALTER TABLE ${tableName} ALTER COLUMN id SET DEFAULT nextval('${sequenceName}')`);
  await queryWithEncoding(`UPDATE ${tableName} SET id = nextval('${sequenceName}') WHERE id IS NULL`);
  await queryWithEncoding(`SELECT setval('${sequenceName}', COALESCE((SELECT MAX(id) FROM ${tableName}), 0) + 1, false)`);
  await queryWithEncoding(`ALTER TABLE ${tableName} ALTER COLUMN id SET NOT NULL`);
  await queryWithEncoding(`CREATE UNIQUE INDEX IF NOT EXISTS ${tableName}_id_key ON ${tableName}(id)`);
}

async function ensurePrimaryKeyOnId(tableName: string) {
  const rows = await queryWithEncoding(
    `SELECT pg_get_constraintdef(oid) AS definition
     FROM pg_constraint
     WHERE conrelid = $1::regclass
       AND contype = 'p'`,
    [tableName]
  ) as { definition: string }[];

  const hasIdPrimaryKey = rows.some((row) => row.definition.includes('(id)'));
  if (hasIdPrimaryKey) {
    return;
  }

  await queryWithEncoding(`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${tableName}_pkey`);
  await queryWithEncoding(`ALTER TABLE ${tableName} ADD CONSTRAINT ${tableName}_pkey PRIMARY KEY (id)`);
}

async function ensureForeignKey(tableName: string, constraintName: string, columnName: string, reference: string) {
  const rows = await queryWithEncoding(
    `SELECT constraint_name
     FROM information_schema.table_constraints
     WHERE table_name = $1
       AND constraint_name = $2`,
    [tableName, constraintName]
  ) as { constraint_name: string }[];

  if (rows.length === 0) {
    await queryWithEncoding(
      `ALTER TABLE ${tableName}
       ADD CONSTRAINT ${constraintName}
       FOREIGN KEY (${columnName}) REFERENCES ${reference}`
    );
  }
}

async function ensureNameColumn(tableName: string, oldColumn: string) {
  // Add name column if not exists
  await queryWithEncoding(
    `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS name VARCHAR(255)`
  );
  // Migrate data from old column to name
  await queryWithEncoding(
    `UPDATE ${tableName} SET name = ${oldColumn} WHERE name IS NULL AND ${oldColumn} IS NOT NULL`
  );
  // Set NOT NULL after data migration
  await queryWithEncoding(
    `ALTER TABLE ${tableName} ALTER COLUMN name SET NOT NULL`
  );
  // Add unique constraint on name if not present
  const idxName = `${tableName}_name_key`;
  await queryWithEncoding(
    `CREATE UNIQUE INDEX IF NOT EXISTS ${idxName} ON ${tableName}(name)`
  );
}

export async function ensureMasterDataSchema() {
  if (masterDataSchemaReady) {
    return;
  }

  const [existingTables] = await queryWithEncoding(
    `SELECT COUNT(*)::int AS count
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN (
         'booking_status',
         'car_type',
         'driver_type',
         'department',
         'trip_type',
         'fuel_reimbursement',
         'user_role'
       )`
  ) as { count: number }[];

  if (existingTables?.count === 7) {
    masterDataSchemaReady = true;
    cachedBookingStatusIds = null;
    return;
  }

  // Ensure all master tables exist with the clean schema: id, name, is_active
  await queryWithEncoding(`
    CREATE TABLE IF NOT EXISTS booking_status (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);
  await queryWithEncoding(`
    CREATE TABLE IF NOT EXISTS car_type (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);
  await queryWithEncoding(`
    CREATE TABLE IF NOT EXISTS driver_type (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);
  await queryWithEncoding(`
    CREATE TABLE IF NOT EXISTS department (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);
  await queryWithEncoding(`
    CREATE TABLE IF NOT EXISTS trip_type (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);
  await queryWithEncoding(`
    CREATE TABLE IF NOT EXISTS fuel_reimbursement (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);
  await queryWithEncoding(`
    CREATE TABLE IF NOT EXISTS user_role (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);

  // Ensure FK columns exist on transaction tables
  await queryWithEncoding(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS department_id       INTEGER`);
  await queryWithEncoding(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trip_type_id        INTEGER`);
  await queryWithEncoding(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fuel_reimbursement_id INTEGER`);
  await queryWithEncoding(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status_id           INTEGER`);
  await queryWithEncoding(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS self_drive          BOOLEAN NOT NULL DEFAULT FALSE`);
  await queryWithEncoding(`ALTER TABLE drivers  ADD COLUMN IF NOT EXISTS driver_type_id      INTEGER`);
  await queryWithEncoding(`ALTER TABLE users    ADD COLUMN IF NOT EXISTS role_id             INTEGER`);
  await queryWithEncoding(`ALTER TABLE cars     ADD COLUMN IF NOT EXISTS car_type_id         INTEGER`);

  // Ensure FK constraints exist
  await ensureForeignKey('bookings', 'bookings_department_id_fkey',         'department_id',         'department(id)');
  await ensureForeignKey('bookings', 'bookings_trip_type_id_fkey',          'trip_type_id',          'trip_type(id)');
  await ensureForeignKey('bookings', 'bookings_fuel_reimbursement_id_fkey', 'fuel_reimbursement_id', 'fuel_reimbursement(id)');
  await ensureForeignKey('bookings', 'bookings_status_id_fkey',             'status_id',             'booking_status(id)');
  await ensureForeignKey('drivers',  'drivers_driver_type_id_fkey',         'driver_type_id',        'driver_type(id)');
  await ensureForeignKey('users',    'users_role_id_fkey',                  'role_id',               'user_role(id)');
  await ensureForeignKey('cars',     'cars_car_type_id_fkey',               'car_type_id',           'car_type(id)');

  masterDataSchemaReady = true;
  cachedBookingStatusIds = null;
}

async function getActiveRows<T>(tableName: string) {
  await ensureMasterDataSchema();
  return queryWithEncoding(
    `SELECT id, name, is_active
     FROM ${tableName}
     WHERE is_active = TRUE
     ORDER BY id ASC`
  ) as Promise<T[]>;
}

async function getDefaultId(tableName: string) {
  await ensureMasterDataSchema();
  const rows = await queryWithEncoding(
    `SELECT id FROM ${tableName}
     WHERE is_active = TRUE
     ORDER BY id ASC
     LIMIT 1`
  ) as { id: number }[];

  return rows[0]?.id ?? null;
}

async function isValidId(tableName: string, id: number) {
  await ensureMasterDataSchema();
  const rows = await queryWithEncoding(
    `SELECT id
     FROM ${tableName}
     WHERE id = $1`,
    [id]
  ) as { id: number }[];

  return rows.length > 0;
}

export async function getDriverTypes() {
  return getActiveRows<DriverTypeOption>('driver_type');
}

export async function getTripTypes() {
  return getActiveRows<TripTypeOption>('trip_type');
}

export async function getFuelReimbursements() {
  return getActiveRows<FuelReimbursementOption>('fuel_reimbursement');
}

export async function getUserRoles() {
  return getActiveRows<UserRoleOption>('user_role');
}

export async function getDepartments() {
  return getActiveRows<DepartmentOption>('department');
}

export async function getCarTypes() {
  return getActiveRows<CarTypeOption>('car_type');
}

export async function getBookingStatuses() {
  return getActiveRows<BookingStatusOption>('booking_status');
}

export async function isValidTripType(id: number) {
  return isValidId('trip_type', id);
}

export async function isValidFuelReimbursement(id: number) {
  return isValidId('fuel_reimbursement', id);
}

export async function isValidUserRole(id: number) {
  return isValidId('user_role', id);
}

export async function isValidDriverType(id: number) {
  return isValidId('driver_type', id);
}

export async function isValidDepartment(id: number) {
  return isValidId('department', id);
}

export async function isValidBookingStatus(id: number) {
  return isValidId('booking_status', id);
}

export async function isValidCarType(id: number) {
  return isValidId('car_type', id);
}

export async function getDefaultTripTypeId() {
  return getDefaultId('trip_type');
}

export async function getDefaultFuelReimbursementId() {
  return getDefaultId('fuel_reimbursement');
}

export async function getDefaultUserRoleId() {
  return getDefaultId('user_role');
}

export async function getDefaultDriverTypeId() {
  return getDefaultId('driver_type');
}

export async function getDefaultBookingStatusId() {
  return getDefaultId('booking_status');
}

export async function getBookingStatusIds() {
  await ensureMasterDataSchema();

  if (cachedBookingStatusIds) {
    return cachedBookingStatusIds;
  }

  const rows = await queryWithEncoding(
    `SELECT id, name
     FROM booking_status`
  ) as { id: number; name: string }[];

  const findId = (name: string) => rows.find((row) => row.name === name)?.id ?? null;

  const pending = findId('รอจัดรถ');
  const assigned = findId('จัดรถแล้ว');
  const rejected = findId('ไม่อนุมัติ');
  const completed = findId('เสร็จสิ้น');
  const cancelled = findId('ยกเลิก');

  if (!pending || !assigned || !rejected || !completed || !cancelled) {
    throw new Error('Required booking status rows are missing');
  }

  cachedBookingStatusIds = { pending, assigned, rejected, completed, cancelled };
  return cachedBookingStatusIds;
}

let travelStatusSyncPromise: Promise<number[]> | null = null;

export async function syncTravelledBookingStatus() {
  if (travelStatusSyncPromise) {
    return travelStatusSyncPromise;
  }

  travelStatusSyncPromise = (async () => {
    await ensureMasterDataSchema();
    const statusIds = await getBookingStatusIds();
    const rows = await queryWithEncoding(
      `UPDATE bookings
       SET status_id = $1
       WHERE (end_date + end_time) < CURRENT_TIMESTAMP
         AND (status_id IS NULL OR status_id NOT IN ($1, $2, $3))
         AND EXISTS (
           SELECT 1
           FROM trip_car_driver tcd
           WHERE tcd.trip_id = bookings.trip_id
         )
       RETURNING id`,
      [statusIds.completed, statusIds.rejected, statusIds.cancelled]
    ) as { id: number }[];

    const updatedIds = rows.map((row) => row.id);

    if (updatedIds.length > 0) {
      await publishBookingRealtime({
        action: 'updated',
        bookingId: updatedIds[0],
        bookingIds: updatedIds,
        tripId: null,
      });
    }

    return updatedIds;
  })().finally(() => {
    travelStatusSyncPromise = null;
  });

  return travelStatusSyncPromise;
}
