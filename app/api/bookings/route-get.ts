import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { ensureTripsSchema } from '@/lib/booking-trip';
import { ensureCarTypeSchema } from '@/lib/car-type';
import { ensureMasterDataSchema, syncTravelledBookingStatus } from '@/lib/master-data';

export async function GET() {
  try {
    await ensureTripsSchema();
    await ensureCarTypeSchema();
    await ensureMasterDataSchema();
    await syncTravelledBookingStatus();
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
         tcd_all.vehicle_assignments,
         ct.name AS car_type,
         t.start_date_time AS trip_start_date_time,
         t.end_date_time AS trip_end_date_time
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
         ) AS vehicle_assignments
         FROM trip_car_driver tcd2
         LEFT JOIN cars c2 ON tcd2.car_id = c2.id
         LEFT JOIN drivers d2 ON tcd2.driver_id = d2.id
         WHERE tcd2.trip_id = t.id
       ) tcd_all ON true
       LEFT JOIN cars c ON COALESCE(tcd.car_id, b.car_id) = c.id
       LEFT JOIN car_type ct ON c.car_type_id = ct.id
       LEFT JOIN drivers d ON COALESCE(tcd.driver_id, b.driver_id) = d.id
       LEFT JOIN booking_status bs ON b.status_id = bs.id
       ORDER BY b.created_at DESC`
    );

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}
