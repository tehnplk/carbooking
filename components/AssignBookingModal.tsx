'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const EMPTY_OTHER_IDS: number[] = [];

interface AssignModalProps {
  booking: {
    id: number;
    trip_id?: number | null;
    requester_name: string;
    destination: string;
    trip_type_id?: number | null;
    start_date?: string | Date | null;
    start_time?: string | Date;
    end_date?: string | Date | null;
    car_id: number | null;
    driver_id?: number | null;
    status_id?: number | null;
    passengers?: number | string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  initialOtherIds?: number[];
  initialMergeBookings?: PendingBooking[];
  allowTripMerge?: boolean;
}

interface CarOption {
  id: number;
  brand: string;
  model: string;
  license_plate: string;
  seats?: number | null;
}

interface DriverOption {
  id: number;
  fullname: string;
}

interface TripTypeOption {
  id: number;
  name: string;
}

interface PendingBooking {
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

interface TripBookingItem extends PendingBooking {
  locked?: boolean;
}

interface AssignmentRow {
  rowId: string;
  car_id: string;
  driver_id: string;
}

interface ExistingAssignment {
  car_id: number;
  driver_id: number;
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

function formatThaiDate(value?: string | Date | null) {
  const datePart = normalizeDatePart(value);
  if (!datePart) return '-';
  const [year, month, day] = datePart.split('-').map(Number);
  if (![year, month, day].every((item) => Number.isFinite(item))) return '-';
  return new Date(year, month - 1, day).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function createAssignmentRow(carId?: number | string | null, driverId?: number | string | null): AssignmentRow {
  return {
    rowId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    car_id: carId ? String(carId) : '',
    driver_id: driverId ? String(driverId) : '',
  };
}

export default function AssignBookingModal({
  booking,
  isOpen,
  onClose,
  initialOtherIds,
  initialMergeBookings,
  allowTripMerge = false,
}: AssignModalProps) {
  const router = useRouter();
  const otherIdsKey = (initialOtherIds ?? EMPTY_OTHER_IDS).join(',');
  const [loading, setLoading] = useState(false);
  const [fetchingOptions, setFetchingOptions] = useState(false);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [tripTypes, setTripTypes] = useState<TripTypeOption[]>([]);
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [selectedOtherIds, setSelectedOtherIds] = useState<number[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>(() => [
    createAssignmentRow(booking.car_id, booking.driver_id),
  ]);

  const tripTypeMap = useMemo(() => new Map(tripTypes.map((item) => [item.id, item.name])), [tripTypes]);

  useEffect(() => {
    if (!isOpen) return;

    const parsedOtherIds = allowTripMerge && otherIdsKey
      ? otherIdsKey.split(',').map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : [];

    setAssignments([createAssignmentRow(booking.car_id, booking.driver_id)]);
    setSelectedOtherIds(parsedOtherIds);
    setPendingBookings(allowTripMerge ? (initialMergeBookings ?? []) : []);

    fetch('/api/trip-types')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTripTypes(data.filter((item): item is TripTypeOption => typeof item?.id === 'number' && typeof item?.name === 'string'));
        }
      })
      .catch((error) => console.error(error));

    setFetchingOptions(true);
    Promise.all([
      fetch('/api/cars/available')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setCars(data);
        }),
      fetch('/api/drivers/active')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setDrivers(data);
        }),
    ])
      .catch((error) => console.error(error))
      .finally(() => setFetchingOptions(false));

    if (booking.trip_id) {
      fetch(`/api/bookings/${booking.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (!Array.isArray(data?.assignments) || data.assignments.length === 0) return;
          const rows = data.assignments
            .filter((item: ExistingAssignment) => typeof item?.car_id === 'number' && typeof item?.driver_id === 'number')
            .map((item: ExistingAssignment) => createAssignmentRow(item.car_id, item.driver_id));
          if (rows.length > 0) setAssignments(rows);
        })
        .catch((error) => console.error(error));
    }
  }, [allowTripMerge, booking.car_id, booking.driver_id, booking.id, booking.trip_id, initialMergeBookings, isOpen, otherIdsKey]);

  const tripBookings: TripBookingItem[] = [
    {
      id: booking.id,
      trip_id: booking.trip_id ?? null,
      requester_name: booking.requester_name,
      destination: booking.destination,
      start_date: booking.start_date ?? null,
      start_time: booking.start_time ?? '',
      end_date: booking.end_date ?? booking.start_date ?? null,
      end_time: booking.start_time ?? '',
      trip_type_id: booking.trip_type_id ?? null,
      passengers: Number(booking.passengers) || 0,
      locked: true,
    },
    ...pendingBookings,
  ];

  const addAssignment = () => setAssignments((current) => [...current, createAssignmentRow()]);

  const removeAssignment = (rowId: string) => {
    setAssignments((current) => current.length > 1 ? current.filter((assignment) => assignment.rowId !== rowId) : current);
  };

  const updateAssignment = (rowId: string, field: 'car_id' | 'driver_id', value: string) => {
    setAssignments((current) =>
      current.map((assignment) => assignment.rowId === rowId ? { ...assignment, [field]: value } : assignment)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedAssignments = assignments.map((assignment) => ({
        car_id: assignment.car_id ? Number(assignment.car_id) : null,
        driver_id: assignment.driver_id ? Number(assignment.driver_id) : null,
      }));
      const firstAssignment = normalizedAssignments[0];

      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          car_id: firstAssignment?.car_id ?? null,
          driver_id: firstAssignment?.driver_id ?? null,
          assignments: normalizedAssignments,
          other_ids: allowTripMerge ? selectedOtherIds : [],
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to assign booking');
      }

      onClose();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('ไม่สามารถจัดรถและพนักงานขับรถได้');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-emerald-700/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white font-sans shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left">
          <div className="min-w-0 flex-1 text-left">
            <h3 className="block text-left text-base font-black leading-6 text-slate-700">จัดรถ</h3>
            <p className="truncate text-left text-xs font-bold text-slate-400">
              ทริป {booking.trip_id ? `#${booking.trip_id}` : 'ใหม่'} • {formatThaiDate(booking.start_date)} • {normalizeTimePart(booking.start_time) || '-'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div className="space-y-2">
              {assignments.map((assignment, index) => (
                <div key={assignment.rowId} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2">
                  <select
                    required
                    value={assignment.car_id}
                    onChange={(event) => updateAssignment(assignment.rowId, 'car_id', event.target.value)}
                    className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    aria-label={`เลือกรถคันที่ ${index + 1}`}
                  >
                    <option value="" className="font-normal">เลือกรถ</option>
                    {cars.map((car) => {
                      const seatText = typeof car.seats === 'number' && car.seats > 0 ? `  - ${car.seats} ที่นั่ง` : '';
                      return (
                        <option key={car.id} value={car.id} className="font-normal">
                          {car.brand} {car.model} ({car.license_plate}){seatText}
                        </option>
                      );
                    })}
                  </select>

                  <select
                    required
                    value={assignment.driver_id}
                    onChange={(event) => updateAssignment(assignment.rowId, 'driver_id', event.target.value)}
                    className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    aria-label={`เลือกพขร.คันที่ ${index + 1}`}
                  >
                    <option value="" className="font-normal">เลือกพขร.</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id} className="font-normal">{driver.fullname}</option>
                    ))}
                  </select>

                  {index === assignments.length - 1 ? (
                    <button
                      type="button"
                      onClick={addAssignment}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#23b35b] text-white transition-all hover:bg-[#1ea651]"
                      aria-label="เพิ่มรถ"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeAssignment(assignment.rowId)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="ลบรถ"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {fetchingOptions && <p className="text-xs text-slate-400">กำลังดึงข้อมูลรถและพขร...</p>}
            </div>

            {allowTripMerge ? (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="text-xs font-black text-slate-500">ร่วมทริป / ใช้รถคันเดียวกัน</div>
                {tripBookings.map((pendingBooking) => {
                  const isLocked = pendingBooking.locked;
                  const isSelected = isLocked || selectedOtherIds.includes(pendingBooking.id);

                  return (
                    <label
                      key={pendingBooking.id}
                      className={cn(
                        'flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-all',
                        isSelected ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-600'
                      )}
                    >
                      <span className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                          checked={isSelected}
                          disabled={isLocked}
                          onChange={() => {
                            if (isLocked) return;
                            setSelectedOtherIds((current) =>
                              current.includes(pendingBooking.id)
                                ? current.filter((item) => item !== pendingBooking.id)
                                : [...current, pendingBooking.id]
                            );
                          }}
                        />
                        <span>
                          <span className="block font-bold">#{pendingBooking.id} {pendingBooking.requester_name}</span>
                          <span className="block text-xs text-slate-500">{pendingBooking.destination}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-[11px] font-bold text-slate-400">
                        <span className="block">{formatThaiDate(pendingBooking.start_date)}</span>
                        <span className="block">{normalizeTimePart(pendingBooking.start_time) || '-'}</span>
                        <span className="block">{pendingBooking.trip_type_id ? tripTypeMap.get(pendingBooking.trip_type_id) || '-' : '-'}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#23b35b] px-5 py-2 text-sm font-black text-white transition-all hover:bg-[#1ea651] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex items-center justify-center">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                บันทึก
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
