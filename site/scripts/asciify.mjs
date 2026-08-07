/**
 * image -> ascii converter for the portfolio art pipeline.
 *
 *   node scripts/asciify.mjs            convert everything in art/source
 *   node scripts/asciify.mjs --probe    just report what the sources look like
 *   node scripts/asciify.mjs --cols 90  override the default width
 *
 * Sources live in ../art/source, results are written to public/art/<name>.txt
 * as plain character grids plus an art.json manifest the site reads at build
 * time. Output is committed, so the site never converts at runtime.
 *
 * Per-file overrides go in PRESETS below - that is the whole point of owning
 * the converter: density, ramp and threshold are tuned per drawing instead of
 * being re-guessed with sliders.
 */
import sharp from 'sharp';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not URL.pathname - the project path contains Cyrillic and
// pathname hands back percent-encoded text that sharp cannot open.
const SRC = fileURLToPath(new URL('../../art/source/', import.meta.url));
const OUT = fileURLToPath(new URL('../public/art/', import.meta.url));

// dense -> sparse. line art reads better on a short ramp: too many levels and
// the strokes dissolve into noise.
// No trailing space: blank is decided by the floor, not by the ramp. Leaving a
// space on the end wasted a whole level and printed gaps inside solid strokes.
const RAMPS = {
  line: '@#+=-:.',
  soft: '@%#*+=-:.',
  dots: '@o*:.',
  blocks: '█▓▒░',
};

const DEFAULTS = {
  cols: 78,
  ramp: 'line',
  gamma: 0.9,
  floor: 0.12,
  blurDiv: 6,
  // Ink coverage in these sources runs from 4% to 13% of the canvas, so any
  // fixed gain floods one drawing while blanking another. Instead, aim for a
  // target share of filled cells and solve for the gain that produces it.
  targetInk: 0.3,
  // Percentile stretch is for photographs, where the useful range is unknown.
  // Line art on white is already calibrated - stretching it drags the white
  // background down into the ramp and floods the grid with characters.
  stretch: false,
  invert: false,
};

/** per-file tuning; keys are matched against the source filename */
const PRESETS = {
  // filled once the sources are named - see the report this script prints
};

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const probeOnly = args.includes('--probe');

/**
 * Character cells are about twice as tall as they are wide, so the sample grid
 * has to be squashed vertically or every drawing comes out stretched.
 */
const CELL_ASPECT = 0.5;

/**
 * Sources arrive in both polarities: some are dark strokes on transparency,
 * some are light strokes on transparency. Flattening both onto white makes the
 * light ones vanish. Decide per file by looking at the pixels that actually
 * carry alpha, then normalise everything to dark-on-white.
 */
async function polarity(path) {
  const { data, info } = await sharp(path)
    .resize(160, 160, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0, n = 0;
  for (let i = 0; i < info.width * info.height; i++) {
    const a = data[i * 4 + 3];
    if (a > 32) {
      sum += (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
      n++;
    }
  }
  const mean = n ? sum / n : 1;
  // opaque pixels mostly light => the drawing is light-on-dark
  return { lightOnDark: mean > 0.5, mean, coverage: n / (info.width * info.height) };
}

async function load(path) {
  const pol = await polarity(path);
  let img = sharp(path).flatten({ background: pol.lightOnDark ? '#000000' : '#ffffff' }).greyscale();
  if (pol.lightOnDark) img = img.negate(); // normalise to dark strokes on white
  const meta = await sharp(path).metadata();
  return { img, meta, pol };
}

async function sample(path, cols, blurDiv) {
  const { img, meta, pol } = await load(path);
  const rows = Math.max(1, Math.round((cols * meta.height) / meta.width * CELL_ASPECT));
  // These sources are line art, often themselves rendered ASCII at roughly the
  // density we are targeting. A little blur stops thin strokes from falling
  // between sample points; too much merges neighbouring strokes into a solid
  // blob and erases the drawing. blurDiv tunes that trade-off per source.
  const sigma = Math.max(0.3, meta.width / cols / blurDiv);
  const { data } = await img
    .blur(sigma)
    .resize(cols, rows, { fit: 'fill', kernel: 'cubic' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { lum: Array.from(data, (v) => v / 255), cols, rows, meta, pol };
}

/** percentile stretch so faint scans and hard blacks both land on the ramp */
function stretch(lum, gamma, enabled) {
  if (!enabled) return lum.map((v) => Math.pow(v, gamma));
  const sorted = [...lum].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.01)];
  const hi = sorted[Math.floor(sorted.length * 0.99)];
  const span = Math.max(0.02, hi - lo);
  return lum.map((v) => Math.pow(Math.min(1, Math.max(0, (v - lo) / span)), gamma));
}

/**
 * Solve for the gain that lands `target` of all cells above the ink floor.
 * A cell is ink when (1-v)*g >= floor, i.e. when (1-v) >= floor/g, so the gain
 * follows directly from the matching quantile - no search needed.
 */
function autoGain(lum, floor, target) {
  const ink = lum.map((v) => 1 - v).sort((a, b) => a - b);
  const q = ink[Math.floor((1 - target) * (ink.length - 1))];
  if (!q || q <= 0) return 1;
  return Math.min(60, Math.max(1, floor / q));
}

function toText(lum, cols, rows, { ramp, floor, gain }) {
  const chars = RAMPS[ramp] ?? RAMPS.line;
  const lines = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      const v = lum[r * cols + c];
      // v is brightness: bright background -> blank, dark stroke -> dense char
      const ink = Math.min(1, (1 - v) * gain);
      if (ink < floor) { line += ' '; continue; }
      // rescale [floor,1] across the whole ramp, otherwise every cell clusters
      // at the sparse end and the drawing comes out as one flat tone
      const t = (ink - floor) / (1 - floor);
      line += chars[Math.min(chars.length - 1, Math.round((1 - t) * (chars.length - 1)))];
    }
    lines.push(line.replace(/\s+$/, ''));
  }
  // trim fully blank edges so the art sits tight in its box
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(indent)).join('\n');
}

const run = async () => {
  const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  if (!files.length) {
    console.error('no sources in art/source');
    process.exit(1);
  }
  await mkdir(OUT, { recursive: true });
  const manifest = [];

  for (const file of files) {
    const path = join(SRC, file);
    const name = basename(file, extname(file)).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const preset = { ...DEFAULTS, ...(PRESETS[name] ?? {}) };
    const cols = +flag('cols', preset.cols);
    const blurDiv = +flag('blur', preset.blurDiv);

    const { lum, rows, meta, pol } = await sample(path, cols, blurDiv);
    const stretched = stretch(lum, preset.gamma, args.includes('--stretch') || preset.stretch);
    const target = +flag('ink', preset.targetInk);
    const gain = autoGain(stretched, preset.floor, target);
    const text = toText(stretched, cols, rows, { ...preset, gain });

    const inkRatio = text.replace(/[\s\n]/g, '').length / Math.max(1, text.replace(/\n/g, '').length);
    const w = Math.max(...text.split('\n').map((l) => l.length));
    const h = text.split('\n').length;

    console.log(
      `${file}\n  src ${meta.width}x${meta.height} ${pol.lightOnDark ? 'light-on-dark' : 'dark-on-light'}` +
        ` (mean ${pol.mean.toFixed(2)}, alpha ${(pol.coverage * 100).toFixed(0)}%)` +
        `  ->  grid ${w}x${h}  ink ${(inkRatio * 100).toFixed(0)}%  gain ${gain.toFixed(1)}`
    );

    if (!probeOnly) {
      await writeFile(join(OUT, `${name}.txt`), text, 'utf8');
      // The originals are the artwork as drawn and they beat any re-rendering
      // of them, so pages get a compressed copy. The character grid is for the
      // preloader, which needs glyphs it can move individually.
      const webp = join(OUT, `${name}.webp`);
      const flat = pol.lightOnDark ? { r: 14, g: 14, b: 14 } : { r: 244, g: 242, b: 238 };
      const out = await sharp(path)
        .flatten({ background: flat })
        .resize(900, null, { withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(webp);
      manifest.push({
        name,
        w,
        h,
        ink: +inkRatio.toFixed(3),
        light: pol.lightOnDark,
        png: { w: out.width, h: out.height, kb: Math.round(out.size / 1024) },
      });
    }
  }

  if (!probeOnly) {
    await writeFile(join(OUT, 'art.json'), JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`\nwrote ${manifest.length} grids + art.json to public/art/`);
  }
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
