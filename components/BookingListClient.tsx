'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapPin,
  Users,
  Car,
  Calendar,
  UserCheck,
  Route,
  Ban,
  List,
  Clock,
  FileText,
  CircleCheckBig,
  Settings2,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import BookingActions from '@/components/BookingActions';
import AssignBookingModal from '@/components/AssignBookingModal';
import SortButton from '@/components/SortButton';
import ExportBookingDoc from '@/components/ExportBookingDoc';
import type { BookingStatusIds } from '@/lib/booking-flow';

interface BookingListClientProps {
  initialBookings: BookingItem[];
  departments: Array<{ id: number; name: string }>;
  sort: string;
  order: string;
  statusIds: BookingStatusIds;
  canAssignBookings: boolean;
  isAuthenticated: boolean;
}

interface BookingItem {
  id: number;
  trip_id?: number | null;
  requester_name: string;
  requester_position?: string;
  department_name?: string | null;
  destination: string;
  distance?: number | string | null;
  purpose?: string | null;
  passengers?: number | string | null;
  start_date?: string | null;
  start_time: string;
  end_date?: string | null;
  car_id?: number | null;
  driver_id?: number | null;
  brand?: string | null;
  model?: string | null;
  license_plate?: string | null;
  car_number?: string | null;
  seats?: number | string | null;
  car_type?: string | null;
  vehicle_assignments?: string | null;
  vehicle_details?: VehicleDetail[] | string | null;
  driver_name?: string | null;
  status_id?: number | null;
  status_text?: string | null;
  trip_type_id?: number | null;
  trip_type_name?: string | null;
  self_drive?: boolean | null;
  end_time?: string | null;
  trip_start_date_time?: string | null;
  created_at?: string | Date | null;
}

type BookingTab = 'all' | 'pending' | 'assigned' | 'travelled' | 'cancelled';

const bookingTabs: Array<{ key: BookingTab; label: string; icon: typeof List }> = [
  { key: 'pending', label: 'รอจัดรถ', icon: Calendar },
  { key: 'assigned', label: 'จัดรถแล้ว', icon: Car },
  { key: 'travelled', label: 'เดินทางแล้ว', icon: Route },
  { key: 'cancelled', label: 'ยกเลิก', icon: Ban },
  { key: 'all', label: 'ทั้งหมด', icon: FileText },
];

const bookingTabStyles: Record<BookingTab, { active: string; inactive: string; activeControl: string; indicator: string; count: string }> = {
  pending: {
    active: 'text-amber-700',
    inactive: 'text-amber-600/75 hover:text-amber-700',
    activeControl: 'border-amber-200 bg-amber-50',
    indicator: 'bg-amber-500',
    count: 'bg-amber-100 text-amber-700',
  },
  assigned: {
    active: 'text-emerald-800',
    inactive: 'text-emerald-700/75 hover:text-emerald-800',
    activeControl: 'border-emerald-200 bg-emerald-50',
    indicator: 'bg-emerald-500',
    count: 'bg-emerald-100 text-emerald-700',
  },
  travelled: {
    active: 'text-blue-700',
    inactive: 'text-blue-600/75 hover:text-blue-700',
    activeControl: 'border-blue-200 bg-blue-50',
    indicator: 'bg-blue-500',
    count: 'bg-blue-100 text-blue-700',
  },
  cancelled: {
    active: 'text-rose-700',
    inactive: 'text-rose-600/75 hover:text-rose-700',
    activeControl: 'border-rose-200 bg-rose-50',
    indicator: 'bg-rose-500',
    count: 'bg-rose-100 text-rose-700',
  },
  all: {
    active: 'text-indigo-700',
    inactive: 'text-indigo-600/75 hover:text-indigo-700',
    activeControl: 'border-indigo-200 bg-indigo-50',
    indicator: 'bg-indigo-500',
    count: 'bg-indigo-100 text-indigo-700',
  },
};

const GUEST_DEPARTMENT_FILTER_STORAGE_KEY = 'booking.guest.departmentFilter';

function isBookingTab(value: string | null): value is BookingTab {
  return value === 'all' || value === 'pending' || value === 'assigned' || value === 'travelled' || value === 'cancelled';
}

function getStatusBadgeClass(statusId: number | null | undefined, statusIds: BookingStatusIds) {
  if (statusId === statusIds.pending) return 'bg-amber-100 text-amber-700';
  if (statusId === statusIds.assigned) return 'bg-emerald-100 text-emerald-700';
  if (statusId === statusIds.completed) return 'bg-blue-100 text-blue-700';
  if (statusId === statusIds.rejected) return 'bg-rose-100 text-rose-700';
  if (statusId === statusIds.cancelled) return 'bg-slate-200 text-slate-700';
  return 'bg-slate-100 text-slate-700';
}

function getTripTypeBadgeClass(tripTypeName: string | null | undefined) {
  if (tripTypeName === 'ภายในจังหวัด') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (tripTypeName === 'ต่างจังหวัด') return 'border-yellow-200 bg-yellow-50 text-yellow-700';
  return 'border-sky-200 bg-sky-50 text-sky-700';
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

function isSameDate(a?: string | Date | null, b?: string | Date | null) {
  return normalizeDatePart(a) === normalizeDatePart(b);
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
  
  // Parse date and time separately to avoid timezone issues
  const [year, month, day] = normalizedDate.split('-').map(Number);
  const [hours, minutes] = normalizedTime.split(':').map(Number);
  
  if (![year, month, day, hours, minutes].every((item) => Number.isFinite(item))) {
    return null;
  }
  
  // Create date using local timezone
  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

interface VehicleDetail {
  license_plate?: string | null;
  driver_name?: string | null;
  brand?: string | null;
  model?: string | null;
  car_number?: string | null;
  seats?: number | string | null;
  car_type?: string | null;
}

function formatTripDeparture(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function formatVehicleAssignment(value: string) {
  const [vehicle, driver] = value.split(',').map((item) => item.trim());
  return { vehicle: vehicle || '', driver: driver || '' };
}

function isSelfDriveDriver(driverName?: string | null) {
  return driverName?.trim() === 'ขับเอง';
}

function getDriverBadgeClass(driverName?: string | null) {
  return cn(
    'truncate rounded-md border px-2 py-1',
    isSelfDriveDriver(driverName)
      ? 'w-[54px] border-pink-200 bg-pink-50 text-center text-pink-700'
      : 'w-[130px] border-sky-200 bg-sky-50'
  );
}

function normalizeVehicleDetails(value: BookingItem['vehicle_details']) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as VehicleDetail[] : [];
  } catch {
    return [];
  }
}

function getVehicleDetailsForBooking(booking: BookingItem) {
  const vehicleDetails = normalizeVehicleDetails(booking.vehicle_details);
  if (vehicleDetails.length > 0) return vehicleDetails;

  if (!booking.license_plate && !booking.brand && !booking.model) return [];

  return [{
    license_plate: booking.license_plate,
    driver_name: booking.driver_name,
    brand: booking.brand,
    model: booking.model,
    car_number: booking.car_number,
    seats: booking.seats,
    car_type: booking.car_type,
  }];
}

function getVehicleDetailByPlate(booking: BookingItem, licensePlate: string) {
  return getVehicleDetailsForBooking(booking).find((item) => item.license_plate === licensePlate) ?? null;
}

export default function BookingListClient({ initialBookings, departments, sort, order, statusIds, canAssignBookings, isAuthenticated }: BookingListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: BookingTab = isBookingTab(tabParam) ? tabParam : 'pending';
  const departmentFilter = searchParams.get('department') ?? '';
  const travelDateFilter = searchParams.get('date') ?? '';
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState<BookingItem | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleDetail | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const hasCheckedGuestDepartmentFilter = useRef(false);

  const departmentOptions = useMemo(
    () => departments.map((department) => department.name),
    [departments]
  );

  const getBookingDateKey = (booking: BookingItem) => {
    const date = buildBookingDateTime(booking.start_date, booking.start_time);
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const hasTripEnded = (booking: BookingItem) => {
    const endAt = buildBookingDateTime(booking.end_date, booking.end_time);
    if (!endAt) return false;
    return !Number.isNaN(endAt.getTime()) && endAt.getTime() < currentTime;
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const matchesTab = (booking: BookingItem) => {
    const isCancelled = booking.status_id === statusIds.rejected || booking.status_id === statusIds.cancelled;
    const isTravelled = booking.status_id === statusIds.completed && hasTripEnded(booking);

    switch (activeTab) {
      case 'pending':
        return booking.status_id === statusIds.pending;
      case 'assigned':
        return booking.status_id === statusIds.assigned;
      case 'travelled':
        return isTravelled;
      case 'cancelled':
        return isCancelled;
      default:
        return true;
    }
  };

  useEffect(() => {
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
    const eventSource = new EventSource('/api/bookings/stream');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string };
        if (payload.type === 'connected' || payload.type === 'heartbeat') {
          return;
        }
      } catch {
      }

      if (refreshTimeout) {
        return;
      }

      refreshTimeout = setTimeout(() => {
        refreshTimeout = null;
        router.refresh();
      }, 150);
    };

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      eventSource.close();
    };
  }, [router]);

  const createFilterQueryString = useMemo(
    () => (nextDepartment: string, nextDate: string, nextTab: BookingTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab !== 'pending') {
        params.set('tab', nextTab);
      } else {
        params.delete('tab');
      }
      if (nextDepartment.trim()) {
        params.set('department', nextDepartment.trim());
      } else {
        params.delete('department');
      }
      if (nextDate) {
        params.set('date', nextDate);
      } else {
        params.delete('date');
      }
      return params.toString();
    },
    [searchParams]
  );

  const updateFilters = (nextDepartment: string, nextDate: string, nextTab: BookingTab = activeTab) => {
    setSelectedIds([]);
    const queryString = createFilterQueryString(nextDepartment, nextDate, nextTab);
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  useEffect(() => {
    if (isAuthenticated) return;

    const currentDepartment = departmentFilter.trim();

    if (!hasCheckedGuestDepartmentFilter.current) {
      hasCheckedGuestDepartmentFilter.current = true;
      const savedDepartment = window.localStorage.getItem(GUEST_DEPARTMENT_FILTER_STORAGE_KEY)?.trim() ?? '';

      if (!currentDepartment && savedDepartment && departmentOptions.includes(savedDepartment)) {
        const queryString = createFilterQueryString(savedDepartment, travelDateFilter, activeTab);
        router.replace(queryString ? `${pathname}?${queryString}` : pathname);
        return;
      }
    }

    if (currentDepartment) {
      window.localStorage.setItem(GUEST_DEPARTMENT_FILTER_STORAGE_KEY, currentDepartment);
    } else {
      window.localStorage.removeItem(GUEST_DEPARTMENT_FILTER_STORAGE_KEY);
    }
  }, [activeTab, createFilterQueryString, departmentFilter, departmentOptions, isAuthenticated, pathname, router, travelDateFilter]);

  const filteredBookings = initialBookings.filter((booking) => {
    if (!matchesTab(booking)) return false;
    if (travelDateFilter && getBookingDateKey(booking) !== travelDateFilter) return false;
    if (departmentFilter && booking.department_name !== departmentFilter) return false;
    return true;
  });

  const scopedBookings = initialBookings.filter((booking) => {
    if (travelDateFilter && getBookingDateKey(booking) !== travelDateFilter) return false;
    if (departmentFilter && booking.department_name !== departmentFilter) return false;
    return true;
  });

  const tabCounts = scopedBookings.reduce<Record<BookingTab, number>>(
    (counts, booking) => {
      counts.all += 1;

      if (booking.status_id === statusIds.pending) {
        counts.pending += 1;
      } else if (booking.status_id === statusIds.assigned) {
        counts.assigned += 1;
      } else if (booking.status_id === statusIds.completed && hasTripEnded(booking)) {
        counts.travelled += 1;
      } else if (booking.status_id === statusIds.rejected || booking.status_id === statusIds.cancelled) {
        counts.cancelled += 1;
      }

      return counts;
    },
    { all: 0, pending: 0, assigned: 0, travelled: 0, cancelled: 0 }
  );

  const pendingBookings = filteredBookings.filter((booking) => booking.status_id === statusIds.pending);

  const toggleSelect = (id: number) => {
    if (!canAssignBookings) return;

    const booking = filteredBookings.find((item) => item.id === id);
    if (!booking || booking.status_id !== statusIds.pending) return;

    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((itemId) => itemId !== id);
      if (prev.length === 0) return [id];

      const firstSelectedBooking = filteredBookings.find((item) => item.id === prev[0]);
      if (!firstSelectedBooking) return [id];

      const selectedDateKey = getBookingDateKey(firstSelectedBooking);
      const currentDateKey = getBookingDateKey(booking);

      if (!selectedDateKey || !currentDateKey || selectedDateKey !== currentDateKey) return prev;
      return [...prev, id];
    });
  };

  const toggleSelectAll = () => {
    if (!canAssignBookings) return;

    if (selectedIds.length > 0) {
      setSelectedIds([]);
      return;
    }
    const firstPendingBooking = pendingBookings[0];
    if (!firstPendingBooking) return;
    const firstDateKey = getBookingDateKey(firstPendingBooking);
    setSelectedIds(
      pendingBookings
        .filter((booking) => getBookingDateKey(booking) === firstDateKey)
        .map((booking) => booking.id)
    );
  };

  const handleBulkAssign = () => {
    if (!canAssignBookings) return;

    if (selectedIds.length === 0) return;
    const firstId = selectedIds[0];
    const firstBooking =
      filteredBookings.find((booking) => booking.id === firstId) ||
      initialBookings.find((booking) => booking.id === firstId);
    if (!firstBooking) return;
    setActiveBooking(firstBooking);
    setIsModalOpen(true);
  };

  const toMergeBooking = (booking: BookingItem) => {
    const passengers =
      typeof booking.passengers === 'number'
        ? booking.passengers
        : typeof booking.passengers === 'string'
          ? Number(booking.passengers) || booking.passengers.split(/[\n,]/).filter(Boolean).length
          : 0;

    return {
      id: booking.id,
      trip_id: booking.trip_id ?? null,
      requester_name: booking.requester_name,
      destination: booking.destination,
      start_date: booking.start_date ?? null,
      start_time: booking.start_time,
      end_date: booking.end_date ?? booking.start_date ?? null,
      end_time: booking.end_time ?? booking.start_time,
      trip_type_id: booking.trip_type_id ?? null,
      passengers,
    };
  };

  const getMergeCandidatesForBooking = (booking: BookingItem) => {
    const dateKey = getBookingDateKey(booking);
    if (!dateKey) return [];

    return initialBookings
      .filter((candidate) =>
        candidate.id !== booking.id &&
        (
          candidate.status_id === statusIds.pending ||
          (booking.trip_id && candidate.trip_id === booking.trip_id)
        ) &&
        getBookingDateKey(candidate) === dateKey
      )
      .map(toMergeBooking);
  };

  const getMergeIdsForBooking = (booking: BookingItem) =>
    getMergeCandidatesForBooking(booking)
      .filter((candidate) => booking.trip_id && candidate.trip_id === booking.trip_id)
      .map((candidate) => candidate.id);

  const shouldShowBulkAction = canAssignBookings && selectedIds.length > 0;

  const bulkAssignButtonDesktop = shouldShowBulkAction ? (
    <button
      onClick={handleBulkAssign}
      className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
    >
      <Car className="mr-2 h-4 w-4" />
      จัดรถ ({selectedIds.length})
    </button>
  ) : null;

  const bulkAssignButtonMobile = shouldShowBulkAction ? (
    <button
      onClick={handleBulkAssign}
      className="inline-flex items-center rounded-md bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
    >
      <Car className="mr-1.5 h-4 w-4" />
      จัดรถ ({selectedIds.length})
    </button>
  ) : null;

  const headerActionContainer = typeof document !== 'undefined' ? document.getElementById('header-extra-actions') : null;
  const headerActionMobileContainer = typeof document !== 'undefined' ? document.getElementById('header-extra-actions-mobile') : null;

  const desktopPortal = headerActionContainer && bulkAssignButtonDesktop
    ? createPortal(bulkAssignButtonDesktop, headerActionContainer)
    : null;
  const mobilePortal = headerActionMobileContainer && bulkAssignButtonMobile
    ? createPortal(bulkAssignButtonMobile, headerActionMobileContainer)
    : null;

  const vehicleModal = selectedVehicle && typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/20 px-4"
      onClick={() => setSelectedVehicle(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="รายละเอียดรถ"
        className="relative w-full max-w-xl rounded-md border border-slate-200 bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setSelectedVehicle(null)}
          className="absolute right-4 top-4 rounded-md p-2 text-slate-500"
          aria-label="ปิด"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="grid grid-cols-1 gap-x-5 gap-y-3 pt-8 sm:grid-cols-2">
          {[
            ['ยี่ห้อ', selectedVehicle.brand || '-'],
            ['รุ่น', selectedVehicle.model || '-'],
            ['ทะเบียน', selectedVehicle.license_plate || '-'],
            ['หมายเลขรถ', selectedVehicle.car_number || '-'],
            ['จำนวนที่นั่ง', selectedVehicle.seats ? String(selectedVehicle.seats) : '-'],
            ['ประเภทรถ', selectedVehicle.car_type || '-'],
          ].map(([label, value]) => (
            <div key={label} className="flex min-w-0 items-center gap-2">
              <span className="w-16 shrink-0 text-left text-[11px] font-semibold text-slate-500">{label}</span>
              <span className="min-w-0 flex-1 truncate rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="animate-in slide-in-from-bottom-2 space-y-4 duration-300">
      {desktopPortal}
      {mobilePortal}
      {vehicleModal}

      <div className="overflow-hidden rounded-md border border-emerald-100/80 bg-white shadow-none">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-white p-3 sm:p-4 md:flex-row md:items-center">
          <div className="flex flex-col gap-2 md:hidden">
            <div className="order-2">
              <label
                className="mb-1.5 block text-[11px] font-semibold uppercase text-slate-500"
                htmlFor="booking-status-mobile"
              >
                สถานะรายการ
              </label>
              <select
                id="booking-status-mobile"
                aria-label="เลือกสถานะรายการ"
                value={activeTab}
                onChange={(event) => {
                  updateFilters(
                    isAuthenticated ? '' : departmentFilter,
                    '',
                    event.target.value as BookingTab
                  );
                }}
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                {bookingTabs.map((tab) => (
                  <option key={tab.key} value={tab.key}>
                    {tab.label} ({tabCounts[tab.key]})
                  </option>
                ))}
              </select>
            </div>
            <div className="contents">
              <div className="order-1">
                <label
                  className="mb-1.5 block text-[11px] font-semibold uppercase text-slate-500"
                  htmlFor="booking-department-mobile"
                >
                  กลุ่มงาน
                </label>
                <select
                  id="booking-department-mobile"
                  aria-label="เลือกกลุ่มงานบนมือถือ"
                  value={departmentFilter}
                  onChange={(event) => {
                    updateFilters(event.target.value, travelDateFilter);
                  }}
                  className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">ทุกกลุ่มงาน</option>
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </div>
              <div className="order-3">
                <label
                  className="mb-1.5 block text-[11px] font-semibold uppercase text-slate-500"
                  htmlFor="booking-date-mobile"
                >
                  วันที่เดินทาง
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="booking-date-mobile"
                    aria-label="เลือกวันที่เดินทางบนมือถือ"
                    type="date"
                    value={travelDateFilter}
                    onChange={(event) => {
                      updateFilters(departmentFilter, event.target.value);
                    }}
                    className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="สถานะรายการขอใช้รถ"
            className="no-scrollbar hidden gap-1 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-1 shadow-inner md:flex"
          >
            {bookingTabs.map((tab) => {
              const TabIcon = tab.icon;
              const tabStyle = bookingTabStyles[tab.key];
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    updateFilters(
                      isAuthenticated ? '' : departmentFilter,
                      '',
                      tab.key
                    );
                  }}
                  className={cn(
                    'relative inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[11px] font-semibold uppercase transition-all',
                    isActive
                      ? [tabStyle.active, tabStyle.activeControl, 'border shadow-sm']
                      : [tabStyle.inactive, 'border border-transparent hover:bg-white/70']
                  )}
                >
                  <TabIcon className="h-4 w-4" />
                  <span className="inline-flex items-center gap-1.5">
                    <span>{tab.label}</span>
                    <span className={cn(
                      'inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none',
                      tabStyle.count
                    )}>
                      {tabCounts[tab.key]}
                    </span>
                  </span>
                  {isActive && <span className={cn('absolute inset-x-2 bottom-0 h-0.5 rounded-full', tabStyle.indicator)} />}
                </button>
              );
            })}
          </div>
          <div className="hidden w-full flex-col gap-3 md:flex md:w-auto md:flex-row md:items-center">
            <div className="w-full md:w-[180px]">
              <select
                value={departmentFilter}
                onChange={(event) => {
                  updateFilters(event.target.value, travelDateFilter);
                }}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-none transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">ทุกกลุ่มงาน</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>
            <div className="relative w-full md:w-[190px]">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={travelDateFilter}
                onChange={(event) => {
                  updateFilters(departmentFilter, event.target.value);
                }}
                className="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-none transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <button
              type="button"
              onClick={() => updateFilters('', '')}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-emerald-800"
            >
              ล้าง
            </button>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className={cn('w-full table-fixed', isAuthenticated ? 'min-w-[1120px]' : 'min-w-[1020px]')}>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-10 px-3 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.every((id) => {
                      const booking = pendingBookings.find((item) => item.id === id);
                      if (!booking || pendingBookings.length === 0) return false;
                      return getBookingDateKey(booking) === getBookingDateKey(pendingBookings[0]);
                    })}
                    onChange={toggleSelectAll}
                    disabled={!canAssignBookings || pendingBookings.length === 0}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-800 focus:ring-slate-400"
                  />
                </th>
                <th className="w-14 px-3 py-3 text-left text-[11px] font-semibold uppercase text-black">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    <SortButton column="id" label="ใบที่" currentSort={sort} currentOrder={order} />
                  </span>
                </th>
                <th className="w-32 px-3 py-3 text-left text-[11px] font-semibold uppercase text-black">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <SortButton column="start_time" label="วันเดินทาง" currentSort={sort} currentOrder={order} />
                  </span>
                </th>
                <th className="w-[360px] px-3 py-3 text-left text-[11px] font-semibold uppercase text-black">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    รายละเอียด
                  </span>
                </th>
                <th className="w-[260px] px-3 py-3 text-left text-[11px] font-semibold uppercase text-black">
                  <span className="inline-flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5" />
                    รถ / คนขับ
                  </span>
                </th>
                <th className="w-24 px-3 py-3 text-left text-[11px] font-semibold uppercase text-black">
                  <span className="inline-flex items-center gap-1.5">
                    <CircleCheckBig className="h-3.5 w-3.5" />
                    สถานะ
                  </span>
                </th>
                {isAuthenticated && (
                  <th className="w-24 px-3 py-3 text-right text-[11px] font-semibold uppercase text-black">
                    <span className="inline-flex items-center justify-end gap-1.5">
                      <Settings2 className="h-3.5 w-3.5" />
                      จัดการ
                    </span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-slate-400 bg-white">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={isAuthenticated ? 7 : 6} className="px-8 py-24 text-center">
                    <Calendar className="mx-auto mb-4 h-12 w-12 text-slate-200" />
                    <p className="font-medium text-slate-400">ไม่พบรายการขอใช้รถ</p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const isSelected = selectedIds.includes(b.id);
                  const displayName = b.requester_name || '-';
                  const firstSelectedBooking = selectedIds.length > 0
                    ? filteredBookings.find((item) => item.id === selectedIds[0])
                    : null;
                  const isSameTripDate = !firstSelectedBooking || getBookingDateKey(firstSelectedBooking) === getBookingDateKey(b);
                  const passengerCount = typeof b.passengers === 'number'
                    ? b.passengers
                    : typeof b.passengers === 'string'
                      ? Number(b.passengers) || b.passengers.split(/[\n,]/).filter(Boolean).length
                      : 0;
                  const departureTime = formatTripDeparture(b.trip_start_date_time);
                  const requestedAt = (() => {
                    if (!b.created_at) return '-';
                    const date = b.created_at instanceof Date ? b.created_at : new Date(String(b.created_at));
                    if (Number.isNaN(date.getTime())) return '-';
                    return `${date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })} ${date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
                  })();

                  return (
                    <tr key={b.id} className={cn('group odd:bg-white even:bg-slate-50/70 transition-colors hover:bg-emerald-50/40', isSelected && 'bg-emerald-50/70')}>
                      <td className={cn(
                        'border-l-4 px-3 py-5 align-top transition-colors',
                        isSelected ? 'border-l-emerald-500' : 'border-l-slate-200 group-hover:border-l-emerald-300'
                      )}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(b.id)}
                          disabled={!canAssignBookings || b.status_id !== statusIds.pending || (!isSelected && !isSameTripDate)}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-800 focus:ring-slate-400"
                        />
                      </td>
                      <td className="px-3 py-5 align-top">
                        <div className="whitespace-nowrap text-[11px] font-semibold text-slate-700">{b.id}</div>
                      </td>
                      <td className="px-3 py-5 align-top">
                        <div className="whitespace-nowrap text-[11px] font-medium text-slate-700">
                          {b.start_date ? (() => {
                            if ((b.start_date as unknown) instanceof Date) {
                              return (b.start_date as unknown as Date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
                            }
                            const dateStr = String(b.start_date);
                            if (dateStr.includes('-')) {
                              const [year, month, day] = dateStr.split('-').map(Number);
                              const date = new Date(year, month - 1, day);
                              return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
                            }
                            return '-';
                          })() : '-'}
                        </div>
                        <div className="whitespace-nowrap text-[10px] font-medium text-slate-400">
                          {b.start_time ? b.start_time.slice(0, 5) : '-'}
                          {b.end_date && isSameDate(b.end_date, b.start_date) && b.end_time ? (
                            <> - {b.end_time.slice(0, 5)}</>
                          ) : null}
                        </div>
                        {b.end_date && !isSameDate(b.end_date, b.start_date) && (
                          <>
                            <div className="mt-1 whitespace-nowrap text-[10px] font-medium text-slate-700">
                              <span className="text-[9px] font-bold text-slate-400 mr-1">กลับ</span>
                              {(() => {
                                if ((b.end_date as unknown) instanceof Date) {
                                  return (b.end_date as unknown as Date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
                                }
                                const dateStr = String(b.end_date);
                                if (dateStr.includes('-')) {
                                  const [year, month, day] = dateStr.split('-').map(Number);
                                  const date = new Date(year, month - 1, day);
                                  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
                                }
                                return '-';
                              })()}
                            </div>
                            <div className="whitespace-nowrap text-[9px] font-medium text-slate-400">
                              {b.end_time ? b.end_time.slice(0, 5) : '-'}
                            </div>
                          </>
                        )}
                        <div className={cn('mt-2 inline-flex max-w-full items-center rounded border px-1.5 py-1 text-[9px] font-medium', getTripTypeBadgeClass(b.trip_type_name))}>
                          <Car className="mr-1 h-3 w-3 shrink-0" />
                          <span className="truncate">{b.trip_type_name || 'ไม่ระบุ'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-5 align-top">
                        <div className="rounded-md border border-violet-200 bg-violet-50 px-2.5 py-2 text-black">
                          <div className="flex w-full items-start text-[11px] font-medium">
                            <MapPin className="mr-1.5 mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
                            <span className="min-w-0 whitespace-normal break-words leading-snug">{b.destination}</span>
                          </div>
                          {b.purpose && (
                            <div className="mt-2 w-full whitespace-normal break-words text-[10px] font-medium leading-relaxed text-slate-600">
                              {b.purpose}
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <div className="flex items-center text-[9px] font-medium uppercase text-slate-500">
                              <Route className="mr-1 h-3 w-3" />
                              ระยะทาง {b.distance} กม.
                            </div>
                            {passengerCount > 0 && (
                              <div className="flex items-center text-[9px] font-medium uppercase text-emerald-600">
                                <Users className="mr-1 h-3 w-3" />
                                <span>ผดส</span>
                                <span className="mx-1 inline-flex min-w-5 items-center justify-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold leading-none text-emerald-700">
                                  {passengerCount}
                                </span>
                                <span>คน</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-2 flex w-full flex-wrap items-center gap-1.5 border-t border-violet-100 pt-2 text-[11px] font-medium text-slate-500">
                            <span className="min-w-0 truncate text-slate-700">{displayName}</span>
                            <span className="text-slate-300">/</span>
                            <span className="min-w-0 truncate">{b.department_name || b.requester_position || 'ไม่ระบุหน่วยงาน'}</span>
                            {b.self_drive && (
                              <span className="inline-flex rounded border border-red-100 bg-red-50 px-1.5 py-px text-[9px] font-semibold text-red-500">
                                ขอขับเอง
                              </span>
                            )}
                          </div>
                          <div className="mt-1 w-full truncate text-[11px] font-medium text-slate-500">
                            ขอเมื่อ : {requestedAt}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-5 align-top">
                        {b.vehicle_assignments ? (
                          <div className="min-w-0 space-y-1">
                            {String(b.vehicle_assignments).split('\n').map((assignment, index) => (
                              <div key={`${b.id}-vehicle-${index}`} className="flex min-w-0 items-center gap-0 text-[10px] font-medium text-sky-800">
                                {(() => {
                                  const assignmentParts = formatVehicleAssignment(assignment);
                                  return (
                                    <>
                                      {assignmentParts.vehicle && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const detail = getVehicleDetailByPlate(b, assignmentParts.vehicle);
                                            if (detail) setSelectedVehicle(detail);
                                          }}
                                          className="relative flex w-[75px] items-center justify-center overflow-hidden truncate rounded-md border border-sky-400 bg-white px-2 py-1 text-center text-slate-900"
                                        >
                                          <span aria-hidden="true" className="absolute bottom-0.5 right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full border border-slate-300/70 bg-white text-[5px] font-bold leading-none text-slate-400">ขส</span>
                                          {assignmentParts.vehicle}
                                        </button>
                                      )}
                                      {assignmentParts.vehicle && assignmentParts.driver && (
                                        <span aria-hidden="true" className="text-slate-400">-</span>
                                      )}
                                      {assignmentParts.driver && (
                                        <span className={getDriverBadgeClass(assignmentParts.driver)}>{assignmentParts.driver}</span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            ))}
                            {departureTime && (
                              <div className="mt-1 flex items-center text-left text-[8px] font-medium uppercase tracking-tight text-slate-500">
                                <Clock className="mr-1 h-3 w-3 shrink-0" />
                                เดินทาง: {departureTime} น.
                              </div>
                            )}
                          </div>
                        ) : b.car_id ? (
                          <div className="min-w-0">
                            <div className="text-sky-800">
                              <div className="flex min-w-0 items-center gap-0 text-[10px] font-medium">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const detail = getVehicleDetailByPlate(b, b.license_plate || '');
                                    if (detail) setSelectedVehicle(detail);
                                  }}
                                  className="relative flex w-[75px] items-center justify-center overflow-hidden truncate rounded-md border border-sky-400 bg-white px-2 py-1 text-center text-slate-900"
                                >
                                  <span aria-hidden="true" className="absolute bottom-0.5 right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full border border-slate-300/70 bg-white text-[5px] font-bold leading-none text-slate-400">ขส</span>
                                  {b.license_plate || '-'}
                                </button>
                                <span aria-hidden="true" className="text-slate-400">-</span>
                                <span className={getDriverBadgeClass(b.driver_name)}>{b.driver_name || '-'}</span>
                              </div>
                              <div className="mt-1 flex items-center text-[9px] text-sky-600">
                                <UserCheck className="mr-1 h-3 w-3 shrink-0" />
                                <span className="truncate">{b.brand} {b.model}</span>
                              </div>
                            </div>
                            {departureTime && (
                              <div className="mt-1 flex items-center text-left text-[8px] font-medium uppercase tracking-tight text-slate-500">
                                <Clock className="mr-1 h-3 w-3 shrink-0" />
                                เดินทาง: {departureTime} น.
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-5 align-top">
                        <div className="flex flex-col items-start gap-2">
                          <span className={cn('inline-flex w-[80px] justify-center rounded-md px-2.5 py-1 text-[9px] font-bold', getStatusBadgeClass(b.status_id, statusIds))}>
                            {b.status_text || 'ไม่ระบุ'}
                          </span>
                          {b.car_id && (
                            <div className="inline-flex items-center justify-center">
                              <ExportBookingDoc booking={b} />
                            </div>
                          )}
                        </div>
                      </td>
                      {isAuthenticated && (
                        <td className="px-3 py-5 text-right align-top">
                          <BookingActions
                            booking={b}
                            view="desktop"
                            statusIds={statusIds}
                            allowTripMerge={canAssignBookings}
                            mergeBookings={getMergeCandidatesForBooking(b)}
                            initialOtherIds={getMergeIdsForBooking(b)}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 bg-slate-50 p-3 lg:hidden">
          {filteredBookings.length === 0 ? (
            <div className="px-8 py-24 text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-slate-200" />
              <p className="font-medium text-slate-400">ไม่พบรายการขอใช้รถ</p>
            </div>
          ) : (
            filteredBookings.map((b) => {
              const isSelected = selectedIds.includes(b.id);
              const displayName = b.requester_name || '-';
              const firstSelectedBooking = selectedIds.length > 0
                ? filteredBookings.find((item) => item.id === selectedIds[0])
                : null;
              const isSameTripDate = !firstSelectedBooking || getBookingDateKey(firstSelectedBooking) === getBookingDateKey(b);
              const passengerCount = typeof b.passengers === 'number'
                ? b.passengers
                : typeof b.passengers === 'string'
                  ? Number(b.passengers) || b.passengers.split(/[\n,]/).filter(Boolean).length
                  : 0;
              const departureTime = formatTripDeparture(b.trip_start_date_time);

              return (
                <div
                  key={b.id}
                  className={cn(
                    'space-y-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm transition-colors',
                    isSelected && 'border-emerald-200 bg-emerald-50/60'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[10px] font-bold capitalize text-slate-500">
                      {b.start_date ? (() => {
                        if ((b.start_date as unknown) instanceof Date) {
                          return (b.start_date as unknown as Date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                        }
                        const dateStr = String(b.start_date);
                        if (dateStr.includes('-')) {
                          const [year, month, day] = dateStr.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                        }
                        return '-';
                      })() : '-'} •
                      <span className="ml-1 text-slate-700">
                        {b.start_time ? String(b.start_time).slice(0, 5) : '-'}
                        {b.end_date && isSameDate(b.end_date, b.start_date) && b.end_time ? (
                          <> - {String(b.end_time).slice(0, 5)}</>
                        ) : null}
                      </span>
                      {b.end_date && !isSameDate(b.end_date, b.start_date) && (
                        <>
                          <br />
                          <span><span className="text-[10px] font-bold text-slate-400">กลับ</span> {(() => {
                            if ((b.end_date as unknown) instanceof Date) {
                              return (b.end_date as unknown as Date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                            }
                            const dateStr = String(b.end_date);
                            if (dateStr.includes('-')) {
                              const [year, month, day] = dateStr.split('-').map(Number);
                              const date = new Date(year, month - 1, day);
                              return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                            }
                            return '-';
                          })()} •
                          <span className="ml-1 text-slate-700">
                            {b.end_time ? String(b.end_time).slice(0, 5) : '-'}
                          </span>
                          </span>
                        </>
                      )}
                    </div>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">ใบที่ {b.id}</span>
                  </div>

                  <hr className="border-emerald-200" />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(b.id)}
                        disabled={!canAssignBookings || b.status_id !== statusIds.pending || (!isSelected && !isSameTripDate)}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-800 focus:ring-slate-400"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-[10px] font-bold leading-4 text-slate-700">{displayName}</div>
                        <div className="text-[10px] font-bold uppercase tracking-tight text-slate-400">{b.department_name || b.requester_position || 'ไม่ระบุหน่วยงาน'}</div>
                      </div>
                    </div>
                    <div className={cn('inline-flex shrink-0 items-center rounded-md border px-2.5 py-1 text-[10px] font-medium', getTripTypeBadgeClass(b.trip_type_name))}>
                      <Car className="mr-1 h-3 w-3" />
                      {b.trip_type_name || 'ไม่ระบุ'}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <div className="flex min-w-0 items-start">
                        <MapPin className="mr-1 mt-0.5 h-3 w-3 shrink-0 text-rose-500" />
                        <span className="min-w-0 whitespace-normal break-words leading-snug">{b.destination}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {passengerCount > 0 && (
                        <div className="flex items-center text-[10px] font-medium uppercase text-emerald-600">
                          <Users className="mr-1 h-3 w-3" />
                          <span>ผดส</span>
                          <span className="mx-1 inline-flex min-w-5 items-center justify-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold leading-none text-emerald-700">
                            {passengerCount}
                          </span>
                          <span>คน</span>
                        </div>
                      )}
                      <div className="flex items-center text-[10px] font-medium uppercase text-slate-500">
                        <Route className="mr-1 h-3 w-3" />
                        ระยะทาง {b.distance} กม.
                      </div>
                    </div>
                    {b.purpose && (
                      <div className="border-l-2 border-emerald-300 py-1 pl-2 text-[10px] font-medium text-emerald-700/80">
                        {b.purpose}
                      </div>
                    )}
                    {b.vehicle_assignments ? (
                      <div className="space-y-1 text-[10px] font-bold text-emerald-700">
                        {String(b.vehicle_assignments).split('\n').map((assignment, index) => (
                          <div key={`${b.id}-mobile-vehicle-${index}`} className="flex items-center">
                            <Car className="mr-1 h-3 w-3" />
                            <span>{assignment}</span>
                          </div>
                        ))}
                        {departureTime && (
                          <div className="flex items-center text-left text-[8px] font-medium uppercase tracking-tight text-slate-500">
                            <Clock className="mr-1 h-3 w-3 shrink-0" />
                            เดินทาง: {departureTime} น.
                          </div>
                        )}
                      </div>
                    ) : b.car_id && (
                      <div className="space-y-1 text-[10px] font-bold text-emerald-700">
                        <div className="flex items-center">
                          <Car className="mr-1 h-3 w-3" />
                          <span>{b.license_plate || '-'}, {b.driver_name || '-'}</span>
                        </div>
                        {departureTime && (
                          <div className="flex items-center text-left text-[8px] font-medium uppercase tracking-tight text-slate-500">
                            <Clock className="mr-1 h-3 w-3 shrink-0" />
                            เดินทาง: {departureTime} น.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={cn('inline-flex w-[80px] justify-center rounded-md px-2.5 py-1 text-[9px] font-bold', getStatusBadgeClass(b.status_id, statusIds))}>
                        {b.status_text || 'ไม่ระบุ'}
                      </span>
                      {b.car_id && <ExportBookingDoc booking={b} />}
                    </div>
                    {isAuthenticated && (
                      <BookingActions
                        booking={b}
                        view="mobile"
                        statusIds={statusIds}
                        allowTripMerge={canAssignBookings}
                        mergeBookings={getMergeCandidatesForBooking(b)}
                        initialOtherIds={getMergeIdsForBooking(b)}
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {activeBooking && (
        <AssignBookingModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setActiveBooking(null);
            setSelectedIds([]);
          }}
          booking={{
            ...activeBooking,
            requester_name: activeBooking.requester_name || '',
            trip_id: activeBooking.trip_id ?? null,
            car_id: activeBooking.car_id ?? null,
            driver_id: activeBooking.driver_id ?? null,
            start_date: activeBooking.start_date ?? null,
            end_date: activeBooking.end_date ?? activeBooking.start_date ?? null,
          }}
          allowTripMerge={true}
          initialOtherIds={selectedIds.filter((id) => id !== activeBooking.id)}
          initialMergeBookings={getMergeCandidatesForBooking(activeBooking)}
        />
      )}
    </div>
  );
}
