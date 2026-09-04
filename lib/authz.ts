import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

// user_role.id
const ROLE_ADMIN = 1;      // ผู้ดูแลระบบ
const ROLE_FLEET = 2;      // งานยานพาหนะ

const ALLOWED_CARS_DRIVERS_MUTATION_ROLE_IDS = new Set([ROLE_ADMIN]);
const ALLOWED_DEPARTMENT_MUTATION_ROLE_IDS = new Set([ROLE_ADMIN]);
const ALLOWED_BOOKING_ASSIGNMENT_ROLE_IDS = new Set([ROLE_ADMIN, ROLE_FLEET]);
const ALLOWED_BOOKING_CANCEL_ROLE_IDS = new Set([ROLE_ADMIN, ROLE_FLEET]);

function hasRoleId(session: Session | null, allowedRoleIds: Set<number>) {
  const roleId = session?.user?.roleId;
  return typeof roleId === 'number' && allowedRoleIds.has(roleId);
}

export function canManageCarsDrivers(session: Session | null) {
  return hasRoleId(session, ALLOWED_CARS_DRIVERS_MUTATION_ROLE_IDS);
}

export function canManageDepartments(session: Session | null) {
  return hasRoleId(session, ALLOWED_DEPARTMENT_MUTATION_ROLE_IDS);
}

export function canAssignBookings(session: Session | null) {
  return hasRoleId(session, ALLOWED_BOOKING_ASSIGNMENT_ROLE_IDS);
}

export function canCancelBookings(session: Session | null) {
  return hasRoleId(session, ALLOWED_BOOKING_CANCEL_ROLE_IDS);
}

export function isAdmin(session: Session | null) {
  return session?.user?.roleId === ROLE_ADMIN;
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

export async function requireBookingCancelAccess(): Promise<AccessResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!canCancelBookings(session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden: cannot cancel bookings' }, { status: 403 }),
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

export async function requireSignedInAccess(): Promise<AccessResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { ok: true, session };
}

export async function requireAdminAccess(): Promise<AccessResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!isAdmin(session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 }),
    };
  }

  return { ok: true, session };
}
