export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { ensureMasterDataSchema, getDefaultDriverTypeId } from '@/lib/master-data';
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
    await ensureMasterDataSchema();
    const { fullname, is_active, note, driver_type_id } = await request.json();
    const { id } = await params;
    const normalizedDriverTypeId = Number(driver_type_id) || await getDefaultDriverTypeId();

    if (!fullname || !normalizedDriverTypeId) {
      return NextResponse.json({ error: 'Fullname and driver type are required' }, { status: 400 });
    }

    await queryWithEncoding(
      'UPDATE drivers SET fullname = $1, driver_type_id = $2, is_active = $3, note = $4, updated_by = $5 WHERE id = $6',
      [fullname, normalizedDriverTypeId, is_active, note, actor, id]
    );

    return NextResponse.json({ message: 'Driver updated successfully' });
  } catch (error) {
    console.error('Error updating driver:', error);
    return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
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
    await queryWithEncoding('DELETE FROM drivers WHERE id = $1', [id]);
    return NextResponse.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Error deleting driver:', error);
    return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 });
  }
}
