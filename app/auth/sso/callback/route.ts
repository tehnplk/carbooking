import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { signIn } from '@/auth';
import { SSO_TX_COOKIE, completeLogin, createSsoTicket, readTransaction } from '@/lib/sso';

export const dynamic = 'force-dynamic';

const DEFAULT_RETURN = '/bookings/add';

function failure(request: NextRequest, reason: string) {
  return NextResponse.redirect(
    new URL(`${DEFAULT_RETURN}?sso_error=${encodeURIComponent(reason)}`, request.url)
  );
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const jar = await cookies();

  const tx = await readTransaction(jar.get(SSO_TX_COOKIE)?.value);
  // One attempt per cookie, whatever the outcome, so a code cannot be replayed
  // against a transaction that is still sitting in the browser.
  jar.delete(SSO_TX_COOKIE);

  // The SSO reports a refusal here rather than throwing; access_denied covers
  // both "user declined" and "no permission for this app".
  const error = params.get('error');
  if (error) return failure(request, error);

  const code = params.get('code');
  if (!tx || !code || params.get('state') !== tx.state) {
    return failure(request, 'invalid_request');
  }

  let ticket: string;
  try {
    ticket = await createSsoTicket(await completeLogin(code, tx));
  } catch (cause) {
    console.error('SSO callback failed:', cause);
    return failure(request, 'sso_failed');
  }

  // signIn throws a redirect, so anything after this line does not run.
  return signIn('plk-sso', { ticket, redirectTo: tx.returnTo });
}
