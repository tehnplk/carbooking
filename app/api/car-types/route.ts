export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCarTypes } from '@/lib/car-type';

export async function GET() {
  try {
    const rows = await getCarTypes();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching car types:', error);
    return NextResponse.json({ error: 'Failed to fetch car types' }, { status: 500 });
  }
}
