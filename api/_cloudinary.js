import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

export { cloudinary };

// The manifest is stored as a raw JSON file in Cloudinary
const MANIFEST_ID = 'yordan-manifest.json';

export async function getManifest(req) {
  // 1. Try Cloudinary raw storage
  try {
    const url = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/${MANIFEST_ID}?t=${Date.now()}`;
    const r = await fetch(url);
    if (r.ok) return await r.json();
  } catch (_) {}

  // 2. Fall back to static file bundled with the site (first run)
  try {
    const host  = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const r = await fetch(`${proto}://${host}/gallery/manifest.json`);
    if (r.ok) {
      const m = await r.json();
      await saveManifest(m).catch(() => {});
      return m;
    }
  } catch (_) {}

  return { wedding: [], baptism: [], birthday: [], business: [] };
}

export async function saveManifest(manifest) {
  const json    = JSON.stringify(manifest);
  const dataUri = `data:application/json;base64,${Buffer.from(json).toString('base64')}`;
  await cloudinary.uploader.upload(dataUri, {
    public_id:    MANIFEST_ID,
    resource_type: 'raw',
    overwrite:    true,
    invalidate:   true,
  });
}

// Upload an image buffer to Cloudinary, return the secure URL
export function uploadImage(buffer, mimeType, category, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        `gallery/${category}`,
        public_id:     filename,
        resource_type: 'image',
        overwrite:     false,
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

// Delete an image from Cloudinary by its secure_url
export async function deleteImage(secureUrl) {
  const publicId = extractPublicId(secureUrl);
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

function extractPublicId(url) {
  // https://res.cloudinary.com/{cloud}/image/upload/v123/gallery/wedding/file.jpg
  const m = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
  return m ? m[1] : null;
}
