export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { ensureMasterDataSchema, isValidUserRole } from '@/lib/master-data';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureMasterDataSchema();
    const body = await request.json();
    const { username, password, role_id, fullname, department } = body;
    const { id } = await params;

    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedPassword = typeof password === 'string' ? password.trim() : '';
    const normalizedRoleId = Number(role_id);
    const normalizedFullname = typeof fullname === 'string' ? fullname.trim() : '';
    const normalizedDepartment = typeof department === 'string' ? department.trim() : '';

    if (!normalizedUsername || !normalizedFullname || !normalizedRoleId) {
      return NextResponse.json({ error: 'Username, fullname and role are required' }, { status: 400 });
    }

    if (!(await isValidUserRole(normalizedRoleId))) {
      return NextResponse.json({ error: 'Invalid user role' }, { status: 400 });
    }

    const existing = await queryWithEncoding('SELECT id FROM users WHERE username = $1 AND id <> $2', [normalizedUsername, id]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    if (normalizedPassword) {
      await queryWithEncoding(
        `UPDATE users
         SET username = $1,
             password = $2,
             role_id = $3,
             fullname = $4,
             department = $5,
             updated_by = $6
         WHERE id = $7`,
        [normalizedUsername, normalizedPassword, normalizedRoleId, normalizedFullname, normalizedDepartment || null, 'admin', id]
      );
    } else {
      await queryWithEncoding(
        `UPDATE users
         SET username = $1,
             role_id = $2,
             fullname = $3,
             department = $4,
             updated_by = $5
         WHERE id = $6`,
        [normalizedUsername, normalizedRoleId, normalizedFullname, normalizedDepartment || null, 'admin', id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await queryWithEncoding('DELETE FROM users WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
