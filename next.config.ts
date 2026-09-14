import type { NextConfig } from "next";

if (process.env.AUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.AUTH_URL;
  process.env.SSO_REDIRECT_URI = new URL("/auth/sso/callback", process.env.AUTH_URL).toString();
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
