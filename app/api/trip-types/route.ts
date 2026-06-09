export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getTripTypes } from '@/lib/master-data';

export async function GET() {
  try {
    const rows = await getTripTypes();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching trip types:', error);
    return NextResponse.json({ error: 'Failed to fetch trip types' }, { status: 500 });
  }
}
