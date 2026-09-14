import { NextResponse, type NextRequest } from 'next/server';
import { SSO_TX_COOKIE, SSO_TX_MAX_AGE, buildAuthorizeUrl, createTransaction } from '@/lib/sso';

export const dynamic = 'force-dynamic';

const DEFAULT_RETURN = '/bookings/add';

/** Only same-origin paths, so the return value cannot become an open redirect. */
function safeReturnTo(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : DEFAULT_RETURN;
}

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get('callbackUrl'));
  const { tx, cookie } = await createTransaction(returnTo);

  let authorizeUrl: string;
  try {
    authorizeUrl = await buildAuthorizeUrl(tx);
  } catch (error) {
    // Discovery is the only network call before the redirect. If the SSO is
    // unreachable, say so here rather than sending the user to a dead URL.
    const baseUrl = process.env.AUTH_URL || request.nextUrl.origin;
    return NextResponse.redirect(
      new URL(`${DEFAULT_RETURN}?sso_error=sso_unreachable`, baseUrl)
    );
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(SSO_TX_COOKIE, cookie, {
    httpOnly: true,
    // lax, not strict: the cookie has to survive the redirect back from the SSO.
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: SSO_TX_MAX_AGE,
  });
  return response;
}
