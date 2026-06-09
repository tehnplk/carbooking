'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Building2,
  Check,
  Loader2,
  MapPin,
  Plus,
  User,
  Users,
  AlertTriangle,
} from 'lucide-react';
import Swal from 'sweetalert2';
import DateTimePickerModal from '@/components/DateTimePickerModal';
import { swalBase } from '@/lib/swal';
import { cn } from '@/lib/utils';

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatThaiDateTime(date: Date): string {
  const day = THAI_DAYS[date.getDay()];
  const d = date.getDate();
  const month = THAI_MONTHS[date.getMonth()];
  const year = date.getFullYear() + 543;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${day} - ${d} ${month} ${year}  เวลา ${hh}:${mm}:${ss} น.`;
}

function checkOutsideOfficeHoursFor(now: Date): boolean {
  const thaiOffset = 7 * 60;
  const thaiDate = new Date(now.getTime() + thaiOffset * 60 * 1000);
  const thaiDay = thaiDate.getUTCDay(); // 0=Sun, 6=Sat
  const thaiMinutes = thaiDate.getUTCHours() * 60 + thaiDate.getUTCMinutes();
  if (thaiDay === 0 || thaiDay === 6) return true;
  // office hours: 08:30–16:30, outside = before 08:30 or at/after 16:31
  return thaiMinutes >= 16 * 60 + 31 || thaiMinutes <= 8 * 60 + 29;
}

interface MasterOption {
  id: number;
  name: string;
}

const REQUESTER_STORAGE_KEY = 'booking.add.requesterInfo';

const sectionClass = 'relative border-t border-dashed border-slate-500/80 py-5 first:border-t-0 first:pt-1 md:py-6 md:first:pt-2';
const sectionHeaderClass = 'mb-4 flex items-center gap-3 pb-2';
const sectionIconClass = 'flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-slate-600';
const labelClass = 'ml-0.5 flex items-center text-[11px] font-semibold uppercase text-slate-500';
const fieldClass = 'h-10 w-full rounded-md border-0 bg-white/70 px-3 text-sm font-semibold !text-blue-700 outline-none transition-all placeholder:text-slate-300 focus:bg-white focus:shadow-[0_8px_18px_rgba(18,130,69,0.08)]';
const textareaClass = 'min-h-24 w-full resize-none rounded-md border-0 bg-white/70 px-3 py-2 text-sm font-semibold leading-7 !text-blue-700 outline-none transition-all placeholder:text-slate-300 focus:bg-white focus:shadow-[0_8px_18px_rgba(18,130,69,0.08)]';

function toLocalDateTimeValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseLocalDateTime(value: string) {
  if (!value) return null;

  const [datePart, timePart = '00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);

  if (![year, month, day, hours, minutes].every((item) => Number.isFinite(item))) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function getRandomDigitPair() {
  const first = Math.floor(Math.random() * 10);
  let second = Math.floor(Math.random() * 10);

  while (second === first) {
    second = Math.floor(Math.random() * 10);
  }

  return [first, second] as const;
}

async function confirmBookingChallenge() {
  const [first, second] = getRandomDigitPair();
  const answer = first * second;

  const result = await Swal.fire({
    ...swalBase,
    icon: 'question',
    title: 'ยืนยันการบันทึกใบขอรถ',
    text: `กรุณาตอบคำถามเพื่อยืนยัน: ${first} x ${second} = ?`,
    input: 'text',
    inputPlaceholder: 'ใส่คำตอบ',
    inputAttributes: {
      inputmode: 'numeric',
      autocapitalize: 'off',
      autocorrect: 'off',
    },
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    preConfirm: (value) => {
      if (value.trim() === '') {
        Swal.showValidationMessage('กรุณาใส่คำตอบ');
        return false;
      }

      if (Number(value) !== answer) {
        Swal.showValidationMessage('คำตอบไม่ถูกต้อง กรุณาลองอีกครั้ง');
        return false;
      }

      return true;
    },
  });

  return result.isConfirmed;
}

export default function AddBookingPage() {
  const router = useRouter();
  const hasLoadedRequesterInfo = useRef(false);
  const today = new Date();
  const maxStartDate = new Date();
  maxStartDate.setDate(maxStartDate.getDate() + 45);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<MasterOption[]>([]);
  const [tripTypes, setTripTypes] = useState<MasterOption[]>([]);
  const [fuelOptions, setFuelOptions] = useState<MasterOption[]>([]);
  const [passengerCount, setPassengerCount] = useState(1);
  const [tripTypeError, setTripTypeError] = useState(false);
  const [formData, setFormData] = useState({
    requester_name: '',
    requester_position: '',
    supervisor_name: '',
    supervisor_position: '',
    department_id: '',
    destination: '',
    purpose: '',
    fuel_reimbursement_id: '',
    distance: '',
    trip_type_id: '',
    self_drive: false,
    start_time: (() => {
      const d = new Date();
      d.setHours(8, 30, 0, 0);
      return toLocalDateTimeValue(d);
    })(),
    end_time: (() => {
      const d = new Date();
      d.setHours(16, 30, 0, 0);
      return toLocalDateTimeValue(d);
    })(),
  });

  const startDateTime = parseLocalDateTime(formData.start_time) ?? today;
  const [outsideHours, setOutsideHours] = useState(false);
  const [clockDisplay, setClockDisplay] = useState('');

  useEffect(() => {
    try {
      const savedRequesterInfo = window.localStorage.getItem(REQUESTER_STORAGE_KEY);
      if (!savedRequesterInfo) {
        hasLoadedRequesterInfo.current = true;
        return;
      }

      const parsed = JSON.parse(savedRequesterInfo) as Partial<typeof formData>;
      setFormData((current) => ({
        ...current,
        department_id: typeof parsed.department_id === 'string' ? parsed.department_id : current.department_id,
        requester_name: typeof parsed.requester_name === 'string' ? parsed.requester_name : current.requester_name,
        requester_position: typeof parsed.requester_position === 'string' ? parsed.requester_position : current.requester_position,
        supervisor_name: typeof parsed.supervisor_name === 'string' ? parsed.supervisor_name : current.supervisor_name,
        supervisor_position: typeof parsed.supervisor_position === 'string' ? parsed.supervisor_position : current.supervisor_position,
      }));
    } catch {
      window.localStorage.removeItem(REQUESTER_STORAGE_KEY);
    } finally {
      hasLoadedRequesterInfo.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedRequesterInfo.current) return;

    const requesterInfo = {
      department_id: formData.department_id,
      requester_name: formData.requester_name,
      requester_position: formData.requester_position,
      supervisor_name: formData.supervisor_name,
      supervisor_position: formData.supervisor_position,
    };

    window.localStorage.setItem(REQUESTER_STORAGE_KEY, JSON.stringify(requesterInfo));
  }, [
    formData.department_id,
    formData.requester_name,
    formData.requester_position,
    formData.supervisor_name,
    formData.supervisor_position,
  ]);

  useEffect(() => {
    let offset = 0;
    let id: ReturnType<typeof setInterval>;
    const start = () => {
      const tick = () => {
        const now = new Date(Date.now() + offset);
        setClockDisplay(formatThaiDateTime(now));
        setOutsideHours(checkOutsideOfficeHoursFor(now));
      };
      tick();
      id = setInterval(tick, 1000);
    };
    fetch('/api/server-time')
      .then((r) => r.json())
      .then((data) => { offset = data.now - Date.now(); })
      .catch(() => {})
      .finally(start);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchMaster = (url: string, setter: (data: MasterOption[]) => void, autoSelectField?: string) => {
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (!Array.isArray(data)) return;
          const options = data.filter((item): item is MasterOption => typeof item?.id === 'number' && typeof item?.name === 'string');
          setter(options);
          if (autoSelectField && options.length > 0) {
            setFormData((current) => ({
              ...current,
              [autoSelectField]: current[autoSelectField as keyof typeof current] || String(options[0].id),
            }));
          }
        })
        .catch((error) => console.error(`Failed to load ${url}:`, error));
    };

    fetchMaster('/api/departments', setDepartments);
    fetchMaster('/api/trip-types', setTripTypes);
    fetchMaster('/api/fuel-reimbursements', setFuelOptions, 'fuel_reimbursement_id');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate trip type selection
    if (!formData.trip_type_id) {
      setTripTypeError(true);
      return;
    }

    const isConfirmed = await confirmBookingChallenge();
    if (!isConfirmed) return;

    setLoading(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          department_id: Number(formData.department_id),
          trip_type_id: Number(formData.trip_type_id),
          fuel_reimbursement_id: Number(formData.fuel_reimbursement_id),
          passengers: passengerCount,
        }),
      });

      if (response.ok) {
        router.push('/bookings');
        router.refresh();
      } else {
        await response.json().catch(() => null);
        // Error handled silently
      }
    } catch (error) {
      console.error(error);
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl animate-in slide-in-from-bottom-2 pb-12 duration-300">
      <div className="flex justify-end px-1 pb-3 md:px-0">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#fffaf0] px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-500 shadow-sm">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          {clockDisplay}
        </span>
      </div>

      {outsideHours && false ? (
        <div className="space-y-3 pb-6">
          <div className="rounded-md bg-amber-50 px-4 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-800">นอกเวลาราชการ</p>
                <p className="mt-1 text-sm font-medium text-amber-700">
                  วันหยุดและวันธรรมดาช่วงเวลา 16.31 ถึง 08.29 น. กรุณาติดต่องานยานพาหนะ
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
      <form
        onSubmit={handleSubmit}
        className="relative overflow-hidden rounded-md bg-[#fffaf0] px-4 py-5 shadow-[0_18px_45px_rgba(49,82,71,0.13)] md:px-8 md:py-7"
      >
        <div className="relative">
        <div className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className={sectionIconClass}>
              <User className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-700">ข้อมูลผู้ขอและหน่วยงาน</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label className={labelClass}>
                <Building2 className="mr-1 h-3 w-3" /> แผนก/กลุ่มงาน
              </label>
              <select
                required
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className={fieldClass}
              >
                <option value="">---เลือก---</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>
                <User className="mr-1 h-3 w-3" /> ชื่อ-นามสกุล ผู้ขอ
              </label>
              <input
                required
                type="text"
                value={formData.requester_name}
                onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>
                <Briefcase className="mr-1 h-3 w-3" /> ตำแหน่ง ผู้ขอ
              </label>
              <input
                required
                type="text"
                value={formData.requester_position}
                onChange={(e) => setFormData({ ...formData, requester_position: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>
                <User className="mr-1 h-3 w-3" /> ชื่อ-นามสกุล ผู้ควบคุมรถ
              </label>
              <input
                required
                type="text"
                value={formData.supervisor_name}
                onChange={(e) => setFormData({ ...formData, supervisor_name: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>
                <Briefcase className="mr-1 h-3 w-3" /> ตำแหน่ง ผู้ควบคุมรถ
              </label>
              <input
                required
                type="text"
                value={formData.supervisor_position}
                onChange={(e) => setFormData({ ...formData, supervisor_position: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className={sectionIconClass}>
              <MapPin className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-700">รายละเอียดการเดินทาง</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="space-y-1.5 md:col-span-2">
              <label className="ml-0.5 text-xs font-semibold text-slate-500">ประเภทการเดินทาง</label>
              <div className="grid grid-cols-2 gap-2">
                {tripTypes.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, trip_type_id: String(item.id) });
                      setTripTypeError(false);
                    }}
                    className={cn(
                      'flex h-10 items-center justify-between rounded-sm px-3 text-sm font-semibold transition-all',
                      formData.trip_type_id === String(item.id)
                        ? 'bg-blue-50/90 text-blue-700 shadow-[0_8px_18px_rgba(37,99,235,0.10)]'
                        : tripTypeError
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                        : 'bg-white/55 text-blue-700 hover:bg-white/80'
                    )}
                  >
                    <span>{index + 1}. {item.name}</span>
                    {formData.trip_type_id === String(item.id) && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
              {tripTypeError && (
                <p className="text-xs text-rose-600 font-medium">
                  กรุณาเลือกประเภทการเดินทาง
                </p>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-6">
              <label className="ml-0.5 text-xs font-semibold text-slate-500">สถานที่ไป</label>
              <input
                required
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5 md:col-span-6">
              <label className="ml-0.5 text-xs font-semibold text-slate-500">วัตถุประสงค์การเดินทาง</label>
              <textarea
                required
                rows={3}
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className={textareaClass}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="ml-0.5 text-xs font-semibold text-slate-500">เบิกค่าเชื้อเพลิงจาก</label>
              <select
                required
                value={formData.fuel_reimbursement_id}
                onChange={(e) => setFormData({ ...formData, fuel_reimbursement_id: e.target.value })}
                className={fieldClass}
              >
                <option value="">เลือกบริการเบิกค่าน้ำมัน</option>
                {fuelOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="ml-0.5 text-xs font-semibold text-slate-500">ระยะทางประมาณ (กม.)</label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.distance}
                onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="ml-0.5 flex items-center text-xs font-semibold text-slate-500">
                <Users className="mr-1 h-3 w-3" /> จำนวนผู้โดยสาร
              </label>
              <input
                required
                type="number"
                min="1"
                max="50"
                value={passengerCount}
                onChange={(e) => setPassengerCount(parseInt(e.target.value, 10) || 1)}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <DateTimePickerModal
                label="วันเดินทางไป"
                value={formData.start_time}
                onChange={(value) => {
                  const nextStartDateTime = parseLocalDateTime(value);
                  const currentEndDateTime = parseLocalDateTime(formData.end_time);

                  setFormData((current) => ({
                    ...current,
                    start_time: value,
                    end_time:
                      nextStartDateTime && currentEndDateTime && currentEndDateTime < nextStartDateTime
                        ? (() => {
                            const nextDefaultEndDateTime = new Date(nextStartDateTime);
                            nextDefaultEndDateTime.setHours(16, 30, 0, 0);
                            return nextDefaultEndDateTime >= nextStartDateTime
                              ? toLocalDateTimeValue(nextDefaultEndDateTime)
                              : value;
                          })()
                        : current.end_time,
                  }));
                }}
                minDate={today}
                maxDate={maxStartDate}
                required
              />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <DateTimePickerModal
                label="วันเดินทางกลับ"
                value={formData.end_time}
                onChange={(value) => setFormData({ ...formData, end_time: value })}
                minDate={startDateTime}
                required
              />
            </div>
          </div>
        </div>

        <div
          data-action-group="booking-submit-actions"
          className="mt-2 flex flex-col gap-2 border-t border-dashed border-slate-500/80 pt-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <Link
            href="/bookings"
            className="hidden h-10 rounded-sm bg-white/65 px-4 text-center text-sm font-semibold leading-10 text-slate-500 transition-colors hover:bg-white hover:text-slate-700 sm:block sm:w-auto"
          >
            ยกเลิก
          </Link>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <label
              className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-sm bg-red-100/80 px-3 text-xs font-semibold text-red-800 transition-colors hover:bg-red-200 sm:flex-none sm:px-4 sm:text-sm"
            >
              <input
                type="checkbox"
                checked={formData.self_drive}
                onChange={(e) => setFormData({ ...formData, self_drive: e.target.checked })}
                className="h-4 w-4 rounded"
                style={{ accentColor: '#ffffff' }}
              />
              ขอขับเอง
            </label>
            <button
              type="submit"
              disabled={loading}
              className="flex h-10 flex-[1.35] items-center justify-center whitespace-nowrap rounded-sm bg-emerald-600 px-3 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(18,130,69,0.22)] transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 sm:flex-none sm:px-5 sm:text-sm"
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin sm:mr-3" /> : <Plus className="mr-2 h-5 w-5 sm:mr-3" />}
              ส่งใบขอใช้รถ
            </button>
          </div>
        </div>
        </div>
      </form>
      )}
    </div>
  );
}
