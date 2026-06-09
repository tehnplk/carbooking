import { NextResponse } from 'next/server';
import { pushLineTextMessage } from '@/lib/line-notify-1';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as {
      message?: unknown;
      text?: unknown;
    } | null;

    const message = typeof body?.message === 'string'
      ? body.message
      : typeof body?.text === 'string'
        ? body.text
        : '';

    if (!message.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const result = await pushLineTextMessage(message);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('LINE 1 webhook push error:', error);
    return NextResponse.json({ error: 'Failed to push LINE 1 message' }, { status: 500 });
  }
}
