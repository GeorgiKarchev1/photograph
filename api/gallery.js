import { getManifest } from './_cloudinary.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const manifest = await getManifest(req);
    res.json(manifest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
