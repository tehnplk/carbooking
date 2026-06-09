export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { splitDateTimeLocal } from '@/lib/booking-datetime';
import { publishBookingRealtime } from '@/lib/booking-realtime';
import { ensureTripsSchema } from '@/lib/booking-trip';
import { ensureCarTypeSchema } from '@/lib/car-type';
import {
  pushBookingCreatedLineMessage as pushBookingCreatedLineMessageLine1,
  type BookingDetailMessage,
} from '@/lib/line-notify-1';
import { pushBookingCreatedLineMessage as pushBookingCreatedLineMessageLine2 } from '@/lib/line-notify-2';
import {
  ensureMasterDataSchema,
  getBookingStatusIds,
  getDefaultFuelReimbursementId,
  getDefaultTripTypeId,
  isValidDepartment,
  isValidFuelReimbursement,
  isValidTripType,
  syncTravelledBookingStatus,
} from '@/lib/master-data';

async function pushBookingCreatedLineMessageWithFallback(booking: BookingDetailMessage) {
  try {
    const line1Result = await pushBookingCreatedLineMessageLine1(booking);
    if (line1Result.broadcasted) return line1Result;

    console.warn('LINE 1 push skipped after booking creation:', line1Result.reason);
  } catch (line1Error) {
    console.error('LINE 1 push failed after booking creation:', line1Error);
  }

  const line2Result = await pushBookingCreatedLineMessageLine2(booking);
  if (!line2Result.broadcasted) {
    console.warn('LINE 2 push skipped after booking creation:', line2Result.reason);
  }

  return line2Result;
}

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
         t.end_date_time AS trip_end_date_time,
         tt.name AS trip_type_name,
         fr.name AS fuel_reimbursement_name,
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
       LEFT JOIN trip_type tt ON b.trip_type_id = tt.id
       LEFT JOIN fuel_reimbursement fr ON b.fuel_reimbursement_id = fr.id
       LEFT JOIN department dp ON b.department_id = dp.id
       ORDER BY b.created_at DESC`
    );

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureTripsSchema();
    await ensureCarTypeSchema();
    await ensureMasterDataSchema();
    const body = await request.json();
    const {
      destination,
      purpose,
      fuel_reimbursement_id,
      distance,
      start_time,
      end_time,
      requester_name,
      requester_position,
      supervisor_name,
      supervisor_position,
      department_id,
      passengers,
      trip_type_id,
      self_drive,
    } = body;

    const passengerCount = Number(passengers);
    const normalizedSelfDrive = self_drive === true || self_drive === 'true';
    const normalizedTripTypeId = Number(trip_type_id) || await getDefaultTripTypeId();
    const normalizedFuelReimbursementId = Number(fuel_reimbursement_id) || await getDefaultFuelReimbursementId();
    const normalizedDepartmentId = Number(department_id);
    const statusIds = await getBookingStatusIds();
    const startDateTime = splitDateTimeLocal(start_time);
    const endDateTime = splitDateTimeLocal(end_time);

    if (!requester_name || !requester_position || !supervisor_name || !supervisor_position) {
      return NextResponse.json({ error: 'Requester and supervisor information is required' }, { status: 400 });
    }

    if (!normalizedDepartmentId || !(await isValidDepartment(normalizedDepartmentId))) {
      return NextResponse.json({ error: 'Department is required' }, { status: 400 });
    }

    if (!destination || !purpose || !start_time || !end_time) {
      return NextResponse.json({ error: 'Trip details are required' }, { status: 400 });
    }

    if (!Number.isFinite(passengerCount) || passengerCount < 1) {
      return NextResponse.json({ error: 'Passenger count must be at least 1' }, { status: 400 });
    }

    if (!normalizedTripTypeId || !(await isValidTripType(normalizedTripTypeId))) {
      return NextResponse.json({ error: 'Invalid trip type' }, { status: 400 });
    }

    if (!normalizedFuelReimbursementId || !(await isValidFuelReimbursement(normalizedFuelReimbursementId))) {
      return NextResponse.json({ error: 'Invalid fuel reimbursement' }, { status: 400 });
    }

    const result = await queryWithEncoding(
      `INSERT INTO bookings (
        destination,
        purpose,
        fuel_reimbursement_id,
        distance,
        start_date,
        start_time,
        end_date,
        end_time,
        requester_name,
        requester_position,
        supervisor_name,
        supervisor_position,
        department_id,
        passengers,
        trip_type_id,
        status_id,
        self_drive,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
      RETURNING id`,
      [
        destination,
        purpose,
        normalizedFuelReimbursementId,
        distance !== '' && distance !== null && distance !== undefined ? Number(distance) : null,
        startDateTime.date,
        startDateTime.time,
        endDateTime.date,
        endDateTime.time,
        requester_name,
        requester_position,
        supervisor_name,
        supervisor_position,
        normalizedDepartmentId,
        passengerCount,
        normalizedTripTypeId,
        statusIds.pending,
        normalizedSelfDrive,
      ]
    ) as { id: number }[];

    await publishBookingRealtime({
      action: 'created',
      bookingId: result[0].id,
      bookingIds: [result[0].id],
      tripId: null,
    });

    const bookingDetails = await queryWithEncoding(
      `SELECT
         b.id,
         b.destination,
         b.purpose,
         b.distance,
         b.passengers,
         b.start_date,
         b.start_time,
         b.end_date,
         b.end_time,
         b.requester_name,
         b.requester_position,
         b.self_drive,
         b.created_at,
         dp.name AS department_name
       FROM bookings b
       LEFT JOIN department dp ON b.department_id = dp.id
       WHERE b.id = $1
       LIMIT 1`,
      [result[0].id]
    ) as Array<{
      id: number;
      destination: string | null;
      purpose: string | null;
      distance: number | string | null;
      passengers: number | string | null;
      start_date: string | Date | null;
      start_time: string | Date | null;
      end_date: string | Date | null;
      end_time: string | Date | null;
      requester_name: string | null;
      requester_position: string | null;
      self_drive: boolean | null;
      created_at: string | Date | null;
      department_name: string | null;
    }>;

    if (bookingDetails[0]) {
      try {
        await pushBookingCreatedLineMessageWithFallback(bookingDetails[0]);
      } catch (lineError) {
        console.error('LINE push failed after booking creation:', lineError);
      }
    }

    return NextResponse.json({ success: true, id: result[0].id });
  } catch (error) {
    console.error('Database error while creating booking:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
