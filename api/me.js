import { requireAuth } from './_auth.js';

export default function handler(req, res) {
  res.json({ loggedIn: requireAuth(req) });
}
