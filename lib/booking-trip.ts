import { queryWithEncoding } from '@/lib/db';
import { getBookingStatusIds } from '@/lib/master-data';

interface ExistsRow {
  exists: boolean;
}

interface ColumnRow {
  column_name: string;
}

export async function resolveBookingStatusColumn() {
  return 'status_id' as const;
}

export async function ensureTripsSchema() {
  const [tripsTable] = await queryWithEncoding(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'trips'
     ) AS exists`
  ) as ExistsRow[];

  if (!tripsTable?.exists) {
    await queryWithEncoding(
      `CREATE TABLE trips (
        id SERIAL PRIMARY KEY,
        start_date_time TIMESTAMP NOT NULL,
        end_date_time TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        updated_by VARCHAR(255)
      )`
    );
  }

  await queryWithEncoding(
    `CREATE TABLE IF NOT EXISTS trip_car_driver (
      id SERIAL PRIMARY KEY,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
      driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      CONSTRAINT trip_car_driver_trip_car_driver_key UNIQUE (trip_id, car_id, driver_id)
    )`
  );

  const tripColumns = await queryWithEncoding(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'trips'`
  ) as ColumnRow[];
  const tripColumnNames = tripColumns.map((column) => column.column_name);
  const hasLegacyTripCarDriverColumns = tripColumnNames.includes('car_id') && tripColumnNames.includes('driver_id');

  if (hasLegacyTripCarDriverColumns) {
    await queryWithEncoding(
      `INSERT INTO trip_car_driver (trip_id, car_id, driver_id)
       SELECT id, car_id, driver_id
       FROM trips
       WHERE car_id IS NOT NULL
         AND driver_id IS NOT NULL
       ON CONFLICT (trip_id, car_id, driver_id) DO NOTHING`
    );

    await queryWithEncoding(
      'ALTER TABLE trips DROP COLUMN IF EXISTS car_id, DROP COLUMN IF EXISTS driver_id'
    );
  }

  const bookingColumns = await queryWithEncoding(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'bookings'`
  ) as ColumnRow[];

  const bookingColumnNames = bookingColumns.map((column) => column.column_name);

  if (!bookingColumnNames.includes('trip_id')) {
    await queryWithEncoding('ALTER TABLE bookings ADD COLUMN trip_id INTEGER NULL');
  }

  const [tripForeignKey] = await queryWithEncoding(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.table_constraints
       WHERE table_schema = 'public'
         AND table_name = 'bookings'
         AND constraint_type = 'FOREIGN KEY'
         AND constraint_name = 'bookings_trip_id_fkey'
     ) AS exists`
  ) as ExistsRow[];

  if (!tripForeignKey?.exists) {
    await queryWithEncoding(
      'ALTER TABLE bookings ADD CONSTRAINT bookings_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL'
    );
  }

  if (!bookingColumnNames.includes('driver_id')) {
    await queryWithEncoding('ALTER TABLE bookings ADD COLUMN driver_id INTEGER NULL REFERENCES drivers(id) ON DELETE SET NULL');
  }

  const statusIds = await getBookingStatusIds();
  const legacyAssignedBookings = await queryWithEncoding(
    `SELECT id, start_date, start_time, end_date, end_time, car_id, driver_id, created_at
     FROM bookings
     WHERE trip_id IS NULL
       AND car_id IS NOT NULL
       AND status_id = $1
     ORDER BY created_at ASC, id ASC`,
    [statusIds.assigned]
  ) as {
    id: number;
    start_date: string;
    start_time: string;
    end_date: string;
    end_time: string;
    car_id: number | null;
    driver_id: number | null;
    created_at: string | null;
  }[];

  for (const booking of legacyAssignedBookings) {
    const createdTrips = await queryWithEncoding(
      `INSERT INTO trips (
         start_date_time,
         end_date_time,
         created_at,
         updated_at,
         created_by,
         updated_by
       ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
       RETURNING id`,
      [
        `${booking.start_date} ${booking.start_time}`,
        `${booking.end_date} ${booking.end_time}`,
        booking.created_at || new Date().toISOString(),
        'migration',
        'migration',
      ]
    ) as { id: number }[];

    const tripId = createdTrips[0]?.id;
    if (!tripId) {
      continue;
    }

    if (booking.car_id && booking.driver_id) {
      await queryWithEncoding(
        `INSERT INTO trip_car_driver (trip_id, car_id, driver_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (trip_id, car_id, driver_id) DO NOTHING`,
        [tripId, booking.car_id, booking.driver_id]
      );
    }

    await queryWithEncoding(
      'UPDATE bookings SET trip_id = $1 WHERE id = $2 AND trip_id IS NULL',
      [tripId, booking.id]
    );
  }
}

export function toDateKey(value: string | Date | null | undefined) {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}
