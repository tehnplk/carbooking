import pool from '@/lib/db';
import type { PoolClient } from 'pg';

export const BOOKING_REALTIME_CHANNEL = 'booking_changes';

type BookingRealtimeEvent = {
  action: 'created' | 'updated' | 'deleted';
  bookingId?: number;
  bookingIds?: number[];
  tripId?: number | null;
  timestamp: number;
};

type BookingRealtimeListener = (event: BookingRealtimeEvent) => void;

type BookingRealtimeState = {
  client: PoolClient | null;
  listeners: Set<BookingRealtimeListener>;
  initPromise: Promise<void> | null;
};

declare global {
  var __bookingRealtimeState__: BookingRealtimeState | undefined;
}

function getRealtimeState(): BookingRealtimeState {
  if (!globalThis.__bookingRealtimeState__) {
    globalThis.__bookingRealtimeState__ = {
      client: null,
      listeners: new Set<BookingRealtimeListener>(),
      initPromise: null,
    };
  }

  return globalThis.__bookingRealtimeState__;
}

function resetRealtimeClient(state: BookingRealtimeState) {
  if (state.client) {
    state.client.removeAllListeners('notification');
    state.client.removeAllListeners('error');
    state.client.removeAllListeners('end');
    state.client.release();
  }

  state.client = null;
  state.initPromise = null;
}

export async function ensureBookingRealtimeListener() {
  const state = getRealtimeState();

  if (state.client) {
    return;
  }

  if (!state.initPromise) {
    state.initPromise = (async () => {
      const client = await pool.connect();

      client.on('notification', (message) => {
        if (message.channel !== BOOKING_REALTIME_CHANNEL || !message.payload) {
          return;
        }

        try {
          const payload = JSON.parse(message.payload) as BookingRealtimeEvent;
          for (const listener of state.listeners) {
            listener(payload);
          }
        } catch (error) {
          console.error('Failed to parse booking realtime payload:', error);
        }
      });

      client.on('error', (error) => {
        console.error('Booking realtime listener error:', error);
        resetRealtimeClient(state);
      });

      client.on('end', () => {
        resetRealtimeClient(state);
      });

      await client.query(`LISTEN ${BOOKING_REALTIME_CHANNEL}`);
      state.client = client;
    })().catch((error) => {
      state.initPromise = null;
      throw error;
    });
  }

  await state.initPromise;
}

export async function subscribeBookingRealtime(listener: BookingRealtimeListener) {
  await ensureBookingRealtimeListener();
  const state = getRealtimeState();
  state.listeners.add(listener);

  return () => {
    state.listeners.delete(listener);
  };
}

export async function publishBookingRealtime(event: Omit<BookingRealtimeEvent, 'timestamp'>) {
  const payload: BookingRealtimeEvent = {
    ...event,
    timestamp: Date.now(),
  };

  await pool.query('SELECT pg_notify($1, $2)', [BOOKING_REALTIME_CHANNEL, JSON.stringify(payload)]);
}
