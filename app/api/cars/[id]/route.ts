export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { ensureCarTypeSchema, resolveCarTypeId } from '@/lib/car-type';
import { requireCarsDriversMutationAccess } from '@/lib/authz';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireCarsDriversMutationAccess();
    if (!access.ok) {
      return access.response;
    }

    const actor = access.session.user.username || access.session.user.name || 'system';
    await ensureCarTypeSchema();
    const { brand, model, license_plate, seats, car_type_id, car_type, car_number, is_active } = await request.json();
    const { id } = await params;
    const resolvedCarTypeId = await resolveCarTypeId({
      car_type_id: typeof car_type_id === 'number' ? car_type_id : Number(car_type_id),
      car_type,
    });

    await queryWithEncoding(
      `UPDATE cars
       SET brand = $1,
           model = $2,
           license_plate = $3,
           seats = $4,
           car_type_id = $5,
           car_type = (SELECT name FROM car_type WHERE id = $5),
           car_number = $6,
           is_active = $7,
           updated_by = $8
       WHERE id = $9`,
      [
        brand,
        model,
        license_plate,
        seats,
        resolvedCarTypeId,
        car_number || null,
        is_active !== undefined ? is_active : true,
        actor,
        id,
      ]
    );

    return NextResponse.json({ message: 'Car updated successfully' });
  } catch (error) {
    console.error('Error updating car:', error);
    return NextResponse.json({ error: 'Failed to update car' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireCarsDriversMutationAccess();
    if (!access.ok) {
      return access.response;
    }

    const { id } = await params;
    await queryWithEncoding('DELETE FROM cars WHERE id = $1', [id]);
    return NextResponse.json({ message: 'Car deleted successfully' });
  } catch (error) {
    console.error('Error deleting car:', error);
    return NextResponse.json({ error: 'Failed to delete car' }, { status: 500 });
  }
}
