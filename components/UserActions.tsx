'use client';

import { useState } from 'react';
import { Edit3, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import UserFormModal from '@/components/UserFormModal';
import { confirmDelete, showError, showSuccess } from '@/lib/swal';

interface UserActionsProps {
  user: {
    id: number;
    fullname?: string | null;
    username: string;
    department?: string | null;
    role_id: number;
  };
}

export default function UserActions({ user }: UserActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = async () => {
    const confirmed = await confirmDelete('ยืนยันการลบผู้ใช้', user.fullname || user.username);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      if (response.ok) {
        await showSuccess('ลบข้อมูลผู้ใช้เรียบร้อยแล้ว');
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
      <button onClick={() => setIsEditOpen(true)} className="p-2.5 text-slate-400 transition-colors hover:text-emerald-600" title="แก้ไขผู้ใช้">
        <Edit3 className="h-4 w-4" />
      </button>
      <button onClick={handleDelete} disabled={isDeleting} className="p-2.5 text-slate-400 transition-colors hover:text-rose-600 disabled:opacity-50" title="ลบผู้ใช้">
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
      <UserFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        user={{
          id: user.id,
          fullname: user.fullname || '',
          username: user.username,
          department: user.department || '',
          role_id: user.role_id,
        }}
      />
    </div>
  );
}
