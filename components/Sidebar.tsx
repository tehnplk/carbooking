"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  ChartNoAxesCombined,
  Building2,
  Car,
  User,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';

const menuItems = [
  { name: 'รายการขอใช้รถ', href: '/bookings', icon: CalendarCheck, isPublic: true },
  { name: 'รายงาน', href: '/report', icon: ChartNoAxesCombined, isPublic: true },
  { name: 'ยานพาหนะ', href: '/cars', icon: Car, isPublic: true },
  { name: 'พนักงานขับรถ', href: '/drivers', icon: User },
  { name: 'กลุ่มงาน/ฝ่ายงาน', href: '/department', icon: Building2 },
  { name: 'ผู้ใช้งาน', href: '/users', icon: Users },
];

type SessionUser = {
  username?: string | null;
  name?: string | null;
};

interface SidebarProps {
  isOpen?: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  isOpen,
  isCollapsed = false,
  onClose,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!mounted) {
          return;
        }

        if (!response.ok) {
          setSessionUser(null);
          return;
        }

        const data = (await response.json()) as { user?: SessionUser | null };
        setSessionUser(data?.user ?? null);
      } catch {
        if (mounted) {
          setSessionUser(null);
        }
      }
    };

    loadSession();
    return () => {
      mounted = false;
    };
  }, [pathname]);

  const isAuthenticated = !!sessionUser;
  const displayName = sessionUser?.username || sessionUser?.name || 'ผู้ใช้งาน';

  return (
    <div
      className={cn(
        'fixed inset-y-3 z-50 flex w-72 max-w-[calc(100vw-1.5rem)] flex-col rounded-xl border border-emerald-100/80 bg-white/95 p-3 text-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur transition-all duration-300 ease-in-out lg:sticky lg:left-3 lg:top-3 lg:h-[calc(100vh-1.5rem)] lg:translate-x-0 lg:self-start lg:overflow-y-auto lg:p-2',
        isCollapsed ? 'lg:w-16' : 'lg:w-60',
        isOpen ? 'left-3 translate-x-0' : '-left-80 translate-x-0'
      )}
    >
      <div className={cn('mb-4 flex items-center justify-between px-0.5', isCollapsed && 'lg:justify-center')}>
        <div className={cn('flex items-center space-x-2.5', isCollapsed && 'justify-center')}>
          <div className={cn('relative h-9 w-9 overflow-hidden rounded-lg shadow-sm shadow-emerald-500/25', isCollapsed && 'lg:hidden')}>
            <Image
              src="/app-logo.png"
              alt="PLKCar"
              fill
              sizes="36px"
              className="object-cover"
              priority
            />
          </div>
          <div className={cn('min-w-0 leading-tight', isCollapsed && 'lg:hidden')}>
            <div className="truncate text-base font-semibold tracking-tight text-emerald-800">PLKCar</div>
            <div className="truncate text-xs font-medium text-slate-500">ระบบขอใช้รถ</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleCollapse}
            className="hidden h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700 lg:flex"
            title={isCollapsed ? 'ขยายเมนู' : 'หุบเมนู'}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <nav className="flex flex-col space-y-1 flex-grow">
        {menuItems.filter((item) => isAuthenticated || item.isPublic).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'group flex items-center rounded-lg text-[13px] font-medium transition-all duration-200 ease-in-out',
                isCollapsed ? 'space-x-2 px-2.5 py-2.5 lg:h-10 lg:w-10 lg:justify-center lg:space-x-0 lg:p-0' : 'space-x-2 px-2.5 py-2.5 lg:py-2',
                isActive
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                  : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <div
                className={cn(
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border transition-colors',
                  isCollapsed && isActive
                    ? 'border-white/15 bg-white/10'
                    : isActive
                      ? 'border-white/15 bg-white/10'
                      : 'border-slate-200 bg-slate-50 group-hover:bg-white'
                )}
              >
                <Icon
                  className={cn(
                    'h-3.5 w-3.5',
                    isActive ? 'text-white' : 'text-slate-500'
                  )}
                />
              </div>
              <span className={cn('min-w-0 flex-1 truncate', isCollapsed && 'lg:hidden')}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-emerald-100/80 pt-3">
        {isAuthenticated && (
          <div className={cn('px-2.5 pb-1 text-[12px] font-medium text-slate-500', isCollapsed && 'lg:hidden')}>
            ชื่อ {displayName}
          </div>
        )}

        <button
          onClick={() => {
            if (isAuthenticated) {
              signOut({ callbackUrl: '/login' });
              return;
            }
            router.push('/login');
          }}
          className={cn(
            'group flex items-center rounded-lg text-[13px] font-medium text-slate-600 transition-colors duration-200 hover:bg-emerald-50 hover:text-emerald-800',
            isCollapsed ? 'w-full space-x-2 px-2.5 py-2.5 lg:h-10 lg:w-10 lg:justify-center lg:space-x-0 lg:p-0' : 'w-full space-x-2 px-2.5 py-2'
          )}
          title={isCollapsed ? (isAuthenticated ? '[ออกระบบ]' : '[เข้าระบบ]') : undefined}
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform flex-shrink-0" />
          <span className={cn(isCollapsed && 'lg:hidden')}>{isAuthenticated ? '[ออกระบบ]' : '[เข้าระบบ]'}</span>
        </button>
      </div>
    </div>
  );
}
