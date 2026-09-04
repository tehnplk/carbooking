export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getUserRoles } from '@/lib/master-data';
import { requireAdminAccess } from '@/lib/authz';

export async function GET() {
  try {
    const access = await requireAdminAccess();
    if (!access.ok) {
      return access.response;
    }

    const rows = await getUserRoles();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json({ error: 'Failed to fetch user roles' }, { status: 500 });
  }
}
