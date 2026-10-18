import { betterAuth } from 'better-auth';
import { pool } from './db.js';

export const baseURL = process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` :
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.V0_RUNTIME_URL);
export const trustedOrigins = [
  ...(baseURL ? [baseURL] : []),
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:3000',
    'https://sb-1re6kp7h0zs2.vercel.run',
    ...[process.env.V0_RUNTIME_URL, process.env.V0_DEV_APP_URL, process.env.V0_BUILD_URL, process.env.V0_SANDBOX_URL].filter((v): v is string => Boolean(v)),
  ] : []),
  ...(process.env.NODE_ENV === 'production' ? [
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
  ] : []),
];
if (process.env.NODE_ENV === 'production' && (process.env.BETTER_AUTH_SECRET?.length ?? 0) < 32) {
  throw new Error('BETTER_AUTH_SECRET must contain at least 32 random characters before deploying authentication.');
}
export const auth = betterAuth({
  database: pool, baseURL, trustedOrigins,
  emailAndPassword: { enabled: true, autoSignIn: true },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  ...(process.env.NODE_ENV === 'development' ? { advanced: {
    // The v0 editor runs in a cross-site iframe, which requires secure SameSite=None cookies.
    defaultCookieAttributes: { sameSite: 'none' as const, secure: true },
  } } : {}),
});
