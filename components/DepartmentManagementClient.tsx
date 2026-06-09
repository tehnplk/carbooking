'use client';

import { useState, useSyncExternalStore } from 'react';
import { AlertCircle, BadgeCheck, Building2, ClipboardList, Plus } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import DepartmentActions from '@/components/DepartmentActions';
import DepartmentFormModal from '@/components/DepartmentFormModal';

interface DepartmentRow {
  id: number;
  name: string;
  is_active: boolean;
}

const noopSubscribe = () => () => {};

export default function DepartmentManagementClient({ departments, canManage }: { departments: DepartmentRow[]; canManage: boolean }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const isMounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const createButtonDesktop = canManage ? (
    <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600">
      <Plus className="mr-2 h-4 w-4" />
      เพิ่มกลุ่มงาน/ฝ่ายงาน
    </button>
  ) : null;

  const createButtonMobile = canManage ? (
    <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center rounded-md bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600">
      <Plus className="mr-1.5 h-4 w-4" />
      เพิ่มกลุ่มงาน
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
            จำนวนกลุ่มงาน/ฝ่ายงาน
            <span className="ml-3 rounded-md bg-emerald-500 px-3 py-1 text-[10px] text-white">{departments.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-8 py-3 text-left text-[11px] font-semibold uppercase text-slate-500">กลุ่มงาน/ฝ่ายงาน</th>
                <th className="px-8 py-3 text-left text-[11px] font-semibold uppercase text-slate-500">
                  <span className="inline-flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5" />สถานะ</span>
                </th>
                <th className="px-8 py-3 text-right text-[11px] font-semibold uppercase text-slate-500">ตั้งค่า</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 py-8">
                      <div className="rounded-full bg-emerald-50 p-6">
                        <AlertCircle className="h-12 w-12 text-emerald-300" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-semibold text-emerald-800">ไม่พบข้อมูลกลุ่มงาน/ฝ่ายงาน</h3>
                        <p className="mx-auto max-w-xs font-medium text-emerald-700/70">ยังไม่มีข้อมูลกลุ่มงาน/ฝ่ายงานในระบบ</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                departments.map((department) => (
                  <tr key={department.id} className="group transition-colors hover:bg-slate-50">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50 transition-colors group-hover:bg-white">
                          <Building2 className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-emerald-800">{department.name}</div>
                          <div className="text-xs font-bold text-slate-400">ID #{department.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={cn(
                        'inline-flex items-center rounded-md px-3 py-1 text-[10px] font-semibold uppercase',
                        department.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      )}>
                        {department.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <DepartmentActions department={department} canManage={canManage} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canManage && <DepartmentFormModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
}
