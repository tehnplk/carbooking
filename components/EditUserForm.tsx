'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';

interface UserRoleOption {
  id: number;
  name: string;
}

interface EditUserFormProps {
  user: {
    id: number;
    fullname?: string | null;
    username: string;
    department?: string | null;
    role_id: number;
  };
}

export default function EditUserForm({ user }: EditUserFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<UserRoleOption[]>([]);
  const [formData, setFormData] = useState({
    fullname: user.fullname || '',
    username: user.username,
    password: '',
    department: user.department || '',
    role_id: user.role_id ? String(user.role_id) : '',
  });

  useEffect(() => {
    fetch('/api/user-roles')
      .then((response) => response.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const options = data.filter((item): item is UserRoleOption => typeof item?.id === 'number' && typeof item?.name === 'string');
        setRoles(options);
        setFormData((current) => ({ ...current, role_id: current.role_id || String(options[0]?.id || '') }));
      })
      .catch((error) => console.error('Failed to load user roles:', error));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role_id: Number(formData.role_id),
        }),
      });

      if (response.ok) {
        router.push('/users');
        router.refresh();
      } else {
        const result = await response.json().catch(() => null);
        alert(result?.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl animate-in slide-in-from-bottom-4 space-y-8 duration-500">
      <form onSubmit={handleSubmit} className="rounded-[2.5rem] border border-slate-100 bg-white p-10 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">ชื่อ-นามสกุล</label>
            <input required type="text" value={formData.fullname} onChange={(e) => setFormData({ ...formData, fullname: e.target.value })} className="w-full rounded-2xl border-none bg-slate-50 px-6 py-4 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">ชื่อผู้ใช้งาน (Username)</label>
            <input required type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full rounded-2xl border-none bg-slate-50 px-6 py-4 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">รหัสผ่านใหม่</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full rounded-2xl border-none bg-slate-50 px-6 py-4 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-emerald-500" placeholder="เว้นว่างหากไม่ต้องการเปลี่ยน" />
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">แผนก / ฝ่าย</label>
            <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full rounded-2xl border-none bg-slate-50 px-6 py-4 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">ระดับสิทธิ์</label>
            <select value={formData.role_id} onChange={(e) => setFormData({ ...formData, role_id: e.target.value })} className="w-full rounded-2xl border-none bg-slate-50 px-6 py-4 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-emerald-500">
              <option value="">เลือกระดับสิทธิ์</option>
              {roles.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-end space-x-4">
          <Link href="/users" className="px-8 py-4 text-sm font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-700">ยกเลิก</Link>
          <button type="submit" disabled={loading} className="flex items-center rounded-2xl bg-emerald-500 px-10 py-4 text-sm font-black text-white shadow-2xl shadow-emerald-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
            {loading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Save className="mr-3 h-5 w-5" />}
            บันทึกการแก้ไข
          </button>
        </div>
      </form>
    </div>
  );
}
