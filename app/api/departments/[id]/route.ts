export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { requireDepartmentMutationAccess } from '@/lib/authz';
import { ensureDepartmentSchema } from '@/lib/department';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireDepartmentMutationAccess();
    if (!access.ok) {
      return access.response;
    }

    await ensureDepartmentSchema();
    const { id } = await params;
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const isActive = typeof body?.is_active === 'boolean' ? body.is_active : true;

    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const updated = await queryWithEncoding(
      `UPDATE department
       SET name = $1,
           is_active = $2
       WHERE id = $3
       RETURNING id, name, is_active`,
      [name, isActive, id]
    ) as Array<{ id: number; name: string; is_active: boolean }>;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireDepartmentMutationAccess();
    if (!access.ok) {
      return access.response;
    }

    await ensureDepartmentSchema();
    const { id } = await params;
    await queryWithEncoding('DELETE FROM department WHERE id = $1', [id]);

    return NextResponse.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
  }
}
