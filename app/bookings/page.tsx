import { queryWithEncoding } from '@/lib/db';
import BookingListClient from '@/components/BookingListClient';
import { ensureTripsSchema } from '@/lib/booking-trip';
import { ensureCarTypeSchema } from '@/lib/car-type';
import { ensureMasterDataSchema, getBookingStatusIds, getDepartments, syncTravelledBookingStatus } from '@/lib/master-data';
import { auth } from '@/auth';
import { canAssignBookings } from '@/lib/authz';

export const dynamic = 'force-dynamic';

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sort = typeof params.sort === 'string' ? params.sort : 'start_time';
  const tab = typeof params.tab === 'string' ? params.tab : 'pending';
  const defaultOrder = tab === 'all' && sort === 'start_time' ? 'desc' : 'asc';
  const order = typeof params.order === 'string' ? params.order.toLowerCase() : defaultOrder;

  const validSortColumns = ['id', 'start_time', 'created_at'];
  const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
  const orderBy =
    sort === 'start_time'
      ? `b.start_date ${sortOrder}, b.start_time ${sortOrder}`
      : validSortColumns.includes(sort)
        ? `b.${sort} ${sortOrder}`
        : `b.start_date ${sortOrder}, b.start_time ${sortOrder}`;

  await ensureTripsSchema();
  await ensureCarTypeSchema();
  await ensureMasterDataSchema();
  await syncTravelledBookingStatus();
  const session = await auth();
  const canAssignBooking = canAssignBookings(session);
  const statusIds = await getBookingStatusIds();
  const departments = await getDepartments();
  const bookings = await queryWithEncoding(
    `SELECT
       b.*,
       b.status_id,
       bs.name AS status_text,
       COALESCE(tcd.car_id, b.car_id) AS car_id,
       COALESCE(tcd.driver_id, b.driver_id) AS driver_id,
       d.fullname AS driver_name,
       c.brand,
       c.model,
       c.license_plate,
       c.car_number,
       c.seats,
       tcd_all.vehicle_assignments,
       tcd_all.vehicle_details,
       ct.name AS car_type,
       t.start_date_time AS trip_start_date_time,
       t.end_date_time AS trip_end_date_time,
       tt.name AS trip_type_name,
       dp.name AS department_name
     FROM bookings b
     LEFT JOIN trips t ON b.trip_id = t.id
     LEFT JOIN LATERAL (
       SELECT car_id, driver_id
       FROM trip_car_driver
       WHERE trip_id = t.id
       ORDER BY id ASC
       LIMIT 1
     ) tcd ON true
     LEFT JOIN LATERAL (
       SELECT string_agg(
         concat_ws(',', c2.license_plate, d2.fullname),
         E'\n'
         ORDER BY tcd2.id ASC
       ) AS vehicle_assignments,
       json_agg(
         json_build_object(
           'license_plate', c2.license_plate,
           'driver_name', d2.fullname,
           'brand', c2.brand,
           'model', c2.model,
           'car_number', c2.car_number,
           'seats', c2.seats,
           'car_type', ct2.name
         )
         ORDER BY tcd2.id ASC
       ) AS vehicle_details
       FROM trip_car_driver tcd2
       LEFT JOIN cars c2 ON tcd2.car_id = c2.id
       LEFT JOIN car_type ct2 ON c2.car_type_id = ct2.id
       LEFT JOIN drivers d2 ON tcd2.driver_id = d2.id
       WHERE tcd2.trip_id = t.id
     ) tcd_all ON true
     LEFT JOIN cars c ON COALESCE(tcd.car_id, b.car_id) = c.id
     LEFT JOIN car_type ct ON c.car_type_id = ct.id
     LEFT JOIN drivers d ON COALESCE(tcd.driver_id, b.driver_id) = d.id
     LEFT JOIN booking_status bs ON b.status_id = bs.id
     LEFT JOIN trip_type tt ON b.trip_type_id = tt.id
     LEFT JOIN department dp ON b.department_id = dp.id
     ORDER BY ${orderBy}`
  );

  return (
    <BookingListClient
      initialBookings={bookings}
      departments={departments}
      sort={sort}
      order={order}
      statusIds={statusIds}
      canAssignBookings={canAssignBooking}
      isAuthenticated={!!session?.user}
    />
  );
}
