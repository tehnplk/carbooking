import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { queryWithEncoding } from '@/lib/db';
import { verifySsoTicket } from '@/lib/sso';

// SSO sessions are capped at 3 days from login. The JWT is re-signed with the
// global maxAge on every read, so the cutoff has to be an absolute timestamp
// stamped at sign-in rather than a rolling expiry.
const SSO_SESSION_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
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

        const claims = await verifySsoTicket(ticket);
        if (!claims) {
          return null;
        }

        return {
          id: `sso:${claims.sub}`,
          name: claims.name,
          username: claims.providerId,
          position: claims.position,
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

        if (user.id?.startsWith(SSO_USER_ID_PREFIX)) {
          token.ssoExpiresAt = Date.now() + SSO_SESSION_MAX_AGE_MS;
        }
      }

      // Returning null clears the session cookie. Tokens issued before the cap
      // existed have no ssoExpiresAt, so they are retired on next use.
      const isSsoToken = String(token.sub ?? '').startsWith(SSO_USER_ID_PREFIX);
      if (isSsoToken && (typeof token.ssoExpiresAt !== 'number' || Date.now() >= token.ssoExpiresAt)) {
        return null;
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
      }

      if (typeof token.ssoExpiresAt === 'number') {
        // next-auth types `expires` as `Date & string`; only the ISO string is used.
        (session as unknown as { expires: string }).expires = new Date(token.ssoExpiresAt).toISOString();
      }

      return session;
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
