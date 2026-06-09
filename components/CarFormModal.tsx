'use client';

import { useEffect, useState } from 'react';
import { Car, Loader2, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { showError, showSuccess } from '@/lib/swal';

interface CarTypeOption {
  id: number;
  name: string;
}

interface CarFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  car?: {
    id: number;
    brand: string;
    model: string;
    license_plate: string;
    car_number?: string | null;
    seats?: number | null;
    car_type_id?: number | null;
    car_type?: string | null;
    is_active: boolean;
  } | null;
}

const emptyForm = {
  brand: '',
  model: '',
  license_plate: '',
  car_number: '',
  seats: 0,
  car_type_id: '',
  is_active: true,
};

export default function CarFormModal({ isOpen, onClose, car }: CarFormModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingCarTypes, setFetchingCarTypes] = useState(false);
  const [carTypes, setCarTypes] = useState<CarTypeOption[]>([]);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (car) {
      setFormData({
        brand: car.brand,
        model: car.model,
        license_plate: car.license_plate,
        car_number: car.car_number || '',
        seats: car.seats ?? 0,
        car_type_id: car.car_type_id ? String(car.car_type_id) : '',
        is_active: car.is_active,
      });
    } else {
      setFormData(emptyForm);
    }

    setFetchingCarTypes(true);
    fetch('/api/car-types')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const options = data.filter((item): item is CarTypeOption => typeof item?.id === 'number' && typeof item?.name === 'string');
          setCarTypes(options);
          if (!car && options[0]?.id) {
            setFormData((current) => ({ ...current, car_type_id: String(options[0].id) }));
          }
        }
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => setFetchingCarTypes(false));
  }, [car, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedCarType = carTypes.find((item) => String(item.id) === formData.car_type_id);
      const response = await fetch(car ? `/api/cars/${car.id}` : '/api/cars', {
        method: car ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          car_type_id: formData.car_type_id ? Number(formData.car_type_id) : null,
          car_type: selectedCarType?.name || null,
        }),
      });

      if (response.ok) {
        await showSuccess(car ? 'บันทึกการแก้ไขรถเรียบร้อยแล้ว' : 'เพิ่มรถเรียบร้อยแล้ว');
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
      <div className="absolute inset-0 bg-emerald-700/20 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-700 tracking-tight">{car ? 'แก้ไขข้อมูลรถยนต์' : 'เพิ่มรถยนต์ใหม่'}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{car ? car.license_plate : 'Create car'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-all shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">ยี่ห้อ</label>
              <input required type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-200 transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">รุ่น</label>
              <input required type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-200 transition-all font-bold text-slate-700" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">ทะเบียน</label>
              <input required type="text" value={formData.license_plate} onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-200 transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">หมายเลขรถ</label>
              <input type="text" value={formData.car_number} onChange={(e) => setFormData({ ...formData, car_number: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-200 transition-all font-bold text-slate-700" placeholder="เช่น CAR-01" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">จำนวนที่นั่ง</label>
              <input required type="number" value={formData.seats} onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value, 10) || 0 })} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-200 transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">ประเภทรถ</label>
              <select required value={formData.car_type_id} onChange={(e) => setFormData({ ...formData, car_type_id: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-200 transition-all font-bold text-slate-700 cursor-pointer">
                <option value="">เลือกประเภทรถ</option>
                {carTypes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              {fetchingCarTypes && <p className="text-xs text-slate-400">กำลังดึงข้อมูลประเภทรถ...</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">สถานะ</label>
              <select value={formData.is_active ? 'true' : 'false'} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-200 transition-all font-bold text-slate-700 cursor-pointer">
                <option value="true">ใช้งาน</option>
                <option value="false">ไม่ใช้งาน</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4 items-center pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-8 py-4 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors">ยกเลิก</button>
            <button type="submit" disabled={loading} className="flex-[2] bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-2xl flex items-center justify-center disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-all">
              {loading ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Save className="w-5 h-5 mr-3" />}
              {car ? 'บันทึกการแก้ไข' : 'เพิ่มรถ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
