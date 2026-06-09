'use client';

import { useState } from 'react';
import { Ban, Edit3, Loader2 } from 'lucide-react';
import AssignBookingModal from '@/components/AssignBookingModal';
import type { BookingStatusIds } from '@/lib/booking-flow';
import { useRouter } from 'next/navigation';
import { confirmDelete, showError, showSuccess } from '@/lib/swal';

interface BookingRow {
  id: number;
  trip_id?: number | null;
  requester_name?: string;
  destination: string;
  trip_type_id?: number | null;
  start_date?: string | Date | null;
  start_time?: string | Date;
  end_date?: string | Date | null;
  end_time?: string | Date | null;
  car_id?: number | null;
  driver_id?: number | null;
  status_id?: number | null;
  status_text?: string | null;
  passengers?: number | string | null;
}

interface MergeBooking {
  id: number;
  trip_id?: number | null;
  requester_name: string;
  destination: string;
  start_date?: string | Date | null;
  start_time: string | Date;
  end_date?: string | Date | null;
  end_time: string | Date;
  trip_type_id: number | null;
  passengers: number;
}

function normalizeDatePart(value?: string | Date | null) {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const normalizedValue = String(value);
  return normalizedValue.includes('T') ? normalizedValue.split('T')[0] : normalizedValue;
}

function normalizeTimePart(value?: string | Date | null) {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return value.toTimeString().slice(0, 5);
  }
  const normalizedValue = String(value);
  return normalizedValue.length >= 5 ? normalizedValue.slice(0, 5) : normalizedValue;
}

function buildBookingDateTime(date?: string | Date | null, time?: string | Date | null) {
  const normalizedDate = normalizeDatePart(date);
  const normalizedTime = normalizeTimePart(time);
  if (!normalizedDate || !normalizedTime) return null;

  const [year, month, day] = normalizedDate.split('-').map(Number);
  const [hours, minutes] = normalizedTime.split(':').map(Number);

  if (![year, month, day, hours, minutes].every((item) => Number.isFinite(item))) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

interface BookingRowProps {
  booking: BookingRow;
  view: 'desktop' | 'mobile';
  statusIds: BookingStatusIds;
  allowTripMerge?: boolean;
  mergeBookings?: MergeBooking[];
  initialOtherIds?: number[];
}

export default function BookingActions({
  booking,
  view,
  statusIds,
  allowTripMerge = false,
  mergeBookings = [],
  initialOtherIds = [],
}: BookingRowProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isAssigned = booking.status_id === statusIds.assigned;
  const canCancel = booking.status_id !== statusIds.cancelled && booking.status_id !== statusIds.completed;
  const modalBooking = {
    ...booking,
    requester_name: booking.requester_name || '',
    trip_id: booking.trip_id ?? null,
    start_date: normalizeDatePart(booking.start_date) || null,
    start_time: normalizeTimePart(booking.start_time),
    end_date: normalizeDatePart(booking.end_date) || null,
    car_id: booking.car_id ?? null,
    driver_id: booking.driver_id ?? null,
  };

  const handleDelete = async () => {
    const requesterName = booking.requester_name || 'ไม่ระบุผู้ขอ';
    const bookingDateTime = buildBookingDateTime(booking.start_date, booking.start_time);
    const travelDate = bookingDateTime
      ? bookingDateTime.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
      : 'ไม่ระบุวันเดินทาง';
    const destination = booking.destination ? `สถานที่: ${booking.destination}` : 'สถานที่: -';
    const statusLabel = booking.status_text ? `สถานะ: ${booking.status_text}` : 'สถานะ: -';
    const details = `เลขที่ ${booking.id}\n${statusLabel}\nผู้ขอ: ${requesterName}\nเดินทาง: ${travelDate}\n${destination}`;

    const confirmed = await confirmDelete('ยืนยันการยกเลิกขอใช้รถ', details);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, { method: 'DELETE' });
      if (response.ok) {
        await showSuccess('ยกเลิกขอใช้รถเรียบร้อยแล้ว');
        router.refresh();
      } else {
        const result = await response.json().catch(() => null);
        await showError(result?.error || 'เกิดข้อผิดพลาดในการยกเลิกขอใช้รถ');
      }
    } catch (error) {
      console.error(error);
      await showError('เกิดข้อผิดพลาดในการยกเลิกขอใช้รถ');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={view === 'mobile' ? 'flex space-x-2' : 'flex items-center justify-end space-x-2'}>
      {isAssigned && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-700"
          title="แก้ไขจัดรถ"
        >
          <Edit3 className="h-4 w-4" />
          <span className="sr-only">Edit assignment</span>
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={isDeleting || !canCancel}
        className={`flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${canCancel ? 'text-slate-600 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-300'}`}
        title={canCancel ? 'ยกเลิกขอใช้รถ' : 'ไม่สามารถยกเลิกได้'}
      >
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
        <span className="sr-only">Cancel booking</span>
      </button>
      {isAssigned && (
        <AssignBookingModal
          booking={modalBooking}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          allowTripMerge={allowTripMerge}
          initialOtherIds={initialOtherIds}
          initialMergeBookings={mergeBookings}
        />
      )}
    </div>
  );
}
