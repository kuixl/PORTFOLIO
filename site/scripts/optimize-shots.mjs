/**
 * Compress full-page captures for the work viewer.
 *
 *   node scripts/optimize-shots.mjs
 *
 * Captures land in public/works/<project>/<page>-<size>.png as raw Playwright
 * output. This turns each into a webp the browser can actually afford. The PNGs
 * stay on disk but out of git - they are reproducible by re-running the capture.
 *
 * Full-page shots are tall and thin, and some exceed the 16383px limit browsers
 * and encoders impose on a single image dimension, so anything over the cap is
 * sliced into numbered tiles the viewer stacks back together.
 */
import sharp from 'sharp';
import { readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../public/works/', import.meta.url));
const MAX_H = 16000;      // stay clear of the 16383px encoder ceiling
const QUALITY = 80;

const run = async () => {
  const projects = (await readdir(ROOT, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const manifest = {};

  for (const project of projects) {
    const dir = join(ROOT, project);
    const shots = (await readdir(dir)).filter((f) => f.endsWith('.png'));
    manifest[project] = [];

    for (const file of shots) {
      const src = join(dir, file);
      const name = basename(file, '.png');
      const img = sharp(src);
      const { width, height } = await img.metadata();
      const srcKb = Math.round((await stat(src)).size / 1024);

      const tiles = Math.ceil(height / MAX_H);
      const parts = [];
      for (let i = 0; i < tiles; i++) {
        const top = i * MAX_H;
        const h = Math.min(MAX_H, height - top);
        const out = tiles === 1 ? `${name}.webp` : `${name}.${i}.webp`;
        const info = await sharp(src)
          .extract({ left: 0, top, width, height: h })
          .webp({ quality: QUALITY })
          .toFile(join(dir, out));
        parts.push({ file: out, w: info.width, h: info.height, kb: Math.round(info.size / 1024) });
      }

      const outKb = parts.reduce((s, p) => s + p.kb, 0);
      const [page, size] = name.split('-');
      manifest[project].push({ page, size, w: width, h: height, parts });
      console.log(
        `${project}/${file}  ${width}x${height}  ${srcKb} KB -> ${outKb} KB` +
          (tiles > 1 ? `  (${tiles} tiles)` : '')
      );
    }
  }

  await mkdir(ROOT, { recursive: true });
  await writeFile(join(ROOT, 'works.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('\nwrote public/works/works.json');
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
