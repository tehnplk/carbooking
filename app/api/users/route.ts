export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { ensureMasterDataSchema, getDefaultUserRoleId, isValidUserRole } from '@/lib/master-data';

export async function GET() {
  try {
    await ensureMasterDataSchema();
    const users = await queryWithEncoding(
      `SELECT u.id, u.username, u.role_id, ur.name AS role_name, u.fullname, u.department, u.created_at
       FROM users u
       LEFT JOIN user_role ur ON ur.id = u.role_id
       ORDER BY u.id DESC`
    );

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureMasterDataSchema();
    const body = await request.json();
    const { username, password, role_id, fullname, department } = body;

    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedPassword = typeof password === 'string' ? password.trim() : '';
    const normalizedFullname = typeof fullname === 'string' ? fullname.trim() : '';
    const normalizedDepartment = typeof department === 'string' ? department.trim() : '';
    const normalizedRoleId = Number(role_id) || await getDefaultUserRoleId();

    if (!normalizedUsername || !normalizedPassword || !normalizedFullname || !normalizedRoleId) {
      return NextResponse.json({ error: 'Username, password, fullname and role are required' }, { status: 400 });
    }

    if (!(await isValidUserRole(normalizedRoleId))) {
      return NextResponse.json({ error: 'Invalid user role' }, { status: 400 });
    }

    const existing = await queryWithEncoding('SELECT id FROM users WHERE username = $1', [normalizedUsername]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    await queryWithEncoding(
      `SELECT setval(
         pg_get_serial_sequence('users', 'id'),
         COALESCE((SELECT MAX(id) FROM users), 0) + 1,
         false
       )`
    );

    const result = await queryWithEncoding(
      `INSERT INTO users (username, password, role_id, fullname, department, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        normalizedUsername,
        normalizedPassword,
        normalizedRoleId,
        normalizedFullname,
        normalizedDepartment || null,
        'admin',
        'admin',
      ]
    );

    return NextResponse.json({ success: true, id: result[0].id });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
