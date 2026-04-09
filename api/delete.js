import { requireAuth } from './_auth.js';
import { getManifest, saveManifest, deleteImage } from './_cloudinary.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  if (!requireAuth(req))       return res.status(401).json({ error: 'Unauthorized' });

  let raw = '';
  for await (const chunk of req) raw += chunk;

  let category, imageId;
  try { ({ category, imageId } = JSON.parse(raw)); }
  catch { return res.status(400).json({ error: 'Невалидни данни.' }); }

  if (!category || !imageId) return res.status(400).json({ error: 'Липсват параметри.' });

  // Delete from Cloudinary only if it's a Cloudinary URL (new upload)
  if (imageId.startsWith('https://res.cloudinary.com/')) {
    try { await deleteImage(imageId); } catch (_) {}
  }
  // Static filenames (original portfolio images) are just removed from manifest

  const manifest = await getManifest(req);
  if (manifest[category]) {
    manifest[category] = manifest[category].filter(id => id !== imageId);
  }
  await saveManifest(manifest);

  res.json({ success: true });
}
