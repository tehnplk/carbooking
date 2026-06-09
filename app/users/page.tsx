import { queryWithEncoding } from '@/lib/db';
import UsersManagementClient from '@/components/UsersManagementClient';
import { ensureMasterDataSchema } from '@/lib/master-data';

type UserRow = {
  id: number;
  username: string;
  role_id: number;
  role_name?: string | null;
  fullname?: string | null;
  department?: string | null;
  created_at: string;
};

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  await ensureMasterDataSchema();
  const users = await queryWithEncoding(
    `SELECT u.id, u.username, u.role_id, ur.name AS role_name, u.fullname, u.department, u.created_at
     FROM users u
     LEFT JOIN user_role ur ON ur.id = u.role_id
     ORDER BY u.id DESC`
  ) as UserRow[];

  return <UsersManagementClient users={users} />;
}
