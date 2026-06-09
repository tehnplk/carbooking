import { queryWithEncoding } from '@/lib/db';
import DriversManagementClient from '@/components/DriversManagementClient';
import { ensureMasterDataSchema } from '@/lib/master-data';
import { auth } from '@/auth';
import { canManageCarsDrivers } from '@/lib/authz';

type DriverRow = {
  id: number;
  fullname: string;
  driver_type_id: number;
  driver_type_name?: string | null;
  is_active: boolean;
  note?: string | null;
  created_at: string;
};

export const dynamic = 'force-dynamic';

export default async function DriversPage() {
  const session = await auth();
  const canManage = canManageCarsDrivers(session);

  await ensureMasterDataSchema();
  const drivers = await queryWithEncoding(
    `SELECT d.id, d.fullname, d.driver_type_id, dt.name AS driver_type_name,
            d.is_active, d.note, d.created_at
     FROM drivers d
     LEFT JOIN driver_type dt ON dt.id = d.driver_type_id
     ORDER BY d.driver_type_id NULLS LAST, d.fullname ASC`
  ) as DriverRow[];

  return <DriversManagementClient drivers={drivers} canManage={canManage} />;
}
