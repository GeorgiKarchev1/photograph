import { createHmac, timingSafeEqual } from 'crypto';

const SECRET   = process.env.ADMIN_SECRET   || 'dev-secret-please-change-in-vercel';
const PASSWORD = process.env.ADMIN_PASSWORD || 'yordan2024';

export function checkPassword(pwd) {
  return typeof pwd === 'string' && pwd === PASSWORD;
}

export function createToken() {
  const ts  = Date.now().toString(36);
  const sig = createHmac('sha256', SECRET).update(ts).digest('base64url');
  return `${ts}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;
  const ts       = token.slice(0, dot);
  const sig      = token.slice(dot + 1);
  const expected = createHmac('sha256', SECRET).update(ts).digest('base64url');
  try {
    const a = Buffer.from(sig,      'ascii');
    const b = Buffer.from(expected, 'ascii');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch { return false; }
}

export function parseCookies(req) {
  const out = {};
  (req.headers?.cookie || '').split(';').forEach(c => {
    const i = c.indexOf('=');
    if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}

export function requireAuth(req) {
  const { admin_token } = parseCookies(req);
  if (verifyToken(admin_token || '')) return true;
  const header = req.headers['x-admin-token'] || '';
  return verifyToken(header);
}
