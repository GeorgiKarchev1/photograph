import busboy from 'busboy';
import { requireAuth } from './_auth.js';
import { getManifest, saveManifest, uploadImage } from './_cloudinary.js';

const VALID    = new Set(['wedding', 'baptism', 'birthday', 'business']);
const MIME_EXT = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireAuth(req))     return res.status(401).json({ error: 'Unauthorized' });

  const category = new URL(req.url, 'http://x').searchParams.get('category');
  if (!VALID.has(category)) return res.status(400).json({ error: 'Невалидна категория.' });

  const bb      = busboy({ headers: req.headers, limits: { files: 20, fileSize: 20 * 1024 * 1024 } });
  const pending = [];

  bb.on('file', (_field, stream, info) => {
    const chunks = [];
    stream.on('data', d => chunks.push(d));
    stream.on('close', () => pending.push({ info, buffer: Buffer.concat(chunks) }));
  });

  bb.on('close', async () => {
    const uploaded = [];
    const errors   = [];

    for (const { info, buffer } of pending) {
      try {
        const ext      = MIME_EXT[info.mimeType] || 'jpg';
        const safeName = (info.filename || 'photo')
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .replace(/\.[^.]+$/, '');
        const filename = `${safeName}_${Date.now()}.${ext}`;

        const url = await uploadImage(buffer, info.mimeType, category, filename);
        uploaded.push(url);
      } catch (err) {
        errors.push({ file: info.filename, error: err.message });
      }
    }

    if (uploaded.length > 0) {
      const manifest = await getManifest(req);
      if (!manifest[category]) manifest[category] = [];
      manifest[category].push(...uploaded);
      await saveManifest(manifest);
    }

    res.json({ uploaded, errors });
  });

  bb.on('error', err => res.status(500).json({ error: err.message }));
  req.pipe(bb);
}
