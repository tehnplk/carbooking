export const dynamic = 'force-dynamic';
import { queryWithEncoding } from '@/lib/db';
import EditBookingForm from '@/components/EditBookingForm';
import { ensureMasterDataSchema } from '@/lib/master-data';

export default async function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await ensureMasterDataSchema();

  const rows = await queryWithEncoding(
    `SELECT id, requester_name, requester_position, supervisor_name, supervisor_position,
            destination, purpose, fuel_reimbursement_id, distance, trip_type_id, department_id, start_time,
            end_time, passengers, status_id, self_drive
     FROM bookings
     WHERE id = $1`,
    [id]
  );

  const booking = rows[0];

  return <EditBookingForm booking={booking} />;
}
