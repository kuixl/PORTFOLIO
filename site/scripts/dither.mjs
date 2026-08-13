/**
 * Bayer 8x8 ordered dither for the preview thumbnails.
 *
 *   node scripts/dither.mjs
 *
 * Why this exists twice over. The previews were soft because a 720px thumbnail
 * was being displayed at 560 CSS pixels on a 2x screen, so the browser was
 * scaling a small image up to 1120 device pixels. And they were flat: four
 * full-colour screenshots in a strictly monochrome page looked like stock
 * imagery dropped into someone else's layout.
 *
 * An ordered dither fixes both at once, but only if it is rasterised at the
 * size it will be shown at. Dithering once and letting the browser resample
 * destroys the grid the whole effect depends on and turns it into moire, so
 * every width in TARGETS is dithered independently at its own resolution and
 * offered through srcset. That is also why the dot is always exactly one
 * device pixel: to make the grain finer relative to the interface in the
 * screenshot, raise the resolution rather than the dot.
 *
 * Source is the original capture, not the compressed thumbnail: dithering a
 * webp means dithering its compression artefacts.
 */
import sharp from 'sharp';
import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../../captures/', import.meta.url));
const OUT = fileURLToPath(new URL('../public/works/', import.meta.url));
const MANIFEST = fileURLToPath(new URL('../src/data/works.json', import.meta.url));

/** Widths the browser selects between, in device pixels. */
const TARGETS = [640, 1120, 1600];

const SUPERSAMPLE = 1;

/**
 * Levels the dither quantises to, rather than the two of a hard threshold.
 *
 * One bit was tried first and it destroyed the interface. These captures
 * carry 6 to 8px mono labels, much of it set in light grey and pink, so after
 * desaturation the small type IS a midtone: any threshold either turns it to
 * noise or erases it. Supersampling did not rescue it either, because the
 * source is 1425px wide and the preview is delivered at 1120, so there is no
 * spare detail to average with.
 *
 * Ordered dithering to a handful of levels keeps the same Bayer grid and the
 * same visible grain on photographs and fills, while leaving small type a few
 * intermediate tones to hold its shape in. Grain where the audit asked for
 * grain, legibility where it asked for legibility.
 */
const LEVELS = 5;

/** Contrast before thresholding. Flat mid-greys dither into visual mush. */
const CONTRAST = 1.32;
const OFFSET = -34;

/** Bayer 8x8, the classic recursive matrix, values 0..63. */
const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

/** Ordered dither: nudge each pixel by its matrix cell, then quantise. */
function dither(data, width, height) {
  const out = Buffer.alloc(width * height);
  const steps = LEVELS - 1;
  for (let y = 0; y < height; y++) {
    const row = BAYER[y & 7];
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      // matrix cell as a signed fraction of one quantisation step
      const bias = (row[x & 7] + 0.5) / 64 - 0.5;
      const v = data[i] / 255 * steps + bias;
      const q = Math.max(0, Math.min(steps, Math.round(v)));
      out[i] = Math.round((q / steps) * 255);
    }
  }
  return out;
}

const exists = async (p) => access(p).then(() => true).catch(() => false);

/** Raster one image to a set of widths and return the variants. */
async function rasterise(src, outDir, name, ratio, crop) {
  const variants = [];
  for (const w of TARGETS) {
    const rw = w * SUPERSAMPLE;
    const rh = Math.round(rw * ratio);
    let pipe = sharp(src);
    if (crop) pipe = pipe.extract(crop);
    const { data, info } = await pipe
      .resize(rw, rh, { fit: 'cover', position: 'top' })
      .greyscale()
      .linear(CONTRAST, OFFSET)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const bits = dither(data, info.width, info.height);
    const file = `${name}.dither-${w}.webp`;
    const res = await sharp(bits, { raw: { width: info.width, height: info.height, channels: 1 } })
      .webp({ lossless: true, effort: 6 })
      .toFile(join(outDir, file));
    variants.push({ file, w, h: Math.round(w * ratio), rasterW: res.width, kb: Math.round(res.size / 1024) });
  }
  return variants;
}

/**
 * The portrait goes through the same process as the previews.
 *
 * It was the one photograph on the site left untreated, so it read as a
 * different material from everything around it: dithered screenshots in the
 * index, a plain greyscale photo in the profile.
 */
const portrait = async () => {
  const src = fileURLToPath(new URL('../public/portrait.webp', import.meta.url));
  if (!(await exists(src))) { console.warn('skip portrait: not found'); return; }
  const { width, height } = await sharp(src).metadata();
  const out = fileURLToPath(new URL('../public/', import.meta.url));
  const v = await rasterise(src, out, 'portrait', height / width, null);
  console.log('portrait  ' + v.map((x) => `${x.w}px ${x.kb}KB`).join('  '));
};

const run = async () => {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));

  for (const [project, shots] of Object.entries(manifest)) {
    for (const shot of shots) {
      if (!shot.thumb) continue;

      const capture = join(SRC, project, `${shot.page}-${shot.size}.png`);
      if (!(await exists(capture))) {
        console.warn(`skip ${project}/${shot.page}: no capture`);
        continue;
      }

      // the same crop optimize-shots.mjs used, so the dithered preview frames
      // the same part of the page as the plain one
      const { width, height } = await sharp(capture).metadata();
      const cropH = Math.min(height, Math.round(width * 0.72));
      const ratio = shot.thumb.h / shot.thumb.w;
      const top = Math.max(0, Math.min(height - cropH, Math.round((shot.h - cropH) * 0)));

      const variants = [];
      const colour = [];
      for (const w of TARGETS) {
        const rw = w * SUPERSAMPLE;
        const rh = Math.round(rw * ratio);
        const crop = { left: 0, top, width, height: cropH };

        /* The colour preview, which is what the page shows.
           Outside reviewers read the greyscale treatment as an unfinished
           screenshot rather than as a decision, so the projects keep their own
           colours and the paper palette is reconciled in CSS instead. */
        const plain = await sharp(capture)
          .extract(crop)
          .resize(w, Math.round(w * ratio), { fit: 'cover', position: 'top' })
          .webp({ quality: 82 })
          .toFile(join(OUT, project, `${shot.page}-${shot.size}.c-${w}.webp`));
        colour.push({
          file: `${shot.page}-${shot.size}.c-${w}.webp`,
          w,
          h: Math.round(w * ratio),
          kb: Math.round(plain.size / 1024),
        });

        const { data, info } = await sharp(capture)
          .extract(crop)
          .resize(rw, rh, { fit: 'cover', position: 'top' })
          .greyscale()
          .linear(CONTRAST, OFFSET)
          .raw()
          .toBuffer({ resolveWithObject: true });

        const bits = dither(data, info.width, info.height);
        const file = `${shot.page}-${shot.size}.dither-${w}.webp`;
        // lossless: a lossy codec smears a one-pixel checkerboard into grey,
        // which is the one thing this whole script exists to avoid
        const res = await sharp(bits, { raw: { width: info.width, height: info.height, channels: 1 } })
          .webp({ lossless: true, effort: 6 })
          .toFile(join(OUT, project, file));

        // the descriptor is the delivered width, not the raster width: the
        // extra pixels are the supersample and must not skew srcset selection
        variants.push({
          file,
          w,
          h: Math.round(w * ratio),
          rasterW: res.width,
          kb: Math.round(res.size / 1024),
        });
      }

      shot.thumb.dither = variants;
      shot.thumb.colour = colour;
      console.log(
        `${project}/${shot.page}-${shot.size}  ` +
          `colour ${colour.map((v) => v.kb).join('/')}KB  ` +
          `raster ${variants.map((v) => v.kb).join('/')}KB`
      );
    }
  }

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('\nupdated src/data/works.json');
  await portrait();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
