import { checkPassword, createToken } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let raw = '';
  for await (const chunk of req) raw += chunk;

  let password;
  try { ({ password } = JSON.parse(raw)); } catch { return res.status(400).end(); }

  if (checkPassword(password)) {
    const token = createToken();
    res.setHeader(
      'Set-Cookie',
      `admin_token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`
    );
    return res.json({ success: true });
  }

  res.status(401).json({ error: 'Грешна парола. Опитайте отново.' });
}
