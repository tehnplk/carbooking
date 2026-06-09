export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { ensureCarTypeSchema } from '@/lib/car-type';

export async function GET() {
  try {
    await ensureCarTypeSchema();
    const rows = await queryWithEncoding(
      `SELECT c.id, c.brand, c.model, c.license_plate, c.car_type_id, ct.name AS car_type, c.seats
       FROM cars c
       LEFT JOIN car_type ct ON c.car_type_id = ct.id
       WHERE c.is_active = true
       ORDER BY c.id DESC`
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching cars:', error);
    return NextResponse.json({ error: 'Failed to fetch cars' }, { status: 500 });
  }
}
