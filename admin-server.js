import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ╔══════════════════════════════════════════════╗
// ║  СМЕНЕТЕ ПАРОЛАТА ТУК ПРЕДИ ИЗПОЛЗВАНЕ!      ║
// ║  Намерете тази секция и сложете своя парола. ║
// ╚══════════════════════════════════════════════╝
const ADMIN_PASSWORD = 'yordan2024';

const MANIFEST_PATH  = join(__dirname, 'public/gallery/manifest.json');
const GALLERY_PATH   = join(__dirname, 'public/gallery');
const PORT           = 4000;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── In-memory sessions ──────────────────────────────────────────────────────
const sessions = new Map();

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, v] = c.trim().split('=');
    if (k) out[k] = decodeURIComponent(v || '');
  });
  return out;
}

function requireAuth(req, res, next) {
  const { admin_session } = parseCookies(req);
  if (admin_session && sessions.has(admin_session)) return next();
  res.status(401).json({ error: 'Не сте влезли в системата.' });
}

// ── Auth endpoints ──────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    const id = crypto.randomBytes(32).toString('hex');
    sessions.set(id, { at: Date.now() });
    res.setHeader('Set-Cookie', `admin_session=${id}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Грешна парола. Опитайте отново.' });
});

app.post('/api/logout', (req, res) => {
  const { admin_session } = parseCookies(req);
  if (admin_session) sessions.delete(admin_session);
  res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; Path=/; Max-Age=0');
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  const { admin_session } = parseCookies(req);
  res.json({ loggedIn: !!(admin_session && sessions.has(admin_session)) });
});

// ── Gallery read ────────────────────────────────────────────────────────────
app.get('/api/gallery', requireAuth, (req, res) => {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  res.json(manifest);
});

// ── Upload ──────────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tiff', '.tif'];
    cb(null, ok.includes(extname(file.originalname).toLowerCase()));
  },
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB per file
});

app.post('/api/upload/:category', requireAuth, upload.array('images', 100), async (req, res) => {
  const { category } = req.params;
  if (!['wedding', 'baptism', 'birthday', 'business'].includes(category)) {
    return res.status(400).json({ error: 'Невалидна категория.' });
  }

  const fullDir  = join(GALLERY_PATH, category, 'full');
  const thumbDir = join(GALLERY_PATH, category, 'thumb');
  mkdirSync(fullDir,  { recursive: true });
  mkdirSync(thumbDir, { recursive: true });

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  if (!manifest[category]) manifest[category] = [];

  const uploaded = [];
  const errors   = [];

  for (const file of (req.files || [])) {
    try {
      const safe  = basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '');
      const fname = `${safe}_${Date.now()}.webp`;

      await sharp(file.buffer)
        .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 88 })
        .toFile(join(fullDir, fname));

      await sharp(file.buffer)
        .resize(700, 700, { fit: 'cover', position: 'attention' })
        .webp({ quality: 80 })
        .toFile(join(thumbDir, fname));

      manifest[category].push(fname);
      uploaded.push(fname);
    } catch (err) {
      errors.push({ file: file.originalname, error: err.message });
    }
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  res.json({ uploaded, errors });
});

// ── Delete ──────────────────────────────────────────────────────────────────
app.delete('/api/delete/:category/:filename', requireAuth, (req, res) => {
  const { category, filename } = req.params;
  if (/[/\\]/.test(filename)) return res.status(400).json({ error: 'Невалидно име.' });

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  if (manifest[category]) {
    manifest[category] = manifest[category].filter(f => f !== filename);
  }

  const tryDelete = p => { try { if (existsSync(p)) unlinkSync(p); } catch (_) {} };
  tryDelete(join(GALLERY_PATH, category, 'full',  filename));
  tryDelete(join(GALLERY_PATH, category, 'thumb', filename));

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  res.json({ success: true });
});

// ── Serve panel HTML & gallery images ──────────────────────────────────────
app.use('/gallery', express.static(join(__dirname, 'public/gallery')));
app.get('*', (_req, res) => res.sendFile(join(__dirname, 'public/admin.html')));

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   YORDAN ФОТОГРАФИЯ — ADMIN ПАНЕЛ        ║
╠══════════════════════════════════════════╣
║   Отворете в браузъра:                   ║
║   http://localhost:${PORT}                   ║
╚══════════════════════════════════════════╝
`);
});
