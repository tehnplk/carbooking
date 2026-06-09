export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryWithEncoding } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : (typeof body?.status === 'string' ? body.status.trim() : '');
    const { id } = await params;

    if (!name) {
      return NextResponse.json({ error: 'Status name is required' }, { status: 400 });
    }

    await queryWithEncoding(
      'UPDATE booking_status SET name = $1, is_active = COALESCE($2, is_active) WHERE id = $3',
      [name, body?.is_active, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await queryWithEncoding('DELETE FROM booking_status WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking status:', error);
    return NextResponse.json({ error: 'Failed to delete booking status' }, { status: 500 });
  }
}
