export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { requireAdminAccess } from '@/lib/authz';

export async function GET() {
  try {
    const access = await requireAdminAccess();
    if (!access.ok) {
      return access.response;
    }

    const databaseInfo = await queryWithEncoding('SELECT current_database() AS database_name');
    const tableInfo = await queryWithEncoding(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'cars'`
    );
    const columnInfo = await queryWithEncoding(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'cars'
       ORDER BY ordinal_position`
    );

    return NextResponse.json({
      database: databaseInfo[0] ?? null,
      table: tableInfo[0] ?? null,
      columns: columnInfo,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
