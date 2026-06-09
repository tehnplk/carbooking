'use client';

import { useState, useSyncExternalStore } from 'react';
import { Building2, Search, User, Users, Plus } from 'lucide-react';
import UserActions from '@/components/UserActions';
import UserFormModal from '@/components/UserFormModal';
import { createPortal } from 'react-dom';

interface UserRow {
  id: number;
  username: string;
  role_id: number;
  role_name?: string | null;
  fullname?: string | null;
  department?: string | null;
  created_at: string;
}

const noopSubscribe = () => () => {};

export default function UsersManagementClient({ users }: { users: UserRow[] }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const isMounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const createButtonDesktop = (
    <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600">
      <Plus className="mr-2 h-4 w-4" />
      เพิ่มผู้ใช้
    </button>
  );

  const createButtonMobile = (
    <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center rounded-md bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600">
      <Plus className="mr-1.5 h-4 w-4" />
      เพิ่มผู้ใช้
    </button>
  );

  const headerActionContainer = isMounted ? document.getElementById('header-extra-actions') : null;
  const headerActionMobileContainer = isMounted ? document.getElementById('header-extra-actions-mobile') : null;
  const desktopPortal = headerActionContainer ? createPortal(createButtonDesktop, headerActionContainer) : null;
  const mobilePortal = headerActionMobileContainer ? createPortal(createButtonMobile, headerActionMobileContainer) : null;

  return (
    <div className="animate-in slide-in-from-bottom-2 space-y-4 duration-300">
      {desktopPortal}
      {mobilePortal}
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <div className="flex items-center text-sm font-semibold uppercase text-slate-700">
            <Users className="mr-2 h-4 w-4 text-slate-400" />
            จำนวนสมาชิกทั้งหมด
            <span className="ml-3 rounded-md bg-emerald-500 px-3 py-1 text-[10px] text-white">{users.length}</span>
          </div>
          <div className="relative hidden w-full max-w-xs md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="ค้นหาชื่อผู้ใช้..." className="w-full rounded-md border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm shadow-none transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-8 py-3 text-left text-[11px] font-semibold uppercase text-slate-500">ข้อมูลผู้ใช้</th>
                <th className="px-8 py-3 text-left text-[11px] font-semibold uppercase text-slate-500"><span className="inline-flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />แผนก / ฝ่าย</span></th>
                <th className="px-8 py-3 text-left text-[11px] font-semibold uppercase text-slate-500">ระดับสิทธิ์</th>
                <th className="px-8 py-3 text-right text-[11px] font-semibold uppercase text-slate-500">ตั้งค่า</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="group transition-colors hover:bg-slate-50">
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50 transition-colors group-hover:bg-white">
                        <User className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-emerald-800">{u.fullname}</div>
                        <div className="text-xs font-bold text-slate-400">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-sm font-bold text-slate-700">{u.department || 'ไม่ระบุ'}</div>
                    <div className="text-[10px] font-medium text-slate-400">เข้าร่วมเมื่อ {new Date(u.created_at).toLocaleDateString('th-TH')}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="inline-flex items-center rounded-md bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase text-emerald-700">
                      {u.role_name || 'ไม่ระบุ'}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <UserActions user={u} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <UserFormModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}
