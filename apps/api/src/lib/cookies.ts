export const ACCESS_COOKIE = 'hmm_access';
export const REFRESH_COOKIE = 'hmm_refresh';

export function cookieSecure() {
  return (
    process.env.COOKIE_SECURE === 'true' ||
    process.env.NODE_ENV === 'production'
  );
}

/** Cookie options for Express `res.cookie` (maxAge is milliseconds). */
export function accessCookieOptions(
  maxAgeSeconds = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.max(0, maxAgeSeconds) * 1000,
  };
}

export function refreshCookieOptions(
  maxAgeSeconds = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000),
) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.max(0, maxAgeSeconds) * 1000,
  };
}
