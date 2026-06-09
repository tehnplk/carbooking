import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { queryWithEncoding } from '@/lib/db';

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
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? '');
        session.user.username = typeof token.username === 'string' ? token.username : null;
        session.user.roleId = typeof token.roleId === 'number' ? token.roleId : null;
        session.user.roleName = typeof token.roleName === 'string' ? token.roleName : null;
      }

      return session;
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
