import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { signIn } from '@/auth';
import {
  SSO_NONCE_COOKIE,
  SSO_RETURN_COOKIE,
  SSO_STATE_COOKIE,
  SSO_VERIFIER_COOKIE,
  createSsoTicket,
  exchangeCode,
  fetchUserInfo,
  toSsoClaims,
  verifyIdToken,
} from '@/lib/sso';

export const dynamic = 'force-dynamic';

function failure(reason: string) {
  return NextResponse.redirect(
    new URL(`/bookings/add?sso_error=${encodeURIComponent(reason)}`, process.env.AUTH_URL || 'http://localhost:3000')
  );
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const params = request.nextUrl.searchParams;

  const state = cookieStore.get(SSO_STATE_COOKIE)?.value;
  const nonce = cookieStore.get(SSO_NONCE_COOKIE)?.value;
  const verifier = cookieStore.get(SSO_VERIFIER_COOKIE)?.value;
  const returnTo = cookieStore.get(SSO_RETURN_COOKIE)?.value || '/bookings/add';

  for (const name of [SSO_STATE_COOKIE, SSO_NONCE_COOKIE, SSO_VERIFIER_COOKIE, SSO_RETURN_COOKIE]) {
    cookieStore.delete(name);
  }

  if (params.get('error')) {
    return failure(params.get('error') as string);
  }

  const code = params.get('code');
  if (!code || !state || !nonce || !verifier || params.get('state') !== state) {
    return failure('invalid_request');
  }

  let ticket: string;
  try {
    const tokens = await exchangeCode(code, verifier);
    if (!tokens.id_token) {
      return failure('missing_id_token');
    }

    const idTokenClaims = await verifyIdToken(tokens.id_token, nonce);
    const userInfo = tokens.access_token ? await fetchUserInfo(tokens.access_token) : {};
    const claims = toSsoClaims({ ...idTokenClaims, ...userInfo });
    if (!claims) {
      return failure('invalid_profile');
    }

    ticket = await createSsoTicket(claims);
  } catch (error) {
    console.error('SSO callback failed:', error);
    return failure('sso_failed');
  }

  return signIn('plk-sso', { ticket, redirectTo: returnTo });
}
