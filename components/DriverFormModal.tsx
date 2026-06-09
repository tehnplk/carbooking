'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, UserPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { showError, showSuccess } from '@/lib/swal';

interface DriverTypeOption {
  id: number;
  name: string;
}

interface DriverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver?: {
    id: number;
    fullname: string;
    driver_type_id: number;
    is_active: boolean;
    note?: string | null;
  } | null;
}

export default function DriverFormModal({ isOpen, onClose, driver }: DriverFormModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [driverTypes, setDriverTypes] = useState<DriverTypeOption[]>([]);
  const [formData, setFormData] = useState({
    fullname: '',
    driver_type_id: '',
    is_active: true,
    note: '',
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    fetch('/api/driver-types')
      .then((response) => response.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          return;
        }

        const options = data.filter(
          (item): item is DriverTypeOption => typeof item?.id === 'number' && typeof item?.name === 'string'
        );
        setDriverTypes(options);

        setFormData((current) => ({
          ...current,
          driver_type_id: driver?.driver_type_id ? String(driver.driver_type_id) : current.driver_type_id || String(options[0]?.id || ''),
        }));
      })
      .catch((error) => {
        console.error('Failed to load driver types:', error);
      });

    setFormData({
      fullname: driver?.fullname || '',
      driver_type_id: driver?.driver_type_id ? String(driver.driver_type_id) : '',
      is_active: driver?.is_active ?? true,
      note: driver?.note || '',
    });
  }, [driver, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(driver ? `/api/drivers/${driver.id}` : '/api/drivers', {
        method: driver ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          driver_type_id: Number(formData.driver_type_id),
        }),
      });

      if (response.ok) {
        await showSuccess(driver ? 'บันทึกการแก้ไขพนักงานขับรถเรียบร้อยแล้ว' : 'เพิ่มพนักงานขับรถเรียบร้อยแล้ว');
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
              {driver ? <Save className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-700">{driver ? 'แก้ไขข้อมูลพนักงานขับรถ' : 'เพิ่มพนักงานขับรถใหม่'}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{driver ? driver.fullname : 'Create driver'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 shadow-sm transition-all hover:bg-white hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 p-8">
          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">ชื่อ-นามสกุล</label>
            <input required type="text" value={formData.fullname} onChange={(e) => setFormData({ ...formData, fullname: e.target.value })} className="w-full rounded-xl border-none bg-slate-50 px-5 py-3.5 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-[#23b35b]" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">ประเภทพนักงานขับรถ</label>
              <select required value={formData.driver_type_id} onChange={(e) => setFormData({ ...formData, driver_type_id: e.target.value })} className="w-full cursor-pointer rounded-xl border-none bg-slate-50 px-5 py-3.5 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-[#23b35b]">
                <option value="">เลือกประเภทพนักงานขับรถ</option>
                {driverTypes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">สถานะ</label>
              <select value={formData.is_active ? 'true' : 'false'} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })} className="w-full cursor-pointer rounded-xl border-none bg-slate-50 px-5 py-3.5 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-[#23b35b]">
                <option value="true">พร้อมใช้งาน</option>
                <option value="false">ไม่พร้อมใช้งาน</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">หมายเหตุ</label>
            <textarea rows={4} value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className="w-full resize-none rounded-xl border-none bg-slate-50 px-5 py-3.5 font-bold text-slate-700 transition-all focus:ring-2 focus:ring-[#23b35b]" />
          </div>
          <div className="flex items-center gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-8 py-4 text-sm font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-700">ยกเลิก</button>
            <button type="submit" disabled={loading} className="flex flex-[2] items-center justify-center rounded-2xl bg-emerald-500 px-10 py-4 text-sm font-black text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50">
              {loading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : driver ? <Save className="mr-3 h-5 w-5" /> : <UserPlus className="mr-3 h-5 w-5" />}
              {driver ? 'บันทึกการแก้ไข' : 'เพิ่มพนักงานขับรถ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
