import { auth } from '@/auth';
import { queryWithEncoding } from '@/lib/db';
import { ensureDepartmentSchema } from '@/lib/department';
import { canManageDepartments } from '@/lib/authz';
import DepartmentManagementClient from '@/components/DepartmentManagementClient';

type DepartmentRow = {
  id: number;
  name: string;
  is_active: boolean;
};

export const dynamic = 'force-dynamic';

export default async function DepartmentPage() {
  const session = await auth();
  const canManage = canManageDepartments(session);

  await ensureDepartmentSchema();
  const departments = await queryWithEncoding(
    `SELECT id, name, is_active
     FROM department
     ORDER BY id ASC`
  ) as DepartmentRow[];

  return <DepartmentManagementClient departments={departments} canManage={canManage} />;
}
