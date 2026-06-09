'use client';

import { useState } from 'react';
import { Edit3, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CarFormModal from './CarFormModal';
import { confirmDelete, showError, showSuccess } from '@/lib/swal';

interface CarActionsProps {
  car: {
    id: number;
    brand: string;
    model: string;
    license_plate: string;
    car_number?: string | null;
    seats?: number | null;
    car_type_id?: number | null;
    car_type?: string | null;
    is_active: boolean;
  };
  canManage: boolean;
}

export default function CarActions({ car, canManage }: CarActionsProps) {
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!canManage) {
    return <span className="text-xs font-semibold text-slate-400">ไม่มีสิทธิ์</span>;
  }

  const handleDelete = async () => {
    const confirmed = await confirmDelete('ยืนยันการลบรถ', `${car.brand} ${car.model} (${car.license_plate})`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/cars/${car.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await showSuccess('ลบข้อมูลรถเรียบร้อยแล้ว');
        router.refresh();
      } else {
        const result = await response.json().catch(() => null);
        await showError(result?.error || 'เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (error) {
      console.error(error);
      await showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-end space-x-2">
      <button
        onClick={() => setIsEditModalOpen(true)}
        className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-600 hover:text-amber-500 hover:border-amber-100 hover:shadow-lg transition-all shadow-sm"
      >
        <Edit3 className="w-4 h-4" />
      </button>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-600 hover:text-rose-500 hover:border-rose-100 hover:shadow-lg transition-all shadow-sm disabled:opacity-50"
      >
        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>

      <CarFormModal
        car={car}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
}
