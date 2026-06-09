import { LineBotClient, type messagingApi } from '@line/bot-sdk';

export interface BookingDetailMessage {
  id?: number | string | null;
  destination?: string | null;
  purpose?: string | null;
  distance?: number | string | null;
  passengers?: number | string | null;
  start_date?: string | Date | null;
  start_time?: string | Date | null;
  end_date?: string | Date | null;
  end_time?: string | Date | null;
  requester_name?: string | null;
  requester_position?: string | null;
  department_name?: string | null;
  self_drive?: boolean | null;
  created_at?: string | Date | null;
}

interface LinePushResult {
  broadcasted: boolean;
  reason?: string;
}

const BOOKING_LIST_URL = 'https://carbooking.plkhealth.go.th/bookings?sort=id&order=asc';
export const LINE_CHANNEL_SECRET = 'eca8f08434076b3178c832756e9453c7';
export const LINE_CHANNEL_ACCESS_TOKEN = 'bnQQM0JpZPaSIyT8iDB3EFIzpMYeYg8RHWS54c+9u7AA0XhWI3WR3Z6ruOYZOW26X6krW6GPQgd45LGSuGAtW/1FCCUeDLqWr4PdAkFhVzwLpSaxTxHJkD1wX/lNs0k9cJrE9GX5qvHf50hl0vFlSwdB04t89/1O/w1cDnyilFU=';

function getLineChannelAccessToken() {
  return LINE_CHANNEL_ACCESS_TOKEN.trim();
}

function formatCreatedAt(value?: string | Date | null) {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';

  return `${date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })} ${date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatDatePart(value?: string | Date | null) {
  if (!value) return '-';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '-';
    return value.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const dateValue = String(value);
  if (dateValue.includes('-')) {
    const [year, month, day] = dateValue.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }

  return dateValue || '-';
}

function formatTimePart(value?: string | Date | null) {
  if (!value) return '-';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '-';
    return value.toTimeString().slice(0, 5);
  }

  const timeValue = String(value);
  return timeValue.length >= 5 ? timeValue.slice(0, 5) : timeValue;
}

function normalizeDateKey(value?: string | Date | null) {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  const dateValue = String(value);
  return dateValue.includes('T') ? dateValue.split('T')[0] : dateValue;
}

function formatTravelStart(booking: BookingDetailMessage) {
  const startDate = formatDatePart(booking.start_date);
  const startTime = formatTimePart(booking.start_time);
  const endTime = formatTimePart(booking.end_time);

  if (normalizeDateKey(booking.start_date) && normalizeDateKey(booking.start_date) === normalizeDateKey(booking.end_date)) {
    return `${startDate} ${startTime} - ${endTime}`;
  }

  return `${startDate} ${startTime}`;
}

function formatTravelEnd(booking: BookingDetailMessage) {
  return `${formatDatePart(booking.end_date)} ${formatTimePart(booking.end_time)}`;
}

function formatValue(value?: number | string | null) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

export function buildBookingDetailLineMessage(booking: BookingDetailMessage) {
  const department = booking.department_name || booking.requester_position || '-';
  const lines = [
    `รายละเอียดใบขอรถ${booking.id ? ` #${booking.id}` : ''}`,
    `วันเดินทางไป: ${formatTravelStart(booking)}`,
    ...(normalizeDateKey(booking.start_date) !== normalizeDateKey(booking.end_date)
      ? [`วันเดินทางกลับ: ${formatTravelEnd(booking)}`]
      : []),
    `ปลายทาง: ${formatValue(booking.destination)}`,
    `วัตถุประสงค์: ${formatValue(booking.purpose)}`,
    `ระยะทาง: ${formatValue(booking.distance)} กม.`,
    `ผู้โดยสาร: ${formatValue(booking.passengers)} คน`,
    `ผู้ขอ: ${formatValue(booking.requester_name)}`,
    `หน่วยงาน: ${department}`,
  ];

  if (booking.self_drive) {
    lines.push('ต้องการขับเอง');
  }

  lines.push(`ขอเมื่อ: ${formatCreatedAt(booking.created_at)}`);
  lines.push(`ดูรายการ: ${BOOKING_LIST_URL}`);
  return lines.join('\n');
}

function createFlexText(text: string, options: Partial<messagingApi.FlexText> = {}): messagingApi.FlexText {
  return {
    type: 'text',
    text,
    wrap: true,
    ...options,
  };
}

function createBookingDetailRow(label: string, value?: number | string | null): messagingApi.FlexBox {
  return {
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    contents: [
      createFlexText(label, {
        color: '#64748B',
        flex: 2,
        size: 'sm',
      }),
      createFlexText(formatValue(value), {
        color: '#111827',
        flex: 5,
        size: 'sm',
      }),
    ],
  };
}

export function buildBookingDetailFlexMessage(booking: BookingDetailMessage): messagingApi.FlexMessage {
  const department = booking.department_name || booking.requester_position || '-';
  const title = `รายละเอียดใบขอรถ${booking.id ? ` #${booking.id}` : ''}`;
  const detailRows: messagingApi.FlexBox[] = [
    createBookingDetailRow('วันไป', formatTravelStart(booking)),
    ...(normalizeDateKey(booking.start_date) !== normalizeDateKey(booking.end_date)
      ? [createBookingDetailRow('วันกลับ', formatTravelEnd(booking))]
      : []),
    createBookingDetailRow('ปลายทาง', booking.destination),
    createBookingDetailRow('วัตถุประสงค์', booking.purpose),
    createBookingDetailRow('ระยะทาง', `${formatValue(booking.distance)} กม.`),
    createBookingDetailRow('ผู้โดยสาร', `${formatValue(booking.passengers)} คน`),
    createBookingDetailRow('ผู้ขอ', booking.requester_name),
    createBookingDetailRow('หน่วยงาน', department),
  ];

  if (booking.self_drive) {
    detailRows.push(createBookingDetailRow('หมายเหตุ', 'ต้องการขับเอง'));
  }

  detailRows.push(createBookingDetailRow('ขอเมื่อ', formatCreatedAt(booking.created_at)));

  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'bubble',
      size: 'mega',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          createFlexText(title, {
            color: '#065F46',
            size: 'lg',
            weight: 'bold',
          }),
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            contents: detailRows,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#10B981',
            action: {
              type: 'uri',
              label: 'จัดรถ',
              uri: BOOKING_LIST_URL,
            },
          },
        ],
      },
    },
  };
}

export function buildLineTextFlexMessage(message: string): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: message,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          createFlexText(message, {
            color: '#111827',
            size: 'md',
          }),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#10B981',
            action: {
              type: 'uri',
              label: 'ดูรายการจองรถ',
              uri: BOOKING_LIST_URL,
            },
          },
        ],
      },
    },
  };
}

async function broadcastLineMessage(message: messagingApi.Message): Promise<LinePushResult> {
  const channelAccessToken = getLineChannelAccessToken();

  if (!channelAccessToken) {
    console.warn('LINE push skipped: missing LINE_CHANNEL_ACCESS_TOKEN');
    return { broadcasted: false, reason: 'missing_channel_access_token' };
  }

  const client = LineBotClient.fromChannelAccessToken({ channelAccessToken });
  await client.broadcast({
    messages: [message],
  });

  return { broadcasted: true };
}

export function pushLineTextMessage(message: string): Promise<LinePushResult> {
  return broadcastLineMessage(buildLineTextFlexMessage(message));
}

export async function pushBookingCreatedLineMessage(booking: BookingDetailMessage) {
  return broadcastLineMessage(buildBookingDetailFlexMessage(booking));
}
