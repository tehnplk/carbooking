import { createHash, randomBytes } from 'crypto';
import { SignJWT, createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * PLKHealth SSO — OAuth 2.0 authorization code + PKCE + OpenID Connect.
 * Contract: https://sso.plkhealth.go.th/llm.txt
 *
 * Nothing here touches the database or NextAuth, so the whole exchange can be
 * reasoned about on its own: browser round trip in, verified identity out.
 */

const ISSUER = (process.env.SSO_ISSUER || 'https://sso.plkhealth.go.th').replace(/\/$/, '');

export const SSO_SCOPE = 'openid profile email organization';
/** One signed cookie carries the whole login attempt instead of four loose ones. */
export const SSO_TX_COOKIE = 'plk_sso_tx';
export const SSO_TX_MAX_AGE = 10 * 60;

const TICKET_ISSUER = 'carbooking';
const TICKET_AUDIENCE = 'plk-sso-ticket';
const TX_AUDIENCE = 'plk-sso-tx';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function getSsoClientId() {
  return requireEnv('SSO_CLIENT_ID');
}

export function getSsoRedirectUri() {
  return requireEnv('SSO_REDIRECT_URI');
}

function secretKey() {
  return new TextEncoder().encode(requireEnv('AUTH_SECRET'));
}

function basicAuth() {
  const raw = `${getSsoClientId()}:${requireEnv('SSO_CLIENT_SECRET')}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

function base64Url(buffer: Buffer) {
  return buffer.toString('base64url');
}

/* ------------------------------------------------------------------ discovery */

type Discovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  revocation_endpoint?: string;
  jwks_uri: string;
};

// The guide is explicit that endpoints come from discovery rather than
// constants, so a path change on the SSO side needs no release here. Cached for
// the life of the process; a restart picks up a change.
let discovery: Promise<Discovery> | null = null;

export function discover(): Promise<Discovery> {
  discovery ??= fetch(`${ISSUER}/.well-known/openid-configuration`, { cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) throw new Error(`SSO discovery failed (${response.status})`);
      return (await response.json()) as Discovery;
    })
    .catch((error) => {
      discovery = null; // never cache a failure, or the app stays broken until restart
      throw error;
    });
  return discovery;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

async function getJwks() {
  const { jwks_uri } = await discover();
  // createRemoteJWKSet caches keys and refetches on an unknown kid, which is
  // exactly the rotation behaviour the guide asks for.
  jwks ??= createRemoteJWKSet(new URL(jwks_uri));
  return jwks;
}

/* ---------------------------------------------------------------- login start */

export type SsoTransaction = {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
};

/**
 * Signed rather than plain: the callback trusts returnTo enough to redirect to
 * it and nonce enough to accept an id_token, so neither may be editable in the
 * browser.
 */
export async function createTransaction(returnTo: string) {
  const tx: SsoTransaction = {
    state: base64Url(randomBytes(32)),
    nonce: base64Url(randomBytes(32)),
    verifier: base64Url(randomBytes(32)),
    returnTo,
  };

  const cookie = await new SignJWT({ ...tx })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(TICKET_ISSUER)
    .setAudience(TX_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SSO_TX_MAX_AGE}s`)
    .sign(secretKey());

  return { tx, cookie };
}

export async function readTransaction(cookie: string | undefined): Promise<SsoTransaction | null> {
  if (!cookie) return null;
  try {
    const { payload } = await jwtVerify(cookie, secretKey(), {
      issuer: TICKET_ISSUER,
      audience: TX_AUDIENCE,
    });
    const { state, nonce, verifier, returnTo } = payload as Record<string, unknown>;
    if (typeof state !== 'string' || typeof nonce !== 'string' || typeof verifier !== 'string') {
      return null;
    }
    return {
      state,
      nonce,
      verifier,
      returnTo: typeof returnTo === 'string' ? returnTo : '/bookings/add',
    };
  } catch {
    return null;
  }
}

export async function buildAuthorizeUrl(tx: SsoTransaction) {
  const { authorization_endpoint } = await discover();
  const challenge = base64Url(createHash('sha256').update(tx.verifier).digest());

  const url = new URL(authorization_endpoint);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: getSsoClientId(),
    redirect_uri: getSsoRedirectUri(),
    scope: SSO_SCOPE,
    state: tx.state,
    nonce: tx.nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();
  return url.toString();
}

/* ------------------------------------------------------------------- identity */

export type SsoIdentity = {
  sub: string;
  /** Composed here: the SSO sends the name in three parts and has no full-name claim. */
  name: string | null;
  email: string | null;
  position: string | null;
  orgCode: string | null;
  orgName: string | null;
  accessToken: string;
  /** Epoch ms. Past this point the session can no longer be re-verified. */
  accessTokenExpiresAt: number;
};

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** Thai convention: the prename runs into the first name, then a space before the surname. */
function composeName(source: Record<string, unknown>) {
  const prename = readString(source, 'prename') ?? '';
  const fname = readString(source, 'fname') ?? '';
  const lname = readString(source, 'lname') ?? '';
  return `${prename}${fname} ${lname}`.trim() || null;
}

export function identityFromClaims(
  source: Record<string, unknown>,
  accessToken: string,
  accessTokenExpiresAt: number
): SsoIdentity | null {
  const sub = readString(source, 'sub');
  if (!sub) return null;

  return {
    sub,
    name: composeName(source),
    email: readString(source, 'email'),
    position: readString(source, 'job_position'),
    orgCode: readString(source, 'org_code'),
    orgName: readString(source, 'org_name'),
    accessToken,
    accessTokenExpiresAt,
  };
}

/**
 * Redeems the code, verifies the id_token against JWKS, then reads userinfo.
 * The two are merged with userinfo last, because it is the one the SSO
 * re-evaluates at call time.
 */
export async function completeLogin(code: string, tx: SsoTransaction): Promise<SsoIdentity> {
  const { token_endpoint, issuer } = await discover();

  const response = await fetch(token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // client_secret_basic. Sending a second method alongside it is rejected,
      // so client_secret must stay out of the body.
      Authorization: basicAuth(),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getSsoRedirectUri(),
      code_verifier: tx.verifier,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `SSO token request failed (${response.status}): ${(await response.text()).slice(0, 200)}`
    );
  }

  const tokens = (await response.json()) as {
    access_token?: string;
    id_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!tokens.access_token) throw new Error('SSO returned no access_token');
  const grantedScopes = new Set((tokens.scope ?? '').split(/\s+/));
  if (grantedScopes.has('openid') && !tokens.id_token) {
    throw new Error('SSO granted openid without an id_token');
  }

  let claims: Record<string, unknown> = {};
  if (tokens.id_token) {
    const { payload } = await jwtVerify(tokens.id_token, await getJwks(), {
      issuer,
      audience: getSsoClientId(),
    });
    if (payload.nonce !== tx.nonce) throw new Error('SSO id_token nonce mismatch');
    claims = payload as Record<string, unknown>;
  }

  const profile = await fetchUserInfo(tokens.access_token);
  if (!profile) throw new Error('SSO userinfo rejected a token it had just issued');
  if (tokens.id_token && claims.sub !== profile.sub) {
    throw new Error('SSO userinfo subject does not match id_token');
  }

  // Trim a minute so this app stops trusting the token slightly before the SSO does.
  const expiresAt = Date.now() + Math.max(0, (tokens.expires_in ?? 3600) - 60) * 1000;
  const identity = identityFromClaims({ ...claims, ...profile }, tokens.access_token, expiresAt);
  if (!identity) throw new Error('SSO returned no sub');
  return identity;
}

/**
 * Returns null when the SSO refuses the token — suspended account, withdrawn
 * app permission, disabled client, forced logout. `null` is a verdict; a
 * network failure throws instead, so an outage cannot log everyone out.
 */
export async function fetchUserInfo(accessToken: string): Promise<Record<string, unknown> | null> {
  const { userinfo_endpoint } = await discover();
  const response = await fetch(userinfo_endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`SSO userinfo failed (${response.status})`);
  return (await response.json()) as Record<string, unknown>;
}

/** Best effort: signing out of this app must not fail because the SSO is busy. */
export async function revokeAccessToken(accessToken: string) {
  try {
    const { revocation_endpoint } = await discover();
    if (!revocation_endpoint) return;
    await fetch(revocation_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: basicAuth() },
      body: new URLSearchParams({ token: accessToken }),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('SSO token revocation failed:', error);
  }
}

/* --------------------------------------------------------------------- ticket */

/**
 * The callback runs on the server, but NextAuth's credentials endpoint is
 * publicly reachable. The ticket is a two-minute signed envelope, so only an
 * identity this server has already verified can open a session.
 */
export async function createSsoTicket(identity: SsoIdentity) {
  return new SignJWT({ ...identity })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(TICKET_ISSUER)
    .setAudience(TICKET_AUDIENCE)
    .setSubject(identity.sub)
    .setIssuedAt()
    .setExpirationTime('2m')
    .sign(secretKey());
}

export async function verifySsoTicket(ticket: string): Promise<SsoIdentity | null> {
  try {
    const { payload } = await jwtVerify(ticket, secretKey(), {
      issuer: TICKET_ISSUER,
      audience: TICKET_AUDIENCE,
    });

    const source = payload as Record<string, unknown>;
    const accessToken = readString(source, 'accessToken');
    if (!accessToken) return null;

    const identity = identityFromClaims(source, accessToken, 0);
    if (!identity) return null;

    return {
      ...identity,
      // identityFromClaims reads OIDC claim names; the ticket already carries
      // this app's own field names, so take them back verbatim.
      name: readString(source, 'name'),
      position: readString(source, 'position'),
      orgCode: readString(source, 'orgCode'),
      orgName: readString(source, 'orgName'),
      accessTokenExpiresAt:
        typeof source.accessTokenExpiresAt === 'number' ? source.accessTokenExpiresAt : 0,
    };
  } catch {
    return null;
  }
}
