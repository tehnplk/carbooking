export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { ensureMasterDataSchema, getDefaultDriverTypeId } from '@/lib/master-data';
import { requireCarsDriversMutationAccess } from '@/lib/authz';

export async function GET() {
  try {
    await ensureMasterDataSchema();
    const drivers = await queryWithEncoding(
      `SELECT d.id, d.fullname, d.driver_type_id, dt.name AS driver_type_name,
              d.is_active, d.note, d.created_at
       FROM drivers d
       LEFT JOIN driver_type dt ON dt.id = d.driver_type_id
       ORDER BY d.driver_type_id NULLS LAST, d.fullname ASC`
    );

    return NextResponse.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireCarsDriversMutationAccess();
    if (!access.ok) {
      return access.response;
    }

    const actor = access.session.user.username || access.session.user.name || 'system';
    await ensureMasterDataSchema();
    const body = await request.json();
    const { fullname, is_active, note, driver_type_id } = body;
    const normalizedDriverTypeId = Number(driver_type_id) || await getDefaultDriverTypeId();

    if (!fullname || !normalizedDriverTypeId) {
      return NextResponse.json({ error: 'Fullname and driver type are required' }, { status: 400 });
    }

    await queryWithEncoding(
      `INSERT INTO drivers (fullname, driver_type_id, is_active, note, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [fullname, normalizedDriverTypeId, is_active ?? true, note || null, actor, actor]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating driver:', error);
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 });
  }
}
