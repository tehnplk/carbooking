import ReportCharts, { type ReportUsageItem } from '@/components/ReportCharts';
import { ensureTripsSchema } from '@/lib/booking-trip';
import { queryWithEncoding } from '@/lib/db';
import { getBookingStatusIds, syncTravelledBookingStatus } from '@/lib/master-data';

export const dynamic = 'force-dynamic';

interface UsageRow {
  id: number;
  name: string;
  completed_trip_count: string | number;
  total_distance_km: string | number;
}

interface DateRangeRow {
  first_date: string | null;
  last_date: string | null;
}

interface TripTypeRow {
  id: number;
  name: string;
}

function isDateInput(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeUsage(rows: UsageRow[]): ReportUsageItem[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    completedTripCount: Number(row.completed_trip_count),
    totalDistanceKm: Number(row.total_distance_km),
  }));
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureTripsSchema();
  await syncTravelledBookingStatus();
  const statusIds = await getBookingStatusIds();
  const params = await searchParams;
  const [dateRange] = await queryWithEncoding(
    `SELECT
       MIN(t.start_date_time)::date::text AS first_date,
       MAX(t.end_date_time)::date::text AS last_date
     FROM trips t
     WHERE EXISTS (
       SELECT 1
       FROM bookings b
       WHERE b.trip_id = t.id
         AND b.status_id IS DISTINCT FROM $1::int
     )`,
    [statusIds.cancelled]
  ) as DateRangeRow[];
  const requestedFrom = typeof params.from === 'string' ? params.from : undefined;
  const requestedTo = typeof params.to === 'string' ? params.to : undefined;
  const fromDate = isDateInput(requestedFrom) ? requestedFrom : dateRange?.first_date || '';
  const toDate = isDateInput(requestedTo) ? requestedTo : dateRange?.last_date || '';
  const tripTypes = await queryWithEncoding(
    `SELECT id, name
     FROM trip_type
     WHERE name IN ('ภายในจังหวัด', 'ต่างจังหวัด')
     ORDER BY id ASC`
  ) as TripTypeRow[];
  const requestedTripTypeId = typeof params.trip_type_id === 'string' ? Number(params.trip_type_id) : null;
  const tripTypeId = tripTypes.some((tripType) => tripType.id === requestedTripTypeId)
    ? requestedTripTypeId
    : null;

  const vehicleRows = await queryWithEncoding(
    `WITH filtered_trips AS (
       SELECT
         b.trip_id,
         MAX(COALESCE(b.distance, 0)) AS trip_distance
       FROM bookings b
       WHERE b.trip_id IS NOT NULL
         AND ($1::date IS NULL OR b.start_date >= $1::date)
         AND ($2::date IS NULL OR b.start_date <= $2::date)
         AND ($3::int IS NULL OR b.trip_type_id = $3::int)
         AND b.status_id IS DISTINCT FROM $4::int
       GROUP BY b.trip_id
     )
     SELECT
       c.id,
       COALESCE(NULLIF(TRIM(c.license_plate), ''), NULLIF(TRIM(c.car_number), ''), CONCAT('รถ ', c.id)) AS name,
       COUNT(DISTINCT tcd.trip_id)::int AS completed_trip_count,
       COALESCE(SUM(ft.trip_distance), 0)::numeric AS total_distance_km
     FROM trip_car_driver tcd
     INNER JOIN filtered_trips ft ON ft.trip_id = tcd.trip_id
     INNER JOIN cars c ON c.id = tcd.car_id
     GROUP BY c.id, c.license_plate, c.car_number
     ORDER BY completed_trip_count DESC, name ASC`,
    [fromDate || null, toDate || null, tripTypeId, statusIds.cancelled]
  ) as UsageRow[];

  const driverRows = await queryWithEncoding(
    `WITH filtered_trips AS (
       SELECT
         b.trip_id,
         MAX(COALESCE(b.distance, 0)) AS trip_distance
       FROM bookings b
       WHERE b.trip_id IS NOT NULL
         AND ($1::date IS NULL OR b.start_date >= $1::date)
         AND ($2::date IS NULL OR b.start_date <= $2::date)
         AND ($3::int IS NULL OR b.trip_type_id = $3::int)
         AND b.status_id IS DISTINCT FROM $4::int
       GROUP BY b.trip_id
     )
     SELECT
       d.id,
       d.fullname AS name,
       COUNT(DISTINCT tcd.trip_id)::int AS completed_trip_count,
       COALESCE(SUM(ft.trip_distance), 0)::numeric AS total_distance_km
     FROM trip_car_driver tcd
     INNER JOIN filtered_trips ft ON ft.trip_id = tcd.trip_id
     INNER JOIN drivers d ON d.id = tcd.driver_id
     GROUP BY d.id, d.fullname
     ORDER BY completed_trip_count DESC, name ASC`,
    [fromDate || null, toDate || null, tripTypeId, statusIds.cancelled]
  ) as UsageRow[];

  const departmentRows = await queryWithEncoding(
    `WITH filtered_department_trips AS (
       SELECT
         b.trip_id,
         b.department_id,
         MAX(COALESCE(b.distance, 0)) AS trip_distance
       FROM bookings b
       WHERE b.trip_id IS NOT NULL
         AND b.department_id IS NOT NULL
         AND ($1::date IS NULL OR b.start_date >= $1::date)
         AND ($2::date IS NULL OR b.start_date <= $2::date)
         AND ($3::int IS NULL OR b.trip_type_id = $3::int)
         AND b.status_id IS DISTINCT FROM $4::int
       GROUP BY b.trip_id, b.department_id
     )
     SELECT
       dep.id,
       dep.name,
       COUNT(DISTINCT fdt.trip_id)::int AS completed_trip_count,
       COALESCE(SUM(fdt.trip_distance), 0)::numeric AS total_distance_km
     FROM filtered_department_trips fdt
     INNER JOIN department dep ON dep.id = fdt.department_id
     GROUP BY dep.id, dep.name
     ORDER BY completed_trip_count DESC, name ASC`,
    [fromDate || null, toDate || null, tripTypeId, statusIds.cancelled]
  ) as UsageRow[];

  return (
    <div className="w-full animate-in slide-in-from-bottom-2 pb-12 duration-300">
      <ReportCharts
        vehicleUsage={normalizeUsage(vehicleRows)}
        driverUsage={normalizeUsage(driverRows)}
        departmentUsage={normalizeUsage(departmentRows)}
        fromDate={fromDate}
        toDate={toDate}
        tripTypes={tripTypes}
        tripTypeId={tripTypeId}
      />
    </div>
  );
}
