import { queryWithEncoding } from '@/lib/db';
import CarsManagementClient from '@/components/CarsManagementClient';
import { ensureCarTypeSchema } from '@/lib/car-type';
import { auth } from '@/auth';
import { canManageCarsDrivers } from '@/lib/authz';

type CarRow = {
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

export const dynamic = 'force-dynamic';

export default async function CarsPage() {
  const session = await auth();
  const canManage = canManageCarsDrivers(session);

  await ensureCarTypeSchema();
  const cars = await queryWithEncoding(
    `SELECT c.id, c.brand, c.model, c.license_plate, c.car_number, c.seats, c.car_type_id, ct.name AS car_type, c.is_active
     FROM cars c
     LEFT JOIN car_type ct ON c.car_type_id = ct.id
     ORDER BY c.id DESC`
  ) as CarRow[];

  return <CarsManagementClient cars={cars} canManage={canManage} isAuthenticated={!!session?.user} />;
}
