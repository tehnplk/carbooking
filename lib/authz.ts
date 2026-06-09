import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

const ALLOWED_CARS_DRIVERS_MUTATION_ROLES = new Set([
  'user',
  'admin',
  'ผู้ใช้งาน',
  'ผู้ดูแลระบบ',
]);
const ALLOWED_CARS_DRIVERS_MUTATION_ROLE_IDS = new Set([1, 2]);
const ALLOWED_DEPARTMENT_MUTATION_ROLES = new Set([
  'admin',
  'ผู้ดูแลระบบ',
]);
const ALLOWED_DEPARTMENT_MUTATION_ROLE_IDS = new Set([2]);
const ALLOWED_BOOKING_ASSIGNMENT_ROLES = new Set([
  'user',
  'ผู้ใช้งาน',
]);
const ALLOWED_BOOKING_ASSIGNMENT_ROLE_IDS = new Set([1]);

function normalizeRole(roleName: string) {
  return roleName.trim().toLowerCase().replace(/\s+/g, '');
}

export function canManageCarsDriversByRole(roleName?: string | null) {
  if (!roleName) {
    return false;
  }

  const normalizedRole = normalizeRole(roleName);
  return [...ALLOWED_CARS_DRIVERS_MUTATION_ROLES]
    .some((allowedRole) => normalizeRole(allowedRole) === normalizedRole);
}

export function canManageCarsDrivers(session: Session | null) {
  const roleId = session?.user?.roleId;
  if (typeof roleId === 'number' && ALLOWED_CARS_DRIVERS_MUTATION_ROLE_IDS.has(roleId)) {
    return true;
  }

  return canManageCarsDriversByRole(session?.user?.roleName);
}

export function canManageDepartmentsByRole(roleName?: string | null) {
  if (!roleName) {
    return false;
  }

  const normalizedRole = normalizeRole(roleName);
  return [...ALLOWED_DEPARTMENT_MUTATION_ROLES]
    .some((allowedRole) => normalizeRole(allowedRole) === normalizedRole);
}

export function canManageDepartments(session: Session | null) {
  const roleId = session?.user?.roleId;
  if (typeof roleId === 'number' && ALLOWED_DEPARTMENT_MUTATION_ROLE_IDS.has(roleId)) {
    return true;
  }

  return canManageDepartmentsByRole(session?.user?.roleName);
}

export function canAssignBookingsByRole(roleName?: string | null) {
  if (!roleName) {
    return false;
  }

  const normalizedRole = normalizeRole(roleName);
  return [...ALLOWED_BOOKING_ASSIGNMENT_ROLES]
    .some((allowedRole) => normalizeRole(allowedRole) === normalizedRole);
}

export function canAssignBookings(session: Session | null) {
  const roleId = session?.user?.roleId;
  if (typeof roleId === 'number' && ALLOWED_BOOKING_ASSIGNMENT_ROLE_IDS.has(roleId)) {
    return true;
  }

  return canAssignBookingsByRole(session?.user?.roleName);
}

type AccessResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

export async function requireCarsDriversMutationAccess(): Promise<AccessResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!canManageCarsDrivers(session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 }),
    };
  }

  return { ok: true, session };
}

export async function requireBookingAssignmentAccess(): Promise<AccessResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!canAssignBookings(session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden: user role required' }, { status: 403 }),
    };
  }

  return { ok: true, session };
}

export async function requireDepartmentMutationAccess(): Promise<AccessResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!canManageDepartments(session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 }),
    };
  }

  return { ok: true, session };
}
