export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { ensureCarTypeSchema, resolveCarTypeId, getCarTypes } from '@/lib/car-type';
import { requireCarsDriversMutationAccess } from '@/lib/authz';

export async function POST(request: Request) {
  try {
    const access = await requireCarsDriversMutationAccess();
    if (!access.ok) {
      return access.response;
    }

    const actor = access.session.user.username || access.session.user.name || 'system';
    await ensureCarTypeSchema();
    const { brand, model, license_plate, seats, car_type_id, car_type, car_number, is_active } = await request.json();
    const resolvedCarTypeId = await resolveCarTypeId({
      car_type_id: typeof car_type_id === 'number' ? car_type_id : Number(car_type_id),
      car_type,
    });

    const carTypes = await getCarTypes();
    const resolvedCarTypeName = carTypes.find((ct) => ct.id === resolvedCarTypeId)?.name || car_type;

    await queryWithEncoding(
      `SELECT setval(
         pg_get_serial_sequence('cars', 'id'),
         COALESCE((SELECT MAX(id) FROM cars), 0) + 1,
         false
       )`
    );

    await queryWithEncoding(
      `INSERT INTO cars (brand, model, license_plate, seats, car_type_id, car_type, car_number, is_active, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [brand, model, license_plate, seats, resolvedCarTypeId, resolvedCarTypeName, car_number || null, is_active ?? true, actor, actor]
    );

    return NextResponse.json({ message: 'Car added successfully' });
  } catch (error) {
    console.error('Error adding car:', error);
    return NextResponse.json({ error: 'Failed to add car' }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureCarTypeSchema();
    const rows = await queryWithEncoding(
      `SELECT c.id, c.brand, c.model, c.license_plate, c.car_number, c.seats, c.car_type_id, ct.name AS car_type, c.is_active
       FROM cars c
       LEFT JOIN car_type ct ON c.car_type_id = ct.id
       ORDER BY c.id DESC`
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching cars:', error);
    return NextResponse.json({ error: 'Failed to fetch cars' }, { status: 500 });
  }
}
