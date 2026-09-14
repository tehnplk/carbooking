import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { queryWithEncoding } from '@/lib/db';
import { fetchUserInfo, revokeAccessToken, verifySsoTicket } from '@/lib/sso';

// Capped at 8 hours to match the SSO's own session, so a user who has to sign
// in again is one consent click away rather than a full login. The JWT is
// re-signed with the global maxAge on every read, so the cutoff has to be an
// absolute timestamp stamped at sign-in rather than a rolling expiry.
const SSO_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
// While the access token lives, ask the SSO whether this account is still
// allowed. The guide is blunt about it: an id_token cannot report a suspension
// that happened after it was signed, and only userinfo re-checks. There is no
// refresh token, so an expired access token requires a new SSO sign-in.
const SSO_REVALIDATE_EVERY_MS = 5 * 60 * 1000;
const SSO_USER_ID_PREFIX = 'sso:';
// SSO users have no row in `users`, so they all get user_role 3 (ผู้ขอใช้รถ)
const SSO_ROLE_ID = 3;

type DbUser = {
  id: number;
  username: string;
  password: string;
  fullname: string | null;
  role_id: number | null;
  role_name: string | null;
};

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$.{53}$/.test(value);
}

async function verifyPassword(inputPassword: string, storedPassword: string) {
  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(inputPassword, storedPassword);
  }

  return inputPassword === storedPassword;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      id: 'plk-sso',
      name: 'MOPH ID (PLKHealth SSO)',
      credentials: {
        ticket: { label: 'Ticket', type: 'text' },
      },
      authorize: async (credentials) => {
        const ticket = typeof credentials?.ticket === 'string' ? credentials.ticket : '';
        if (!ticket) {
          return null;
        }

        const identity = await verifySsoTicket(ticket);
        if (!identity) {
          return null;
        }

        return {
          id: `${SSO_USER_ID_PREFIX}${identity.sub}`,
          name: identity.name,
          // The SSO issues no provider_id claim; leaving this null makes display
          // names and audit actors fall back to the person's name.
          username: null,
          position: identity.position,
          orgCode: identity.orgCode,
          orgName: identity.orgName,
          ssoAccessToken: identity.accessToken,
          ssoTokenExpiresAt: identity.accessTokenExpiresAt,
          roleId: SSO_ROLE_ID,
          roleName: null,
        };
      },
    }),
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const username = typeof credentials?.username === 'string' ? credentials.username.trim() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';

        if (!username || !password) {
          return null;
        }

        const users = await queryWithEncoding(
          `SELECT u.id, u.username, u.password, u.fullname, u.role_id, ur.name AS role_name
           FROM users u
           LEFT JOIN user_role ur ON ur.id = u.role_id
           WHERE u.username = $1
           LIMIT 1`,
          [username]
        ) as DbUser[];

        const user = users[0];
        if (!user) {
          return null;
        }

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.fullname || user.username,
          username: user.username,
          roleId: user.role_id,
          roleName: user.role_name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.position = user.position ?? null;
        token.orgCode = user.orgCode ?? null;
        token.orgName = user.orgName ?? null;

        if (user.id?.startsWith(SSO_USER_ID_PREFIX)) {
          token.ssoExpiresAt = Math.min(
            Date.now() + SSO_SESSION_MAX_AGE_MS,
            user.ssoTokenExpiresAt ?? 0
          );
          token.ssoAccessToken = user.ssoAccessToken ?? null;
          token.ssoTokenExpiresAt = user.ssoTokenExpiresAt ?? null;
          token.ssoCheckedAt = Date.now();
        }
      }

      // Returning null clears the session cookie. Tokens issued before the cap
      // existed have no ssoExpiresAt, so they are retired on next use.
      const isSsoToken = String(token.sub ?? '').startsWith(SSO_USER_ID_PREFIX);
      if (!isSsoToken) {
        return token;
      }
      if (typeof token.ssoExpiresAt !== 'number' || Date.now() >= token.ssoExpiresAt) {
        return null;
      }

      const due =
        typeof token.ssoCheckedAt !== 'number' ||
        Date.now() - token.ssoCheckedAt >= SSO_REVALIDATE_EVERY_MS;
      const usable =
        typeof token.ssoAccessToken === 'string' &&
        typeof token.ssoTokenExpiresAt === 'number' &&
        Date.now() < token.ssoTokenExpiresAt;

      if (!usable) return null;

      if (due) {
        try {
          const profile = await fetchUserInfo(token.ssoAccessToken as string);
          // null is the SSO's verdict that this account may no longer be here.
          if (!profile || `${SSO_USER_ID_PREFIX}${profile.sub}` !== token.sub) {
            return null;
          }
          token.ssoCheckedAt = Date.now();
          // Free refresh: a transfer or a job title change lands on the next check.
          token.position = typeof profile.job_position === 'string' ? profile.job_position : null;
          token.orgCode = typeof profile.org_code === 'string' ? profile.org_code : null;
          token.orgName = typeof profile.org_name === 'string' ? profile.org_name : null;
        } catch (error) {
          // A network blip is not a verdict — keep the session and try later.
          console.error('SSO revalidation failed, keeping session:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? '');
        session.user.username = typeof token.username === 'string' ? token.username : null;
        session.user.roleId = typeof token.roleId === 'number' ? token.roleId : null;
        session.user.roleName = typeof token.roleName === 'string' ? token.roleName : null;
        session.user.position = typeof token.position === 'string' ? token.position : null;
        session.user.orgCode = typeof token.orgCode === 'string' ? token.orgCode : null;
        session.user.orgName = typeof token.orgName === 'string' ? token.orgName : null;
      }

      if (typeof token.ssoExpiresAt === 'number') {
        // next-auth types `expires` as `Date & string`; only the ISO string is used.
        (session as unknown as { expires: string }).expires = new Date(token.ssoExpiresAt).toISOString();
      }

      return session;
    },
  },
  events: {
    // Signing out here should also end the token's usefulness at the SSO,
    // rather than leaving it valid for the rest of its hour.
    async signOut(message) {
      const token = 'token' in message ? message.token : null;
      if (typeof token?.ssoAccessToken === 'string') {
        await revokeAccessToken(token.ssoAccessToken);
      }
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
