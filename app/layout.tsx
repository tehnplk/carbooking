'use client';

import Link from 'next/link';
import { Geist } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Building2, CalendarCheck, Car, ChartNoAxesCombined, Menu, Plus, User, Users } from 'lucide-react';
import { SessionProvider } from 'next-auth/react';

const appFont = Geist({
  subsets: ['latin'],
  variable: '--font-app',
});

function getPageTitle(pathname: string) {
  const pageTitles: Record<string, string> = {
    '/': 'PLKCar',
    '/login': 'เข้าสู่ระบบ',
    '/bookings': 'รายการขอใช้รถ',
    '/report': 'รายงาน',
    '/bookings/add': 'สร้างใบขอใช้รถใหม่',
    '/cars': 'ยานพาหนะ',
    '/cars/add': 'เพิ่มรถยนต์คันใหม่',
    '/drivers': 'พนักงานขับรถ',
    '/drivers/add': 'เพิ่มพนักงานขับรถใหม่',
    '/department': 'กลุ่มงาน/ฝ่ายงาน',
    '/users': 'ผู้ใช้งาน',
    '/users/add': 'เพิ่มผู้ใช้งานใหม่',
  };

  if (pageTitles[pathname]) return pageTitles[pathname];
  if (/^\/bookings\/[^/]+\/edit$/.test(pathname)) return 'แก้ไขใบขอใช้รถ';
  if (/^\/drivers\/[^/]+\/edit$/.test(pathname)) return 'แก้ไขข้อมูลพนักงานขับรถ';
  if (/^\/users\/[^/]+\/edit$/.test(pathname)) return 'แก้ไขผู้ใช้งาน';
  return 'PLKCar';
}

function PageIcon({ pathname }: { pathname: string }) {
  const className = 'h-5 w-5 text-emerald-700';

  if (pathname.startsWith('/bookings')) return <CalendarCheck className={className} />;
  if (pathname === '/report') return <ChartNoAxesCombined className={className} />;
  if (pathname.startsWith('/cars')) return <Car className={className} />;
  if (pathname.startsWith('/drivers')) return <User className={className} />;
  if (pathname === '/department') return <Building2 className={className} />;
  if (pathname.startsWith('/users')) return <Users className={className} />;
  return null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const currentTitle = getPageTitle(pathname);

  useEffect(() => {
    document.title = currentTitle === 'PLKCar' ? currentTitle : `${currentTitle} | PLKCar`;
  }, [currentTitle]);

  const headerAction = (() => {
    switch (pathname) {
      case '/bookings':
        return {
          href: '/bookings/add',
          label: 'ขอใช้รถ',
          mobileLabel: 'ขอใช้รถ',
          icon: Plus,
          className: 'bg-emerald-500 text-white hover:bg-emerald-600',
        };
      case '/cars/add':
        return {
          href: '/cars',
          label: 'กลับ',
          mobileLabel: 'กลับ',
          icon: ArrowLeft,
          className: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
        };
      case '/bookings/add':
        return {
          href: '/bookings',
          label: 'กลับ',
          mobileLabel: 'กลับ',
          icon: ArrowLeft,
          className: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
        };
      case '/users/add':
      case '/drivers/add':
        return {
          href: pathname.startsWith('/drivers') ? '/drivers' : '/users',
          label: 'กลับ',
          mobileLabel: 'กลับ',
          icon: ArrowLeft,
          className: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
        };
      default:
        return null;
    }
  })();

  if (isLoginPage) {
    return (
      <html lang="th">
        <body className={`${appFont.variable} font-sans antialiased`}>
          <SessionProvider>{children}</SessionProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="th">
      <body className={`${appFont.variable} font-sans antialiased flex min-h-screen relative overflow-x-hidden`}>
        <SessionProvider>
          {isSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-emerald-950/20 backdrop-blur-sm animate-in fade-in duration-300 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <Sidebar
            isOpen={isSidebarOpen}
            isCollapsed={isSidebarCollapsed}
            onClose={() => setIsSidebarOpen(false)}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />

          <div className="flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out">
          <header className="sticky top-3 z-30 mx-5 mt-3 hidden h-14 items-center justify-between rounded-xl border border-emerald-100/80 bg-white/85 px-5 shadow-sm backdrop-blur lg:flex">
            <div className="flex items-center space-x-3">
              <PageIcon pathname={pathname} />
              <div className="flex items-center">
                <span className="text-base font-semibold tracking-tight text-emerald-800">{currentTitle}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div id="header-extra-actions" className="flex items-center gap-1" />
              {headerAction && (
                <Link
                  href={headerAction.href}
                  className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${headerAction.className}`}
                >
                  <headerAction.icon className="mr-2 h-4 w-4" />
                  {headerAction.label}
                </Link>
              )}
            </div>
          </header>

          <header className="sticky top-2 z-30 mx-3 mt-2 flex h-12 items-center justify-between rounded-xl border border-emerald-100/80 bg-white/85 px-3 shadow-sm backdrop-blur lg:hidden">
            <div className="flex items-center space-x-2">
              <button
                data-mobile-menu-trigger="primary"
                onClick={() => setIsSidebarOpen(true)}
                className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
              >
                <Menu className="w-6 h-6" />
              </button>
              <span className="min-w-0 truncate text-base font-semibold tracking-tight text-emerald-800">{currentTitle}</span>
            </div>
            <div className="flex items-center gap-1">
              <div id="header-extra-actions-mobile" className="flex items-center gap-1" />
              {headerAction && (
                <Link
                  href={headerAction.href}
                  className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${headerAction.className}`}
                >
                  <headerAction.icon className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{headerAction.mobileLabel}</span>
                </Link>
              )}
            </div>
          </header>

          <main className="flex w-full flex-1 flex-col overflow-y-auto px-3 pb-3 pt-3 text-slate-700 md:px-5 md:pb-5 md:pt-5">
            <div className="flex-grow">{children}</div>
          </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
