import { NextResponse, type NextRequest } from 'next/server';
import {
  SSO_NONCE_COOKIE,
  SSO_RETURN_COOKIE,
  SSO_STATE_COOKIE,
  SSO_VERIFIER_COOKIE,
  buildAuthorizeUrl,
  createPkcePair,
  createRandomToken,
} from '@/lib/sso';

export const dynamic = 'force-dynamic';

const COOKIE_MAX_AGE = 10 * 60;

export async function GET(request: NextRequest) {
  const requestedReturn = request.nextUrl.searchParams.get('callbackUrl');
  const returnTo = requestedReturn && requestedReturn.startsWith('/') && !requestedReturn.startsWith('//')
    ? requestedReturn
    : '/bookings/add';

  const state = createRandomToken();
  const nonce = createRandomToken();
  const { verifier, challenge } = createPkcePair();

  const response = NextResponse.redirect(buildAuthorizeUrl({ state, nonce, challenge }));
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };

  response.cookies.set(SSO_STATE_COOKIE, state, options);
  response.cookies.set(SSO_NONCE_COOKIE, nonce, options);
  response.cookies.set(SSO_VERIFIER_COOKIE, verifier, options);
  response.cookies.set(SSO_RETURN_COOKIE, returnTo, options);

  return response;
}
