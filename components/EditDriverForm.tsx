'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';

interface DriverTypeOption {
  id: number;
  name: string;
}

interface EditDriverFormProps {
  driver: {
    id: number;
    fullname: string;
    driver_type_id: number;
    is_active: boolean;
    note?: string | null;
  };
}

export default function EditDriverForm({ driver }: EditDriverFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [driverTypes, setDriverTypes] = useState<DriverTypeOption[]>([]);
  const [formData, setFormData] = useState({
    fullname: driver.fullname,
    driver_type_id: driver.driver_type_id ? String(driver.driver_type_id) : '',
    is_active: driver.is_active,
    note: driver.note || '',
  });

  useEffect(() => {
    fetch('/api/driver-types')
      .then((response) => response.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const options = data.filter((item): item is DriverTypeOption => typeof item?.id === 'number' && typeof item?.name === 'string');
        setDriverTypes(options);
        setFormData((current) => ({ ...current, driver_type_id: current.driver_type_id || String(options[0]?.id || '') }));
      })
      .catch((error) => console.error('Failed to load driver types:', error));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/drivers/${driver.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          driver_type_id: Number(formData.driver_type_id),
        }),
      });

      if (response.ok) {
        router.push('/drivers');
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
          <div className="space-y-2 md:col-span-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">ชื่อ-นามสกุล</label>
            <input required type="text" value={formData.fullname} onChange={(e) => setFormData({ ...formData, fullname: e.target.value })} className="w-full rounded-2xl border-none bg-slate-50 px-6 py-4 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-emerald-200" />
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">ประเภทพนักงานขับรถ</label>
            <select value={formData.driver_type_id} onChange={(e) => setFormData({ ...formData, driver_type_id: e.target.value })} className="w-full rounded-2xl border-none bg-slate-50 px-6 py-4 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-emerald-200">
              <option value="">เลือกประเภทพนักงานขับรถ</option>
              {driverTypes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">สถานะ</label>
            <select value={formData.is_active ? 'true' : 'false'} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })} className="w-full rounded-2xl border-none bg-slate-50 px-6 py-4 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-emerald-200">
              <option value="true">พร้อมใช้งาน</option>
              <option value="false">ไม่พร้อมใช้งาน</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">หมายเหตุ</label>
            <textarea rows={4} value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className="w-full resize-none rounded-2xl border-none bg-slate-50 px-6 py-4 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-emerald-200" />
          </div>
        </div>

        <div className="mt-12 flex items-center justify-end space-x-4">
          <Link href="/drivers" className="px-8 py-4 text-sm font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-700">ยกเลิก</Link>
          <button type="submit" disabled={loading} className="flex items-center rounded-2xl bg-emerald-500 px-10 py-4 text-sm font-black text-white shadow-2xl shadow-emerald-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
            {loading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Save className="mr-3 h-5 w-5" />}
            บันทึกการแก้ไข
          </button>
        </div>
      </form>
    </div>
  );
}
