import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const { pathname, search } = req.nextUrl;

  const publicPaths = new Set(['/', '/login', '/bookings', '/bookings/add', '/cars', '/report']);
  const isPublicPath = publicPaths.has(pathname);
  const isOnLoginPage = pathname === '/login';

  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL('/login', req.url);
    const callbackUrl = `${pathname}${search}`;
    loginUrl.searchParams.set('callbackUrl', callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isOnLoginPage) {
    return NextResponse.redirect(new URL('/bookings', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|app-logo.png).*)'],
};
