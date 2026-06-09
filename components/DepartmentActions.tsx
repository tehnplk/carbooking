'use client';

import { useState } from 'react';
import { Edit3, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DepartmentFormModal from '@/components/DepartmentFormModal';
import { confirmDelete, showError, showSuccess } from '@/lib/swal';

interface DepartmentActionsProps {
  department: {
    id: number;
    name: string;
    is_active: boolean;
  };
  canManage: boolean;
}

export default function DepartmentActions({ department, canManage }: DepartmentActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (!canManage) {
    return <span className="text-xs font-semibold text-slate-400">ไม่มีสิทธิ์</span>;
  }

  const handleDelete = async () => {
    const confirmed = await confirmDelete('ยืนยันการลบกลุ่มงาน/ฝ่ายงาน', department.name);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/departments/${department.id}`, { method: 'DELETE' });
      if (response.ok) {
        await showSuccess('ลบข้อมูลกลุ่มงาน/ฝ่ายงานเรียบร้อยแล้ว');
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
      <button onClick={() => setIsEditOpen(true)} className="p-2.5 text-slate-400 transition-colors hover:text-emerald-600" title="แก้ไขข้อมูลกลุ่มงาน/ฝ่ายงาน">
        <Edit3 className="h-4 w-4" />
      </button>
      <button onClick={handleDelete} disabled={isDeleting} className="p-2.5 text-slate-400 transition-colors hover:text-rose-600 disabled:opacity-50" title="ลบข้อมูลกลุ่มงาน/ฝ่ายงาน">
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>

      <DepartmentFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        department={department}
      />
    </div>
  );
}
