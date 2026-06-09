export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';
import { getBookingStatuses } from '@/lib/master-data';

export async function GET() {
  try {
    const rows = await getBookingStatuses();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching booking statuses:', error);
    return NextResponse.json({ error: 'Failed to fetch booking statuses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return NextResponse.json({ error: 'Status name is required' }, { status: 400 });
    }

    await queryWithEncoding(
      'INSERT INTO booking_status (name, is_active) VALUES ($1, COALESCE($2, TRUE))',
      [name, body?.is_active ?? true]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating booking status:', error);
    return NextResponse.json({ error: 'Failed to create booking status' }, { status: 500 });
  }
}
