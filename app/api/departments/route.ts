export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { ensureDepartmentSchema, getDepartments } from '@/lib/department';
import { requireDepartmentMutationAccess } from '@/lib/authz';

export async function GET() {
  try {
    const departments = await getDepartments();
    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireDepartmentMutationAccess();
    if (!access.ok) {
      return access.response;
    }

    await ensureDepartmentSchema();
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const isActive = typeof body?.is_active === 'boolean' ? body.is_active : true;

    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const inserted = await queryWithEncoding(
      `INSERT INTO department (name, is_active)
       VALUES ($1, $2)
       RETURNING id, name, is_active`,
      [name, isActive]
    ) as Array<{ id: number; name: string; is_active: boolean }>;

    return NextResponse.json(inserted[0]);
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  }
}
