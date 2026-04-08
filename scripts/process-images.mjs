import sharp from 'sharp';
import { readdir, writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'gallery');

// Category assignments:
// Folder 1 (snimkipurvapapka) → Сватбена фотография (wedding)
// Folder 2 (snimkivtorapapka) → Бизнес фотография (business)
// Folder 3 (snimkitretapapka) → split evenly between Кръщене (baptism) & Рождени дни (birthday)
const SOURCES = [
  { dir: path.join(ROOT, 'snimkipurvapapka'), category: 'baptism' },
  { dir: path.join(ROOT, 'snimkivtorapapka'), category: 'wedding' },
  { dir: path.join(ROOT, 'snimkitretapapka'), category: 'wedding' },
];

const THUMB_WIDTH = 400;
const FULL_WIDTH = 1400;
const THUMB_QUALITY = 75;
const FULL_QUALITY = 80;

async function processImage(inputPath, category, baseName) {
  const thumbDir = path.join(OUT, category, 'thumb');
  const fullDir = path.join(OUT, category, 'full');
  const outName = baseName.replace(/\.(jpe?g|png)$/i, '.webp');

  await Promise.all([
    sharp(inputPath)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toFile(path.join(thumbDir, outName)),
    sharp(inputPath)
      .resize({ width: FULL_WIDTH, withoutEnlargement: true })
      .webp({ quality: FULL_QUALITY })
      .toFile(path.join(fullDir, outName)),
  ]);

  return outName;
}

async function run() {
  const manifest = { wedding: [], baptism: [], birthday: [], business: [] };
  let total = 0;
  let done = 0;

  // Count total first
  for (const src of SOURCES) {
    const files = await readdir(src.dir);
    total += files.filter(f => /\.(jpe?g|png)$/i.test(f)).length;
  }

  console.log(`Processing ${total} images...\n`);

  for (const src of SOURCES) {
    const files = (await readdir(src.dir))
      .filter(f => /\.(jpe?g|png)$/i.test(f))
      .sort();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const inputPath = path.join(src.dir, file);

      // Determine category
      let category;
      if (src.split) {
        category = i < Math.ceil(files.length / 2) ? src.split[0] : src.split[1];
      } else {
        category = src.category;
      }

      // Sanitize filename (remove spaces and parentheses)
      const safeName = file.replace(/[() ]/g, '_');

      try {
        const outName = await processImage(inputPath, category, safeName);
        manifest[category].push(outName);
        done++;
        if (done % 20 === 0 || done === total) {
          console.log(`  ${done}/${total} done`);
        }
      } catch (err) {
        console.error(`  ERROR: ${file} — ${err.message}`);
        done++;
      }
    }
  }

  // Write manifest JSON
  await writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('\nManifest written to public/gallery/manifest.json');
  console.log(`Wedding: ${manifest.wedding.length}`);
  console.log(`Baptism: ${manifest.baptism.length}`);
  console.log(`Birthday: ${manifest.birthday.length}`);
  console.log(`Business: ${manifest.business.length}`);
}

run().catch(console.error);
