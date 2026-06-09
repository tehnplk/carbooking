export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDriverTypes } from '@/lib/master-data';

export async function GET() {
  try {
    const rows = await getDriverTypes();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching driver types:', error);
    return NextResponse.json({ error: 'Failed to fetch driver types' }, { status: 500 });
  }
}
