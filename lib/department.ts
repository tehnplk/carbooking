import { ensureMasterDataSchema, getDepartments as getDepartmentsFromMaster } from '@/lib/master-data';

export interface DepartmentItem {
  id: number;
  name: string;
  is_active: boolean;
}

export async function ensureDepartmentSchema() {
  await ensureMasterDataSchema();
}

export async function getDepartments() {
  return getDepartmentsFromMaster() as Promise<DepartmentItem[]>;
}
