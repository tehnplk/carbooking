export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { getBookingStatusIds, syncTravelledBookingStatus } from '@/lib/master-data';
import { ensureTripsSchema } from '@/lib/booking-trip';

export async function GET() {
  try {
    await ensureTripsSchema();
    await syncTravelledBookingStatus();
    const statusIds = await getBookingStatusIds();
    const rows = await queryWithEncoding(
      `SELECT id, trip_id, requester_name, destination, start_time, end_time, trip_type_id, passengers
       FROM bookings
       WHERE status_id = $1
       ORDER BY created_at DESC`,
      [statusIds.pending]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching pending bookings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
