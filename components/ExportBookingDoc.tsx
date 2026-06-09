'use client';

import { useMemo } from 'react';
import { FileText } from 'lucide-react';

interface BookingData {
  id: number;
}

export default function ExportBookingDoc({ booking }: { booking: BookingData }) {
  const downloadUrl = useMemo(() => `/api/bookings/${booking.id}/document`, [booking.id]);

  return (
    <a
      href={downloadUrl}
      title="พิมพ์เอกสาร"
      aria-label="พิมพ์เอกสาร"
      className="inline-flex w-[80px] items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-1.5 py-1 text-blue-700 transition-colors hover:bg-blue-100"
    >
      <span className="inline-flex items-center gap-0.5">
        <FileText className="h-3 w-3" />
        <span className="text-[9px] font-bold leading-none">เอกสาร</span>
      </span>
    </a>
  );
}
