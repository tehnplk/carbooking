export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getFuelReimbursements } from '@/lib/master-data';

export async function GET() {
  try {
    const rows = await getFuelReimbursements();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching fuel reimbursements:', error);
    return NextResponse.json({ error: 'Failed to fetch fuel reimbursements' }, { status: 500 });
  }
}
