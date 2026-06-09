'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const TH_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const TH_WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

interface DateTimePickerModalProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => pad2(index * 5));

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

function toLocalDateTimeValue(date: Date) {
  // Use local timezone to avoid date shifting
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes());
  const localYear = localDate.getFullYear();
  const localMonth = pad2(localDate.getMonth() + 1);
  const localDay = pad2(localDate.getDate());
  const localHours = pad2(localDate.getHours());
  const localMinutes = pad2(localDate.getMinutes());

  return `${localYear}-${localMonth}-${localDay}T${localHours}:${localMinutes}`;
}

function buildCalendarDays(viewDate: Date) {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startOffset = monthStart.getDay();
  const firstCell = new Date(monthStart);
  firstCell.setDate(monthStart.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    return date;
  });
}

function formatSelectedValue(value: string) {
  const date = parseLocalDateTime(value);
  if (!date) return '';

  return `${date.getDate()} ${TH_MONTHS[date.getMonth()]} ${date.getFullYear() + 543} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export default function DateTimePickerModal({ label, value, onChange, required, placeholder = 'เลือกวันและเวลา', minDate, maxDate }: DateTimePickerModalProps) {
  const initialDate = parseLocalDateTime(value) ?? new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(initialDate);
  const [draftHour, setDraftHour] = useState(pad2(initialDate.getHours()));
  const [draftMinute, setDraftMinute] = useState(pad2(initialDate.getMinutes()));
  const [viewDate, setViewDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const timeSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    queueMicrotask(() => {
      const current = parseLocalDateTime(value) ?? new Date();
      setDraftDate(current);
      setDraftHour(pad2(current.getHours()));
      setDraftMinute(pad2(current.getMinutes()));
      setViewDate(new Date(current.getFullYear(), current.getMonth(), 1));
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const displayValue = formatSelectedValue(value);
  const minDateStart = startOfDay(minDate ?? new Date());
  const maxDateStart = maxDate ? startOfDay(maxDate) : null;

  const isDateOutOfRange = (date: Date) => {
    const dateStart = startOfDay(date);
    if (dateStart < minDateStart) return true;
    if (maxDateStart && dateStart > maxDateStart) return true;
    return false;
  };

  const openModal = () => setIsOpen(true);

  const handleDaySelect = (date: Date) => {
    if (isDateOutOfRange(date)) return;
    setDraftDate(date);
    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));

    requestAnimationFrame(() => {
      timeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleConfirm = () => {
    const combined = new Date(
      draftDate.getFullYear(),
      draftDate.getMonth(),
      draftDate.getDate(),
      Number(draftHour),
      Number(draftMinute),
      0,
      0
    );

    if (isDateOutOfRange(combined)) {
      return;
    }

    onChange(toLocalDateTimeValue(combined));
    setIsOpen(false);
  };

  const monthLabel = `${TH_MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear() + 543}`;

  return (
    <>
      <div className="space-y-1.5">
        <label className="ml-0.5 flex items-center text-xs font-semibold text-slate-500">
          <CalendarDays className="mr-1 h-3 w-3" /> {label}
        </label>
        <input
          required={required}
          readOnly
          type="text"
          value={displayValue}
          onClick={openModal}
          placeholder={placeholder}
          className="h-10 w-full cursor-pointer rounded-md border border-slate-200 bg-white px-3 text-sm font-medium !text-blue-700 outline-none transition-all placeholder:text-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-1.5 md:p-2">
          <div className="absolute inset-0 bg-emerald-700/20 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative flex max-h-[68vh] w-full max-w-[28rem] flex-col overflow-hidden rounded-[1.1rem] border border-slate-100 bg-white font-sans shadow-2xl md:max-w-[30rem]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3 py-2 md:px-4 md:py-2.5">
              <div>
                <h3 className="text-sm font-black text-slate-700 md:text-sm">เลือกวันและเวลา</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl p-2 text-slate-400 transition-all hover:bg-white hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-1.5 md:p-2">
              <div className="space-y-2">
                <div className="rounded-3xl border border-slate-100 bg-white p-1.5 md:p-2">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="text-center">
                      <div className="text-sm font-black text-slate-700">{monthLabel}</div>
                      <div className="text-[8px] font-bold uppercase tracking-widest text-slate-400">แตะวันที่เพื่อเลือก</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-0.5 text-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                    {TH_WEEKDAYS.map((weekday) => (
                      <div key={weekday} className="py-0.5">
                        {weekday}
                      </div>
                    ))}
                  </div>

                  <div className="mt-0.5 grid grid-cols-7 gap-0.5">
                    {calendarDays.map((date) => {
                      const isActiveMonth = date.getMonth() === viewDate.getMonth();
                      const isSelected = date.toDateString() === draftDate.toDateString();
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isPastDate = isDateOutOfRange(date);

                      return (
                        <button
                          key={date.toISOString()}
                          type="button"
                          disabled={isPastDate}
                          onClick={() => handleDaySelect(date)}
                          className={cn(
                            'flex aspect-square items-center justify-center rounded-md border text-[10px] font-black transition-all',
                            isPastDate
                              ? 'cursor-not-allowed border-transparent bg-slate-100 text-slate-300 opacity-50'
                              : '',
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                              : isToday
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                : 'border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-slate-100',
                            !isActiveMonth && !isSelected ? 'opacity-45' : ''
                          )}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div ref={timeSectionRef} className="rounded-3xl border border-slate-100 bg-slate-50/60 p-2 scroll-mt-3">
                  <div className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">เวลา</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-2">
                      <label className="ml-1 flex items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <Clock className="mr-1 h-3 w-3" /> นาฬิกา
                      </label>
                      <select
                        value={draftHour}
                        onChange={(e) => setDraftHour(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-2.5 py-2 font-bold !text-blue-700 outline-none transition-all focus:ring-2 focus:ring-indigo-600"
                      >
                        {Array.from({ length: 24 }, (_, index) => pad2(index)).map((hour) => (
                          <option key={hour} value={hour}>
                            {hour}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="ml-1 flex items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <Clock className="mr-1 h-3 w-3" /> นาที
                      </label>
                      <select
                        value={draftMinute}
                        onChange={(e) => setDraftMinute(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-2.5 py-2 font-bold !text-blue-700 outline-none transition-all focus:ring-2 focus:ring-indigo-600"
                      >
                        {MINUTE_OPTIONS.includes(draftMinute) ? null : (
                          <option value={draftMinute}>{draftMinute}</option>
                        )}
                        {MINUTE_OPTIONS.map((minute) => (
                          <option key={minute} value={minute}>
                            {minute}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-1.5 rounded-3xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">
                    {draftDate.getDate()} {TH_MONTHS[draftDate.getMonth()]} {draftDate.getFullYear() + 543} {draftHour}:{draftMinute}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-2 sm:flex-row sm:items-center md:px-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-6 py-2 text-sm font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isDateOutOfRange(draftDate)}
                className="flex-[2] rounded-2xl bg-emerald-500 px-8 py-2 text-sm font-black text-white shadow-2xl transition-all hover:scale-[1.01]"
              >
                ยืนยันวันและเวลา
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
