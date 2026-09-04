import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string | null;
      roleId: number | null;
      roleName: string | null;
      position: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    username: string | null;
    roleId: number | null;
    roleName: string | null;
    position?: string | null;
    ssoExpiresAt?: number | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username?: string | null;
    roleId?: number | null;
    roleName?: string | null;
    position?: string | null;
    ssoExpiresAt?: number | null;
  }
}
