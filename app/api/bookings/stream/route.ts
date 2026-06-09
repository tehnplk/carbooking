export const dynamic = 'force-dynamic';
import { subscribeBookingRealtime } from '@/lib/booking-realtime';

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      send({ type: 'connected', timestamp: Date.now() });
      unsubscribe = await subscribeBookingRealtime((event) => {
        send(event);
      });

      heartbeat = setInterval(() => {
        send({ type: 'heartbeat', timestamp: Date.now() });
      }, 25000);

      request.signal.addEventListener('abort', () => {
        if (heartbeat) clearInterval(heartbeat);
        if (unsubscribe) unsubscribe();
        controller.close();
      });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
