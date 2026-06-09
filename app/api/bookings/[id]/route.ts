export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { splitDateTimeLocal } from '@/lib/booking-datetime';
import { publishBookingRealtime } from '@/lib/booking-realtime';
import { ensureTripsSchema, toDateKey } from '@/lib/booking-trip';
import { requireBookingAssignmentAccess } from '@/lib/authz';
import {
  ensureMasterDataSchema,
  getBookingStatusIds,
  getDefaultFuelReimbursementId,
  getDefaultTripTypeId,
  isValidBookingStatus,
  isValidDepartment,
  isValidFuelReimbursement,
  isValidTripType,
} from '@/lib/master-data';

function normalizeDatePart(value?: string | null) {
  if (!value) return '';
  const normalizedValue = String(value);
  return normalizedValue.includes('T') ? normalizedValue.split('T')[0] : normalizedValue;
}

function normalizeTimePart(value?: string | null) {
  if (!value) return '';
  const normalizedValue = String(value);
  return normalizedValue.length >= 8 ? normalizedValue.slice(0, 8) : normalizedValue.length === 5 ? `${normalizedValue}:00` : normalizedValue;
}

function buildBookingDateTimeString(date?: string | null, time?: string | null) {
  const normalizedDate = normalizeDatePart(date);
  const normalizedTime = normalizeTimePart(time);
  if (!normalizedDate || !normalizedTime) return null;
  return `${normalizedDate}T${normalizedTime}`;
}

function getDateTimeSortValue(dateTime: string | null) {
  if (!dateTime) return Number.POSITIVE_INFINITY;
  const parsed = new Date(dateTime);
  return Number.isNaN(parsed.getTime()) ? Number.POSITIVE_INFINITY : parsed.getTime();
}

type AssignmentInput = {
  car_id?: number | string | null;
  driver_id?: number | string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTripsSchema();
    const { id } = await params;

    const bookingRows = await queryWithEncoding(
      'SELECT trip_id FROM bookings WHERE id = $1 LIMIT 1',
      [id]
    ) as { trip_id: number | null }[];
    const tripId = bookingRows[0]?.trip_id ?? null;

    if (!tripId) {
      return NextResponse.json({ trip_id: null, assignments: [] });
    }

    const assignments = await queryWithEncoding(
      `SELECT
         tcd.id,
         tcd.trip_id,
         tcd.car_id,
         tcd.driver_id,
         c.brand,
         c.model,
         c.license_plate,
         c.seats,
         ct.name AS car_type,
         d.fullname AS driver_name
       FROM trip_car_driver tcd
       LEFT JOIN cars c ON tcd.car_id = c.id
       LEFT JOIN car_type ct ON c.car_type_id = ct.id
       LEFT JOIN drivers d ON tcd.driver_id = d.id
       WHERE tcd.trip_id = $1
       ORDER BY tcd.id ASC`,
      [tripId]
    );

    return NextResponse.json({ trip_id: tripId, assignments });
  } catch (error) {
    console.error('Error fetching booking assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch booking assignments' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTripsSchema();
    await ensureMasterDataSchema();
    const body = await request.json();
    const { car_id, driver_id, other_ids } = body;
    const assignmentPayload: AssignmentInput[] = Array.isArray(body.assignments) ? body.assignments : [];
    const { id } = await params;

    const isAssignmentPayload =
      Object.prototype.hasOwnProperty.call(body, 'car_id') ||
      Object.prototype.hasOwnProperty.call(body, 'driver_id') ||
      Object.prototype.hasOwnProperty.call(body, 'assignments') ||
      Object.prototype.hasOwnProperty.call(body, 'other_ids');

    if (isAssignmentPayload) {
      const access = await requireBookingAssignmentAccess();
      if (!access.ok) {
        return access.response;
      }
    }

    if (!isAssignmentPayload) {
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
        status_id,
        self_drive,
      } = body;

      const passengerCount = Number(passengers);
      const normalizedSelfDrive = self_drive === true || self_drive === 'true';
      const normalizedTripTypeId = Number(trip_type_id) || await getDefaultTripTypeId();
      const normalizedFuelReimbursementId = Number(fuel_reimbursement_id) || await getDefaultFuelReimbursementId();
      const normalizedDepartmentId = Number(department_id);
      const normalizedStatusId = Number(status_id);
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

      if (normalizedStatusId && !(await isValidBookingStatus(normalizedStatusId))) {
        return NextResponse.json({ error: 'Invalid booking status' }, { status: 400 });
      }

      await queryWithEncoding(
        `UPDATE bookings
         SET destination = $1,
             purpose = $2,
             fuel_reimbursement_id = $3,
             distance = $4,
             start_date = $5,
             start_time = $6,
             end_date = $7,
             end_time = $8,
             requester_name = $9,
             requester_position = $10,
             supervisor_name = $11,
             supervisor_position = $12,
             department_id = $13,
             passengers = $14,
             trip_type_id = $15,
             status_id = $16,
             self_drive = $17
         WHERE id = $18`,
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
          normalizedStatusId || statusIds.pending,
          normalizedSelfDrive,
          id,
        ]
      );

      await publishBookingRealtime({
        action: 'updated',
        bookingId: Number(id),
        bookingIds: [Number(id)],
        tripId: null,
      });

      return NextResponse.json({ message: 'Booking updated successfully' });
    }

    const normalizedAssignments = (
      assignmentPayload.length > 0
        ? assignmentPayload
        : [{ car_id, driver_id }]
    )
      .map((assignment) => ({
        car_id: Number(assignment?.car_id),
        driver_id: Number(assignment?.driver_id),
      }))
      .filter((assignment) => Number.isFinite(assignment.car_id) && Number.isFinite(assignment.driver_id));

    const uniqueAssignmentKeys = new Set<string>();
    const dedupedAssignments = normalizedAssignments.filter((assignment) => {
      const key = `${assignment.car_id}:${assignment.driver_id}`;
      if (uniqueAssignmentKeys.has(key)) return false;
      uniqueAssignmentKeys.add(key);
      return true;
    });
    const firstAssignment = dedupedAssignments[0] ?? null;

    if (!firstAssignment) {
      return NextResponse.json({ error: 'Car and driver are required before assigning a trip' }, { status: 400 });
    }

    const statusIds = await getBookingStatusIds();
    const targetIds = [Number(id), ...(Array.isArray(other_ids) ? other_ids.map(Number) : [])]
      .filter((value, index, array) => Number.isFinite(value) && array.indexOf(value) === index);

    if (targetIds.length > 1) {
      const bookingRows = await queryWithEncoding(
        `SELECT id,
                start_date::text AS start_date,
                start_time::text AS start_time,
                end_date::text AS end_date,
                end_time::text AS end_time,
                trip_id
         FROM bookings
         WHERE id = ANY($1::int[])`,
        [targetIds]
      ) as { id: number; start_date: string | null; start_time: string; end_date: string | null; end_time: string; trip_id: number | null }[];

      const dateKeys = Array.from(new Set(bookingRows.map((row) => toDateKey(row.start_date)).filter(Boolean)));

      if (dateKeys.length > 1 || bookingRows.length !== targetIds.length) {
        return NextResponse.json({ error: 'Trips can only be merged when departure date is the same' }, { status: 400 });
      }
    }

    const bookingRows = await queryWithEncoding(
      `SELECT id,
              start_date::text AS start_date,
              start_time::text AS start_time,
              end_date::text AS end_date,
              end_time::text AS end_time,
              trip_id
       FROM bookings
       WHERE id = ANY($1::int[])`,
      [targetIds]
    ) as { id: number; start_date: string | null; start_time: string; end_date: string | null; end_time: string; trip_id: number | null }[];

    const baseBooking = bookingRows.find((row) => row.id === Number(id)) || bookingRows[0];
    if (!baseBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const previousTripId = baseBooking.trip_id;
    let detachedIds: number[] = [];

    if (previousTripId) {
      const previousTripRows = await queryWithEncoding(
        'SELECT id FROM bookings WHERE trip_id = $1',
        [previousTripId]
      ) as { id: number }[];

      detachedIds = previousTripRows
        .map((row) => Number(row.id))
        .filter((bookingId) => Number.isFinite(bookingId) && !targetIds.includes(bookingId));

      if (detachedIds.length > 0) {
        await queryWithEncoding(
          `UPDATE bookings
           SET trip_id = NULL,
               car_id = NULL,
               driver_id = NULL,
               status_id = $1
           WHERE id = ANY($2::int[])`,
          [statusIds.pending, detachedIds]
        );
      }
    }

    const tripStartDateTime = bookingRows
      .map((row) => buildBookingDateTimeString(row.start_date, row.start_time))
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => getDateTimeSortValue(a) - getDateTimeSortValue(b))[0] ?? null;
    const tripEndDateTime = bookingRows
      .map((row) => buildBookingDateTimeString(row.end_date, row.end_time))
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => getDateTimeSortValue(b) - getDateTimeSortValue(a))[0] ?? null;

    if (!tripStartDateTime || !tripEndDateTime) {
      return NextResponse.json({ error: 'Trip datetime could not be determined' }, { status: 400 });
    }

    let tripId = baseBooking.trip_id;

    if (tripId) {
      await queryWithEncoding(
        `UPDATE trips
         SET start_date_time = $1,
             end_date_time = $2,
             updated_at = CURRENT_TIMESTAMP,
             updated_by = $3
         WHERE id = $4`,
        [tripStartDateTime, tripEndDateTime, 'admin', tripId]
      );
    } else {
      const createdTrips = await queryWithEncoding(
        `INSERT INTO trips (
           start_date_time,
           end_date_time,
           created_at,
           updated_at,
           created_by,
           updated_by
         ) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3, $4)
         RETURNING id`,
        [tripStartDateTime, tripEndDateTime, 'admin', 'admin']
      ) as { id: number }[];

      tripId = createdTrips[0]?.id ?? null;
    }

    if (!tripId) {
      return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
    }

    await queryWithEncoding('DELETE FROM trip_car_driver WHERE trip_id = $1', [tripId]);
    for (const assignment of dedupedAssignments) {
      await queryWithEncoding(
        `INSERT INTO trip_car_driver (trip_id, car_id, driver_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (trip_id, car_id, driver_id) DO NOTHING`,
        [tripId, assignment.car_id, assignment.driver_id]
      );
    }

    await queryWithEncoding(
      `UPDATE bookings
       SET trip_id = $1,
           car_id = $2,
           driver_id = $3,
           status_id = $4
       WHERE id = ANY($5::int[])`,
      [tripId, firstAssignment.car_id, firstAssignment.driver_id, statusIds.assigned, targetIds]
    );

    await publishBookingRealtime({
      action: 'updated',
      bookingId: Number(id),
      bookingIds: [...targetIds, ...detachedIds],
      tripId,
    });

    return NextResponse.json({
      message: 'Bookings assigned successfully',
      trip_id: tripId,
      status_id: statusIds.assigned,
      assignments: dedupedAssignments,
      affected_ids: targetIds,
      detached_ids: detachedIds,
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTripsSchema();
    await ensureMasterDataSchema();
    const { id } = await params;

    const bookingRows = await queryWithEncoding(
      'SELECT trip_id FROM bookings WHERE id = $1 LIMIT 1',
      [id]
    ) as { trip_id: number | null }[];
    const tripId = bookingRows[0]?.trip_id ?? null;

    const statusIds = await getBookingStatusIds();
    await queryWithEncoding(
      'UPDATE bookings SET status_id = $1, trip_id = NULL, car_id = NULL, driver_id = NULL WHERE id = $2',
      [statusIds.cancelled, id]
    );

    if (tripId) {
      const remaining = await queryWithEncoding(
        `SELECT start_time, end_time FROM bookings
         WHERE trip_id = $1 AND status_id != $2`,
        [tripId, statusIds.cancelled]
      ) as { start_time: string; end_time: string }[];

      if (remaining.length === 0) {
        await queryWithEncoding('DELETE FROM trips WHERE id = $1', [tripId]);
      } else {
        const newStart = remaining.map((r) => r.start_time).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
        const newEnd = remaining.map((r) => r.end_time).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
        await queryWithEncoding(
          'UPDATE trips SET start_date_time = $1, end_date_time = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [newStart, newEnd, tripId]
        );
      }
    }

    await publishBookingRealtime({
      action: 'deleted',
      bookingId: Number(id),
      bookingIds: [Number(id)],
      tripId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
  }
}
