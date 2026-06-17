import { buildBookingDetailFlexMessage, type BookingDetailMessage } from './line-notify-1';

export type { BookingDetailMessage };

export type MophNotifyMessage = {
  type: string;
  [key: string]: unknown;
};

export interface MophNotifyPayload {
  messages: MophNotifyMessage[];
}

export interface MophNotifyClientOptions {
  baseUrl?: string;
  clientKey?: string;
  secretKey?: string;
  fetcher?: typeof fetch;
}

export interface MophNotifySendResult {
  ok: boolean;
  status: number;
  data?: unknown;
  text?: string;
  reason?: 'missing_credentials';
}

export const MOPH_NOTIFY_BASE_URL = 'https://morpromt2f.moph.go.th';

function getMophNotifyClientKey(options?: MophNotifyClientOptions) {
  return (options?.clientKey ?? process.env.MOPH_NOTIFY_CLIENT_KEY ?? process.env.MOPH_NOTIFY_CLIENT_ID ?? '').trim();
}

function getMophNotifySecretKey(options?: MophNotifyClientOptions) {
  return (options?.secretKey ?? process.env.MOPH_NOTIFY_SECRET_KEY ?? '').trim();
}

function getMophNotifyBaseUrl(options?: MophNotifyClientOptions) {
  return (options?.baseUrl ?? process.env.MOPH_NOTIFY_BASE_URL ?? MOPH_NOTIFY_BASE_URL).trim();
}

export function buildMophNotifyUrl(baseUrl = MOPH_NOTIFY_BASE_URL) {
  return `${baseUrl.replace(/\/+$/, '')}/api/notify/send`;
}

async function readResponseBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return { data: await response.json().catch(() => null) };
  }

  return { text: await response.text().catch(() => '') };
}

export async function sendMophNotify(
  payload: MophNotifyPayload,
  options: MophNotifyClientOptions = {},
): Promise<MophNotifySendResult> {
  const clientKey = getMophNotifyClientKey(options);
  const secretKey = getMophNotifySecretKey(options);

  if (!clientKey || !secretKey) {
    console.warn('MOPH Notify skipped: missing MOPH_NOTIFY_CLIENT_KEY or MOPH_NOTIFY_SECRET_KEY');
    return { ok: false, status: 0, reason: 'missing_credentials' };
  }

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(buildMophNotifyUrl(getMophNotifyBaseUrl(options)), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'client-key': clientKey,
      'secret-key': secretKey,
    },
    body: JSON.stringify(payload),
  });
  const body = await readResponseBody(response);

  return {
    ok: response.ok,
    status: response.status,
    ...body,
  };
}

export function buildMophNotifyTextPayload(text: string): MophNotifyPayload {
  return {
    messages: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

export function buildMophNotifyBookingCreatedPayload(booking: BookingDetailMessage): MophNotifyPayload {
  return {
    messages: [buildBookingDetailFlexMessage(booking) as MophNotifyMessage],
  };
}

export function pushBookingCreatedMophNotifyMessage(
  booking: BookingDetailMessage,
  options?: MophNotifyClientOptions,
) {
  return sendMophNotify(buildMophNotifyBookingCreatedPayload(booking), options);
}
