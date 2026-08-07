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
  // These are outline drawings, and outlines need resolution and restraint.
  // At 78 columns with 30% ink they came out as blobs: the strokes merged into
  // fields and the subject disappeared. Finer grid, thinner ink, less blur.
  // Sources are ASCII art rendered to an image, so their strokes are rows of
  // discrete characters. Sample finer than roughly 80 columns and the grid
  // starts resolving those characters and the line breaks into dots; blur
  // enough to bridge them and shapes fill solid. This pair sits in the window
  // where outlines stay continuous and still read as a subject.
  cols: 76,
  ramp: 'line',
  gamma: 0.9,
  floor: 0.12,
  blurDiv: 9,
  // Ink coverage in these sources runs from 4% to 13% of the canvas, so any
  // fixed gain floods one drawing while blanking another. Instead, aim for a
  // target share of filled cells and solve for the gain that produces it.
  // Thin. The newer sources carry enough contrast that the stroke survives a
  // low target, which the earlier batch could not.
  targetInk: 0.13,
  // Percentile stretch is for photographs, where the useful range is unknown.
  // Line art on white is already calibrated - stretching it drags the white
  // background down into the ramp and floods the grid with characters.
  stretch: false,
  invert: false,
};

/**
 * Per-file tuning. These sources are ASCII art that was already rendered to
 * PNG, so this is a second-generation encode and no single setting serves all
 * of them - stroke weight and framing differ per drawing.
 *
 * `skip` drops a source from the preloader set. image-5 is 2040x684: at any
 * grid that keeps its width readable it is six or seven rows tall, and the
 * subject flattens into a horizontal smear.
 */
/**
 * Sources dropped after looking at every converted grid side by side. Density
 * and framing can be solved automatically; whether a subject survives the
 * conversion cannot, so this list is a judgement, not a threshold. These eight
 * come out as texture with no readable subject - three drawings are shown per
 * visit, and a visitor who draws one of these sees noise.
 */
const PRESETS = Object.fromEntries(
  [
    '365fd35ef158903c7c317961c91c95f7',
    '4ac6e27f8468625ad1c97f01539e917c',
    '5ae6b1ab83d79cc778aba7e7e08d5257',
    '727022fa66b4278eba91351a90be6eba',
    'a35d9169f2d9c8941984402ff24f9466',
    'bc1d752f03587317ede3f550b162472b',
    'd1caf263c8d876cd17bb6acaeebda9da',
    'f4e2c7f10400a93f2b5255e6c73cb866',
  ].map((n) => [n, { skip: true }])
);

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
  const coverage = n / (info.width * info.height);

  // The same number means opposite things depending on the source.
  // With transparency, the pixels carrying alpha ARE the drawing, so their mean
  // is the ink colour. Without it, the frame is mostly background, so the mean
  // is the background colour and the ink is whatever contrasts with it. Reading
  // both the same way inverted every opaque source and filled it solid.
  const lightOnDark = coverage > 0.9 ? mean < 0.5 : mean > 0.5;
  return { lightOnDark, mean, coverage };
}

async function load(path) {
  const pol = await polarity(path);

  // Trim the empty border first. Framing was the variable that made a single
  // setting impossible: where the subject filled the source it converted
  // cleanly, and where it sat small in a large canvas the same target density
  // packed it into a solid blob. Cropping to the drawing removes the variable
  // instead of compensating for it per file.
  const trimmed = await sharp(path).trim({ threshold: 8 }).toBuffer({ resolveWithObject: true });

  let img = sharp(trimmed.data)
    .flatten({ background: pol.lightOnDark ? '#000000' : '#ffffff' })
    .greyscale();
  if (pol.lightOnDark) img = img.negate(); // normalise to dark strokes on white

  const meta = { width: trimmed.info.width, height: trimmed.info.height };
  return { img, meta, pol };
}

/**
 * Sample the source into a cols x rows luminance grid.
 *
 * These sources are ASCII art rendered to PNG, so their "lines" are rows of
 * discrete characters. That creates a trap: sample finely and the line breaks
 * into the source's own dots; blur enough to bridge the dots and the shape
 * fills in solid. Neither is a drawing.
 *
 * Edge mode escapes it. Blur once to fuse the dots into shapes, blur again
 * wider, and take the difference - a difference of Gaussians, which responds at
 * boundaries and cancels in flat areas. The result is a thin continuous outline
 * that keeps detail the tonal path had to trade away.
 */
async function sample(path, cols, blurDiv, edge) {
  const { img, meta, pol } = await load(path);
  const rows = Math.max(1, Math.round((cols * meta.height) / meta.width * CELL_ASPECT));
  const sigma = Math.max(0.3, meta.width / cols / blurDiv);

  const grid = (s) =>
    img
      .clone()
      .blur(s)
      .resize(cols, rows, { fit: 'fill', kernel: 'cubic' })
      .raw()
      .toBuffer();

  if (!edge) {
    const data = await grid(sigma);
    return { lum: Array.from(data, (v) => v / 255), cols, rows, meta, pol };
  }

  const [near, far] = await Promise.all([grid(sigma), grid(sigma * 3)]);
  // |near - far| is the edge response; invert it back into "luminance" so the
  // rest of the pipeline keeps treating dark as ink
  const lum = new Array(near.length);
  for (let i = 0; i < near.length; i++) {
    lum[i] = 1 - Math.min(1, Math.abs(near[i] - far[i]) / 255 * 4);
  }
  return { lum, cols, rows, meta, pol };
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
 * Solve for the gain that fills `target` of the drawing's own bounding box.
 *
 * Measuring against the whole canvas made density depend on how much empty
 * margin a source happened to carry: tightly framed drawings came out at 75%
 * ink (a solid field) while loosely framed ones sat at 30%. The subject is what
 * has to look consistent, so the box the subject occupies is what gets measured.
 * Binary search rather than a quantile, because the box moves as the gain does.
 */
/**
 * Gain that turns `target` of the grid into ink.
 *
 * Deliberately measured over the whole grid, not the drawing's bounding box.
 * Box-relative targets were tried twice and both failed: the box moves with the
 * gain, so the solver either collapses the drawing to a few cells or inflates
 * it into a field. A whole-grid quantile is monotonic and predictable, and the
 * per-file variation it leaves is handled by PRESETS, which is what presets are
 * for.
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
    if (preset.skip) {
      console.log(`${file}\n  skipped by preset`);
      continue;
    }
    const cols = +flag('cols', preset.cols);
    const blurDiv = +flag('blur', preset.blurDiv);

    // Tonal by default. Edge mode reads the source's own character dots as
    // edges and shatters the outline - it is kept for continuous-tone sources
    // (actual photographs), where it does what it promises.
    const { lum, rows, meta, pol } = await sample(path, cols, blurDiv, args.includes('--edge'));
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
      // A grid that comes out almost entirely filled is a failed conversion,
      // not a drawing - shipping it puts a black rectangle in the preloader.
      // Drop it and say so rather than let it through.
      if (inkRatio > 0.6) {
        console.log(`  rejected: ${(inkRatio * 100).toFixed(0)}% ink, reads as a solid block`);
        continue;
      }
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
