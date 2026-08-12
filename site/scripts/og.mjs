/**
 * Render one social card per page.
 *
 *   npm run build && node scripts/og.mjs && npm run build
 *
 * Two builds the first time round, and the reason is worth stating: the copy
 * on each card is read out of the pages themselves, from the title and
 * description already in dist/. Nothing is retyped here, so a card cannot
 * drift from the page it represents. The cards land in public/og/ and the
 * second build copies them into dist/.
 *
 * Built rather than drawn by hand for the same reason: same ink, same paper,
 * same wordmark, and one of the real ASCII drawings behind it.
 */
import sharp from 'sharp';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUB = fileURLToPath(new URL('../public/', import.meta.url));
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const W = 1200;
const H = 630;
const INK = '#0E0E0E';
const PAPER = '#F4F2EE';
const MUTED = '#8A8792';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Routes to render, and where their built HTML lives. */
const ROUTES = [
  { name: 'home-en', html: 'index.html' },
  { name: 'home-ru', html: 'ru/index.html' },
  { name: 'nichive-en', html: 'nichive/index.html' },
  { name: 'nichive-ru', html: 'ru/nichive/index.html' },
  { name: 'yakitoria-en', html: 'yakitoria/index.html' },
  { name: 'yakitoria-ru', html: 'ru/yakitoria/index.html' },
  { name: 'beta-en', html: 'beta/index.html' },
  { name: 'beta-ru', html: 'ru/beta/index.html' },
];

const pick = (html, re) => (html.match(re)?.[1] ?? '').trim();

/** Break a line into at most `max` chars per row, on word boundaries. */
function wrap(text, max, rows) {
  const words = text.split(/\s+/);
  const out = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max) { out.push(line.trim()); line = w; }
    else line = (line + ' ' + w).trim();
    if (out.length === rows) break;
  }
  if (out.length < rows && line) out.push(line.trim());
  return out.slice(0, rows);
}

const run = async () => {
  // widest drawing available: the card is landscape, so width is what fills it
  const art = (await readdir(join(PUB, 'art'))).filter((f) => f.endsWith('.txt'));
  let best = null;
  for (const f of art) {
    const text = await readFile(join(PUB, 'art', f), 'utf8');
    const w = Math.max(...text.split('\n').map((l) => l.length));
    if (!best || w > best.w) best = { text, w, rows: text.split('\n').length };
  }

  // Fit the drawing into the right-hand box rather than guessing a cell size:
  // guessing either left it as faint specks or ran it off the canvas.
  const BOX = { x: 620, y: 40, w: 540, h: 550 };
  const artRows = best.text.split('\n');
  const cell = Math.min(BOX.w / best.w, BOX.h / artRows.length / 1.9);
  const line = cell * 1.9;
  const ox = BOX.x + (BOX.w - best.w * cell) / 2;
  const oy = BOX.y + (BOX.h - artRows.length * line) / 2;
  const glyphs = artRows
    .map((row, r) => `<text x="${ox}" y="${oy + r * line}" xml:space="preserve">${esc(row)}</text>`)
    .join('');

  await mkdir(join(PUB, 'og'), { recursive: true });

  for (const route of ROUTES) {
    const html = await readFile(join(DIST, route.html), 'utf8').catch(() => null);
    if (!html) { console.warn(`skip ${route.name}: build dist first`); continue; }

    const rawTitle = pick(html, /<title>([^<]*)<\/title>/);
    const desc = pick(html, /<meta name="description" content="([^"]*)"/);
    // "nichive - case study - Konstantin Darovskiy" -> "nichive"
    const heading = rawTitle.split(' - ')[0];
    // The text column ends where the drawing begins (x=620), so the wrap has
    // to respect that: at 52 characters the description ran under the art.
    const headLines = wrap(heading, 12, 2);
    const descLines = wrap(desc, 38, 3);

    const titleSize = headLines.length > 1 || heading.length > 10 ? 84 : 104;
    const descTop = 292 + headLines.length * (titleSize + 4) + 24;
    const lastDesc = descTop + (descLines.length - 1) * 34;
    // the wordmark sits under the text rather than at a fixed height, which is
    // where a third description line used to land on top of it
    const markY = Math.min(590, Math.max(566, lastDesc + 44));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <g fill="${PAPER}" opacity="0.85" font-family="monospace" font-size="${cell * 1.7}"
     letter-spacing="${cell - cell * 1.02}">${glyphs}</g>
  ${headLines
    .map((l, i) => `<text x="64" y="${292 + i * (titleSize + 4)}" fill="${PAPER}" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="${titleSize}" letter-spacing="-3">${esc(l)}</text>`)
    .join('\n  ')}
  ${descLines
    .map((l, i) => `<text x="64" y="${descTop + i * 34}" fill="${MUTED}" font-family="Helvetica, Arial, sans-serif" font-size="26">${esc(l)}</text>`)
    .join('\n  ')}
  <text x="64" y="${markY}" fill="${MUTED}" font-family="monospace" font-size="20" letter-spacing="3">kuixl</text>
</svg>`;

    const out = await sharp(Buffer.from(svg)).png().toFile(join(PUB, 'og', `${route.name}.png`));
    console.log(`og/${route.name}.png  ${out.width}x${out.height}  ${Math.round(out.size / 1024)} KB  "${heading}"`);
  }

  // the generic card stays as the fallback for anything without its own
  await writeFile(join(PUB, 'og-note.txt'), 'generated by scripts/og.mjs\n', 'utf8');
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
