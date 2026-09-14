import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string | null;
      roleId: number | null;
      roleName: string | null;
      position: string | null;
      orgCode: string | null;
      orgName: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    username: string | null;
    roleId: number | null;
    roleName: string | null;
    position?: string | null;
    orgCode?: string | null;
    orgName?: string | null;
    /** SSO only: kept so the session can be re-checked and revoked on sign-out. */
    ssoAccessToken?: string | null;
    ssoTokenExpiresAt?: number | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username?: string | null;
    roleId?: number | null;
    roleName?: string | null;
    position?: string | null;
    orgCode?: string | null;
    orgName?: string | null;
    /** Absolute cap on the SSO session, stamped at sign-in. */
    ssoExpiresAt?: number | null;
    ssoAccessToken?: string | null;
    ssoTokenExpiresAt?: number | null;
    /** Last successful userinfo re-check, to keep within the rate limit. */
    ssoCheckedAt?: number | null;
  }
}
