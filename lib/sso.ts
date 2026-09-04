import { createHash, randomBytes } from 'crypto';
import { SignJWT, createRemoteJWKSet, jwtVerify } from 'jose';

const ISSUER = 'https://sso.plkhealth.go.th';
const AUTHORIZE_URL = `${ISSUER}/oauth/authorize`;
const TOKEN_URL = `${ISSUER}/oauth/token`;
const USERINFO_URL = `${ISSUER}/oauth/userinfo`;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

const TICKET_ISSUER = 'carbooking';
const TICKET_AUDIENCE = 'plk-sso-ticket';

export const SSO_SCOPE = 'openid profile email organization';
export const SSO_STATE_COOKIE = 'plk_sso_state';
export const SSO_VERIFIER_COOKIE = 'plk_sso_verifier';
export const SSO_NONCE_COOKIE = 'plk_sso_nonce';
export const SSO_RETURN_COOKIE = 'plk_sso_return';

export type SsoClaims = {
  sub: string;
  name: string | null;
  email: string | null;
  position: string | null;
  providerId: string | null;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

export function getSsoClientId() {
  return requireEnv('SSO_CLIENT_ID');
}

export function getSsoRedirectUri() {
  return requireEnv('SSO_REDIRECT_URI');
}

function getTicketSecret() {
  return new TextEncoder().encode(requireEnv('AUTH_SECRET'));
}

function base64Url(buffer: Buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function createPkcePair() {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function createRandomToken() {
  return base64Url(randomBytes(32));
}

export function buildAuthorizeUrl(params: { state: string; nonce: string; challenge: string }) {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', getSsoClientId());
  url.searchParams.set('redirect_uri', getSsoRedirectUri());
  url.searchParams.set('scope', SSO_SCOPE);
  url.searchParams.set('state', params.state);
  url.searchParams.set('nonce', params.nonce);
  url.searchParams.set('code_challenge', params.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

type TokenResponse = {
  access_token?: string;
  id_token?: string;
  token_type?: string;
};

export async function exchangeCode(code: string, verifier: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getSsoRedirectUri(),
    code_verifier: verifier,
    client_id: getSsoClientId(),
    client_secret: requireEnv('SSO_CLIENT_SECRET'),
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`SSO token request failed (${response.status}): ${await response.text()}`);
  }

  return response.json() as Promise<TokenResponse>;
}

export async function verifyIdToken(idToken: string, nonce: string) {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ISSUER,
    audience: getSsoClientId(),
  });

  if (payload.nonce !== nonce) {
    throw new Error('SSO id_token nonce mismatch');
  }

  return payload;
}

export async function fetchUserInfo(accessToken: string) {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`SSO userinfo request failed (${response.status})`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function toSsoClaims(source: Record<string, unknown>): SsoClaims | null {
  const sub = readString(source, 'sub');
  if (!sub) {
    return null;
  }

  return {
    sub,
    name: readString(source, 'name'),
    email: readString(source, 'email'),
    position: readString(source, 'position'),
    providerId: readString(source, 'provider_id'),
  };
}

/**
 * The SSO callback runs server-side, but NextAuth's credentials endpoint is
 * publicly reachable. The ticket is a short-lived signed envelope so only
 * claims this server already verified can create a session.
 */
export async function createSsoTicket(claims: SsoClaims) {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(TICKET_ISSUER)
    .setAudience(TICKET_AUDIENCE)
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime('2m')
    .sign(getTicketSecret());
}

export async function verifySsoTicket(ticket: string): Promise<SsoClaims | null> {
  try {
    const { payload } = await jwtVerify(ticket, getTicketSecret(), {
      issuer: TICKET_ISSUER,
      audience: TICKET_AUDIENCE,
    });

    const source = payload as Record<string, unknown>;
    const sub = readString(source, 'sub');
    if (!sub) {
      return null;
    }

    return {
      sub,
      name: readString(source, 'name'),
      email: readString(source, 'email'),
      position: readString(source, 'position'),
      providerId: readString(source, 'providerId'),
    };
  } catch {
    return null;
  }
}
