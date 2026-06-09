'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, UserPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { showError, showSuccess } from '@/lib/swal';

interface UserRoleOption {
  id: number;
  name: string;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    id: number;
    fullname?: string | null;
    username: string;
    department?: string | null;
    role_id: number;
  } | null;
}

export default function UserFormModal({ isOpen, onClose, user }: UserFormModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<UserRoleOption[]>([]);
  const [formData, setFormData] = useState({
    fullname: '',
    username: '',
    password: '',
    department: '',
    role_id: '',
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    fetch('/api/user-roles')
      .then((response) => response.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          return;
        }

        const options = data.filter(
          (item): item is UserRoleOption => typeof item?.id === 'number' && typeof item?.name === 'string'
        );
        setRoles(options);
        setFormData((current) => ({
          ...current,
          role_id: user?.role_id ? String(user.role_id) : current.role_id || String(options[0]?.id || ''),
        }));
      })
      .catch((error) => {
        console.error('Failed to load user roles:', error);
      });

    setFormData({
      fullname: user?.fullname || '',
      username: user?.username || '',
      password: '',
      department: user?.department || '',
      role_id: user?.role_id ? String(user.role_id) : '',
    });
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(user ? `/api/users/${user.id}` : '/api/users', {
        method: user ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role_id: Number(formData.role_id),
        }),
      });

      if (response.ok) {
        await showSuccess(user ? 'บันทึกการแก้ไขผู้ใช้เรียบร้อยแล้ว' : 'เพิ่มผู้ใช้เรียบร้อยแล้ว');
        onClose();
        router.refresh();
      } else {
        const result = await response.json().catch(() => null);
        await showError(result?.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error(error);
      await showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-in fade-in bg-emerald-700/20 backdrop-blur-sm duration-300" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/50 p-8">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
              {user ? <Save className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-700">{user ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้งานใหม่'}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{user ? `@${user.username}` : 'Create user'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 shadow-sm transition-all hover:bg-white hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">ชื่อ-นามสกุล</label>
              <input required type="text" value={formData.fullname} onChange={(e) => setFormData({ ...formData, fullname: e.target.value })} className="w-full rounded-xl border-none bg-slate-50 px-5 py-3.5 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-emerald-600" />
            </div>
            <div className="space-y-2">
              <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">Username</label>
              <input required type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full rounded-xl border-none bg-slate-50 px-5 py-3.5 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-emerald-600" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">{user ? 'รหัสผ่านใหม่' : 'รหัสผ่าน'}</label>
              <input type="password" required={!user} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={user ? 'เว้นว่างหากไม่เปลี่ยน' : ''} className="w-full rounded-xl border-none bg-slate-50 px-5 py-3.5 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-emerald-600" />
            </div>
            <div className="space-y-2">
              <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">แผนก / ฝ่าย</label>
              <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full rounded-xl border-none bg-slate-50 px-5 py-3.5 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-emerald-600" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">ระดับสิทธิ์</label>
            <select required value={formData.role_id} onChange={(e) => setFormData({ ...formData, role_id: e.target.value })} className="w-full cursor-pointer rounded-xl border-none bg-slate-50 px-5 py-3.5 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-emerald-600">
              <option value="">เลือกระดับสิทธิ์</option>
              {roles.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-8 py-4 text-sm font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-700">ยกเลิก</button>
            <button type="submit" disabled={loading} className="flex flex-[2] items-center justify-center rounded-2xl bg-emerald-500 px-10 py-4 text-sm font-black text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50">
              {loading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : user ? <Save className="mr-3 h-5 w-5" /> : <UserPlus className="mr-3 h-5 w-5" />}
              {user ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
