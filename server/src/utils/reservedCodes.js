export const RESERVED_CODES = new Set([
  'api',
  'health',
  's',
  'admin',
  'favicon.ico',
  'robots.txt',
  'static',
  'assets',
  'login',
  'logout',
  'signup',
  'dashboard',
  'www',
  'null',
  'undefined',
]);

export function isReservedCode(code) {
  if (!code || typeof code !== 'string') return false;
  return RESERVED_CODES.has(code.trim().toLowerCase());
}
