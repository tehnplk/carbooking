'use client';

import { useEffect, useState } from 'react';
import { Building2, Loader2, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { showError, showSuccess } from '@/lib/swal';

interface DepartmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  department?: {
    id: number;
    name: string;
    is_active: boolean;
  } | null;
}

export default function DepartmentFormModal({ isOpen, onClose, department }: DepartmentFormModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    is_active: true,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData({
      name: department?.name || '',
      is_active: department?.is_active ?? true,
    });
  }, [department, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(department ? `/api/departments/${department.id}` : '/api/departments', {
        method: department ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await showSuccess(department ? 'บันทึกการแก้ไขกลุ่มงาน/ฝ่ายงานเรียบร้อยแล้ว' : 'เพิ่มกลุ่มงาน/ฝ่ายงานเรียบร้อยแล้ว');
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#23b35b] text-white shadow-lg shadow-emerald-200">
              {department ? <Save className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-700">
                {department ? 'แก้ไขกลุ่มงาน/ฝ่ายงาน' : 'เพิ่มกลุ่มงาน/ฝ่ายงานใหม่'}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {department ? department.name : 'Create department'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 shadow-sm transition-all hover:bg-white hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-8">
          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">ชื่อกลุ่มงาน/ฝ่ายงาน</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-xl border-none bg-slate-50 px-5 py-3.5 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-[#23b35b]"
              placeholder="เช่น กลุ่มงานคุ้มครอง"
            />
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">สถานะ</label>
            <select
              value={formData.is_active ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
              className="w-full cursor-pointer rounded-xl border-none bg-slate-50 px-5 py-3.5 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-[#23b35b]"
            >
              <option value="true">ใช้งาน</option>
              <option value="false">ไม่ใช้งาน</option>
            </select>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-8 py-4 text-sm font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-700">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading} className="flex flex-[2] items-center justify-center rounded-2xl bg-emerald-500 px-10 py-4 text-sm font-black text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50">
              {loading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Save className="mr-3 h-5 w-5" />}
              {department ? 'บันทึกการแก้ไข' : 'เพิ่มกลุ่มงาน/ฝ่ายงาน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
