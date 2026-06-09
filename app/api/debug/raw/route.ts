export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { ensureCarTypeSchema } from '@/lib/car-type';

export async function GET() {
  try {
    await ensureCarTypeSchema();
    const rows = await queryWithEncoding(
      `SELECT c.id, c.brand, c.model, c.license_plate, ct.name AS car_type, c.is_active
       FROM cars c
       LEFT JOIN car_type ct ON c.car_type_id = ct.id
       ORDER BY c.id`
    );
    return NextResponse.json(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
