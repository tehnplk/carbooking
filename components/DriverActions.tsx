'use client';

import { useState } from 'react';
import { Edit3, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DriverFormModal from '@/components/DriverFormModal';
import { confirmDelete, showError, showSuccess } from '@/lib/swal';

interface DriverActionsProps {
  driver: {
    id: number;
    fullname: string;
    driver_type_id: number;
    is_active?: boolean;
    note?: string | null;
  };
  canManage: boolean;
}

export default function DriverActions({ driver, canManage }: DriverActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (!canManage) {
    return <span className="text-xs font-semibold text-slate-400">ไม่มีสิทธิ์</span>;
  }

  const handleDelete = async () => {
    const confirmed = await confirmDelete('ยืนยันการลบพนักงานขับรถ', driver.fullname);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/drivers/${driver.id}`, { method: 'DELETE' });
      if (response.ok) {
        await showSuccess('ลบข้อมูลพนักงานขับรถเรียบร้อยแล้ว');
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
      <button onClick={() => setIsEditOpen(true)} className="p-2.5 text-slate-400 transition-colors hover:text-emerald-600" title="แก้ไขข้อมูลพนักงานขับรถ">
        <Edit3 className="h-4 w-4" />
      </button>
      <button onClick={handleDelete} disabled={isDeleting} className="p-2.5 text-slate-400 transition-colors hover:text-rose-600 disabled:opacity-50" title="ลบข้อมูลพนักงานขับรถ">
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
      <DriverFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        driver={{
          id: driver.id,
          fullname: driver.fullname,
          driver_type_id: driver.driver_type_id,
          is_active: driver.is_active ?? true,
          note: driver.note || '',
        }}
      />
    </div>
  );
}
