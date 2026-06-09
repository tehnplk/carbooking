'use client';

import { useState, useSyncExternalStore } from 'react';
import { AlertCircle, BadgeCheck, ClipboardList, Plus, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import DriverActions from '@/components/DriverActions';
import DriverFormModal from '@/components/DriverFormModal';
import { createPortal } from 'react-dom';

interface DriverRow {
  id: number;
  fullname: string;
  driver_type_id: number;
  driver_type_name?: string | null;
  is_active: boolean;
  note?: string | null;
  created_at: string;
}

const noopSubscribe = () => () => {};

export default function DriversManagementClient({ drivers, canManage }: { drivers: DriverRow[]; canManage: boolean }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const isMounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const createButtonDesktop = canManage ? (
    <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600">
      <Plus className="mr-2 h-4 w-4" />
      เพิ่มพนักงานขับรถ
    </button>
  ) : null;

  const createButtonMobile = canManage ? (
    <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center rounded-md bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600">
      <Plus className="mr-1.5 h-4 w-4" />
      เพิ่มคนขับ
    </button>
  ) : null;

  const headerActionContainer = isMounted ? document.getElementById('header-extra-actions') : null;
  const headerActionMobileContainer = isMounted ? document.getElementById('header-extra-actions-mobile') : null;
  const desktopPortal = headerActionContainer ? createPortal(createButtonDesktop, headerActionContainer) : null;
  const mobilePortal = headerActionMobileContainer ? createPortal(createButtonMobile, headerActionMobileContainer) : null;

  return (
    <div className="animate-in slide-in-from-bottom-2 space-y-4 duration-300">
      {desktopPortal}
      {mobilePortal}
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white p-4">
          <div className="flex items-center text-sm font-semibold uppercase text-slate-700">
            <ClipboardList className="mr-2 h-4 w-4 text-slate-400" />
            จำนวนพนักงานขับรถ
            <span className="ml-3 rounded-md bg-emerald-500 px-3 py-1 text-[10px] text-white">{drivers.length}</span>
          </div>
          <div className="relative hidden w-full max-w-xs md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="ค้นหาชื่อพนักงานขับรถ..." className="w-full rounded-md border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm shadow-none transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-8 py-3 text-left text-[11px] font-semibold uppercase text-slate-500">ข้อมูลพนักงานขับรถ</th>
                <th className="px-8 py-3 text-left text-[11px] font-semibold uppercase text-slate-500"><span className="inline-flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5" />สถานะ</span></th>
                <th className="px-8 py-3 text-left text-[11px] font-semibold uppercase text-slate-500">หมายเหตุ</th>
                <th className="px-8 py-3 text-right text-[11px] font-semibold uppercase text-slate-500">เพิ่มเติม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 py-8">
                      <div className="rounded-full bg-emerald-50 p-6">
                        <AlertCircle className="h-12 w-12 text-emerald-300" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-semibold text-emerald-800">ไม่พบพนักงานขับรถ</h3>
                        <p className="mx-auto max-w-xs font-medium text-emerald-700/70">ยังไม่มีข้อมูลพนักงานขับรถในระบบ</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr key={driver.id} className="group transition-colors hover:bg-slate-50">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50 transition-colors group-hover:bg-white">
                          <User className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-emerald-800">{driver.fullname}</div>
                          <div className="text-xs font-bold text-slate-400">ID #{driver.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="inline-flex items-center rounded-md bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase text-emerald-700">
                          {driver.driver_type_name || 'ไม่ระบุ'}
                        </div>
                        <div className={cn('inline-flex items-center rounded-md px-3 py-1 text-[10px] font-semibold uppercase', driver.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                          {driver.is_active ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-medium text-slate-600">{driver.note || '-'}</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <DriverActions driver={driver} canManage={canManage} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {canManage && <DriverFormModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
}
