/**
 * Render the social card.
 *
 *   node scripts/og.mjs
 *
 * Built rather than drawn by hand so it cannot drift from the site: the same
 * ink, the same paper, the same wordmark, and one of the real ASCII drawings
 * behind it. Regenerate after changing the palette or the art set.
 */
import sharp from 'sharp';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUB = fileURLToPath(new URL('../public/', import.meta.url));
const W = 1200;
const H = 630;
const INK = '#0E0E0E';
const PAPER = '#F4F2EE';
const MUTED = '#A8A5AE';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const run = async () => {
  const art = (await readdir(join(PUB, 'art'))).filter((f) => f.endsWith('.txt'));
  // widest drawing available: the card is landscape, so width is what fills it
  let best = null;
  for (const f of art) {
    const text = await readFile(join(PUB, 'art', f), 'utf8');
    const w = Math.max(...text.split('\n').map((l) => l.length));
    if (!best || w > best.w) best = { text, w, rows: text.split('\n').length };
  }

  // Fit the drawing into the right-hand box rather than guessing a cell size:
  // guessing either left it as faint specks or ran it off the canvas and under
  // the name.
  const BOX = { x: 620, y: 40, w: 540, h: 550 };
  const artRows = best.text.split('\n');
  const cell = Math.min(BOX.w / best.w, BOX.h / artRows.length / 1.9);
  const line = cell * 1.9;
  const artW = best.w * cell;
  const artH = artRows.length * line;
  const ox = BOX.x + (BOX.w - artW) / 2;
  const oy = BOX.y + (BOX.h - artH) / 2;

  const glyphs = artRows
    .map((row, r) =>
      `<text x="${ox}" y="${oy + r * line}" xml:space="preserve">${esc(row)}</text>`
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${INK}"/>
    <g fill="${PAPER}" opacity="0.85" font-family="monospace" font-size="${cell * 1.7}"
       letter-spacing="${cell - cell * 1.02}">${glyphs}</g>
    <text x="64" y="300" fill="${PAPER}" font-family="Helvetica, Arial, sans-serif"
          font-weight="bold" font-size="96" letter-spacing="-3">Konstantin</text>
    <text x="64" y="392" fill="${PAPER}" font-family="Helvetica, Arial, sans-serif"
          font-weight="bold" font-size="96" letter-spacing="-3">Darovskiy</text>
    <text x="64" y="452" fill="${MUTED}" font-family="Helvetica, Arial, sans-serif"
          font-size="26">I design interfaces. Then I ship them.</text>
    <text x="64" y="566" fill="${MUTED}" font-family="monospace" font-size="20"
          letter-spacing="3">UX/UI &#183; WEB &#183; CODE</text>
  </svg>`;

  const out = await sharp(Buffer.from(svg)).png().toFile(join(PUB, 'og.png'));
  await writeFile(join(PUB, 'og.svg'), svg, 'utf8');
  console.log(`og.png ${out.width}x${out.height}  ${Math.round(out.size / 1024)} KB`);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
