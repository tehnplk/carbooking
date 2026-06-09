export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { ensureMasterDataSchema } from '@/lib/master-data';

export async function GET() {
  try {
    await ensureMasterDataSchema();
    const drivers = await queryWithEncoding(
      `SELECT d.id, d.fullname, d.driver_type_id, dt.name AS driver_type_name
       FROM drivers d
       LEFT JOIN driver_type dt ON dt.id = d.driver_type_id
       WHERE d.is_active = true
       ORDER BY d.driver_type_id NULLS LAST, d.fullname ASC`
    );

    return NextResponse.json(drivers);
  } catch (error) {
    console.error('Error fetching active drivers:', error);
    return NextResponse.json({ error: 'Failed to fetch active drivers' }, { status: 500 });
  }
}
