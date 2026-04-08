import sharp from 'sharp';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'gallery');

const SOURCES = [
  path.join(ROOT, 'snimkichetvurtapapka'),
  path.join(ROOT, 'snimkishestapapka'),
];

const THUMB_WIDTH = 400;
const FULL_WIDTH = 1400;
const THUMB_QUALITY = 75;
const FULL_QUALITY = 80;

async function processImage(inputPath, baseName) {
  const thumbDir = path.join(OUT, 'business', 'thumb');
  const fullDir = path.join(OUT, 'business', 'full');
  const outName = baseName.replace(/\.(jpe?g|png)$/i, '.webp');

  await mkdir(thumbDir, { recursive: true });
  await mkdir(fullDir, { recursive: true });

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
  // Load existing manifest
  const manifestPath = path.join(OUT, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.business = [];

  let total = 0;
  const allFiles = [];

  for (const srcDir of SOURCES) {
    const files = (await readdir(srcDir))
      .filter(f => /\.(jpe?g|png)$/i.test(f))
      .sort()
      .map(f => ({ dir: srcDir, file: f }));
    allFiles.push(...files);
    total += files.length;
  }

  console.log(`Processing ${total} business images...\n`);

  let done = 0;
  for (const { dir, file } of allFiles) {
    const inputPath = path.join(dir, file);
    const safeName = file.replace(/[() ]/g, '_');
    try {
      const outName = await processImage(inputPath, safeName);
      manifest.business.push(outName);
      done++;
      if (done % 10 === 0 || done === total) {
        console.log(`  ${done}/${total} done`);
      }
    } catch (err) {
      console.error(`  ERROR: ${file} — ${err.message}`);
      done++;
    }
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('\nDone!');
  console.log(`Business: ${manifest.business.length} images`);
}

run().catch(console.error);
