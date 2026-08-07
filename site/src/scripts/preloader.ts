/**
 * Preloader: a staged, timeline-driven title sequence (~7.5s).
 *
 *   act 01  SKETCHES   0.00-0.14  ink screen, HUD grid, doodles draw themselves
 *   act 02  PORTRAIT   0.14-0.42  ASCII portrait reveals in a typewriter scanline
 *   act 03  MORPH      0.42-0.66  ink glyphs fly along bezier curves into the wordmark,
 *                                 flickering kuixl / куиксл until the browser language wins
 *   act 04  WORDMARK   0.66-0.86  the word holds, breathing, with a blinking cursor -
 *                                 long enough to actually read it
 *   act 05  EXIT       0.86-1.00  glyphs scatter under gravity, overlay fades out
 *
 * Background: coordinate grid in the object-tracking HUD language of the
 * reference video - dashed trajectories and x/y labels on tracked glyphs.
 * The HUD numbers show REAL asset progress; the choreography is time-based.
 * If assets are still loading when the exit act arrives, the wordmark holds
 * until they finish.
 */
import { initSketches } from './sketches';
import { sound } from './sound';

const RAMP = '@%#*+=-:. ';            // dense -> sparse
const INK_LIMIT = 5;                  // ramp index <= this is an "ink" glyph
const PAPER = 'rgba(244,242,238,';
const TOTAL_MS = 7500;                // full choreography
const GATE_EXTRA_MS = 8000;           // max extra hold for slow assets
const PORTRAIT_CROP = { x: 0.47, y: 0.02, w: 0.48, h: 0.76 };

const ACT = { sketch: 0.14, portrait: 0.42, morph: 0.66, hold: 0.86 };
const ACT_NAMES: [number, string][] = [
  [0, '01 SKETCHES'], [ACT.sketch, '02 PORTRAIT'], [ACT.portrait, '03 MORPH'],
  [ACT.morph, '04 WORDMARK'], [ACT.hold, '05 EXIT'],
];

type Cell = { c: number; r: number; ch: string; jitter: number; seed: number };
type Particle = {
  x0: number; y0: number; cx: number; cy: number;
  ch: string; delay: number; tracked: boolean;
  sx: number; sy: number;
};

const prm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- real progress (honest numbers for the HUD) ----------
const real = { fonts: 0, portrait: 0, doc: 0 };
const realProgress = () => real.fonts * 0.3 + real.portrait * 0.55 + real.doc * 0.15;

function trackReal(onPortrait: (img: HTMLImageElement) => void) {
  Promise.all([
    document.fonts.load('400 13px "Sligoil Micro"'),
    document.fonts.load('900 100px "Switzer"'),
  ]).then(() => (real.fonts = 1)).catch(() => (real.fonts = 1));

  if (document.readyState === 'complete') real.doc = 1;
  else addEventListener('load', () => (real.doc = 1), { once: true });

  fetch('/portrait.jpg')
    .then(async (res) => {
      const len = +(res.headers.get('content-length') ?? 0);
      const reader = res.body!.getReader();
      const chunks: Uint8Array[] = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        if (len) real.portrait = Math.min(0.95, got / len);
      }
      const blob = new Blob(chunks as BlobPart[]);
      const img = new Image();
      img.onload = () => { real.portrait = 1; onPortrait(img); };
      img.src = URL.createObjectURL(blob);
    })
    .catch(() => (real.portrait = 1));
}

// ---------- helpers ----------
const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const seg = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

/** luminance grid with percentile contrast stretch - keeps the face readable */
function sampleImage(img: HTMLImageElement, cols: number, rows: number): number[] {
  const off = document.createElement('canvas');
  off.width = cols; off.height = rows;
  const c = off.getContext('2d', { willReadFrequently: true })!;
  const { x, y, w, h } = PORTRAIT_CROP;
  c.drawImage(img, x * img.width, y * img.height, w * img.width, h * img.height, 0, 0, cols, rows);
  const d = c.getImageData(0, 0, cols, rows).data;
  const lum: number[] = new Array(cols * rows);
  for (let i = 0; i < cols * rows; i++)
    lum[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
  const sorted = [...lum].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)];
  const span = Math.max(0.05, hi - lo);
  return lum.map((v) => Math.pow(Math.min(1, Math.max(0, (v - lo) / span)), 0.9));
}

/** raster a word into grid cells, horizontally dilated so strokes stay fat */
function rasterWord(word: string, cols: number, rows: number, cellW: number, cellH: number) {
  const off = document.createElement('canvas');
  off.width = cols; off.height = rows;
  const c = off.getContext('2d', { willReadFrequently: true })!;
  c.fillStyle = '#000'; c.fillRect(0, 0, cols, rows);
  c.fillStyle = '#fff';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  let size = rows * 0.62;
  c.font = `900 ${size}px "Switzer", sans-serif`;
  const w = c.measureText(word).width;
  size = Math.min(size, (size * (cols * 0.9)) / w);
  c.save();
  c.scale(1, cellW / cellH);
  c.font = `900 ${size}px "Switzer", sans-serif`;
  c.fillText(word, cols / 2, (rows / 2) * (cellH / cellW));
  c.restore();
  const d = c.getImageData(0, 0, cols, rows).data;
  const ink = (col: number, r: number) => d[(r * cols + col) * 4] > 128;
  const cells: { c: number; r: number }[] = [];
  for (let r = 0; r < rows; r++)
    for (let col = 0; col < cols; col++)
      if (ink(col, r) || (col > 0 && ink(col - 1, r)) || (col < cols - 1 && ink(col + 1, r)))
        cells.push({ c: col, r });
  return cells;
}

// ---------- main ----------
export function initPreloader(): Promise<void> {
  return new Promise((resolve) => {
    const shell = document.getElementById('preloader')!;
    const canvas = document.getElementById('ascii-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(2, devicePixelRatio || 1);

    const params = new URLSearchParams(location.search);
    const forcedP = params.has('p') ? +params.get('p')! : null;

    const W = innerWidth, H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const F = W < 600 ? 10 : 12;
    const cellW = Math.round(F * 0.62);
    const cellH = F;
    const cols = Math.ceil(W / cellW);
    const rows = Math.ceil(H / cellH);

    const pRows = Math.round(rows * 0.78);
    const cropAspect = (PORTRAIT_CROP.w / PORTRAIT_CROP.h) * (4 / 3);
    const pCols = Math.min(Math.round(pRows * (cellH / cellW) * cropAspect), Math.round(cols * 0.9));
    const pc0 = Math.floor((cols - pCols) / 2);
    const pr0 = Math.floor((rows - pRows) / 2);

    let cells: Cell[] = [];
    let particles: Particle[] = [];
    let targets: { en: { x: number; y: number }[]; ru: { x: number; y: number }[] } | null = null;
    let wordBox = { x: 0, y: 0, w: 0, h: 0 };
    const finalLang: 'en' | 'ru' = (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';

    trackReal((img) => {
      const lum = sampleImage(img, pCols, pRows);
      cells = [];
      for (let r = 0; r < pRows; r++)
        for (let c = 0; c < pCols; c++) {
          // paper glyphs on ink: bright pixels take the dense characters
          const idx = Math.min(RAMP.length - 1, Math.floor((1 - lum[r * pCols + c]) * RAMP.length));
          cells.push({ c: pc0 + c, r: pr0 + r, ch: RAMP[idx], jitter: Math.random(), seed: Math.random() * 1000 });
        }
      buildParticles();
    });

    function buildParticles() {
      const en = rasterWord('kuixl', cols, rows, cellW, cellH);
      const ru = rasterWord('куиксл', cols, rows, cellW, cellH);
      const ink = cells.filter((c) => RAMP.indexOf(c.ch) <= INK_LIMIT);
      const key = (a: { c: number; r: number }) => a.c * 3 + a.r;
      ink.sort((a, b) => key(a) - key(b));
      en.sort((a, b) => key(a) - key(b));
      ru.sort((a, b) => key(a) - key(b));
      const n = Math.min(1100, en.length, ink.length);
      const step = ink.length / n;
      const tEn: { x: number; y: number }[] = [];
      const tRu: { x: number; y: number }[] = [];
      particles = [];
      let minX = 1e9, maxX = 0, minY = 1e9, maxY = 0;
      for (let i = 0; i < n; i++) {
        const s = ink[Math.floor(i * step)];
        const eT = en[Math.floor((i / n) * en.length)];
        const rT = ru[Math.floor((i / n) * ru.length)];
        tEn.push({ x: eT.c * cellW, y: eT.r * cellH });
        tRu.push({ x: rT.c * cellW, y: rT.r * cellH });
        const fx = finalLang === 'en' ? eT : rT;
        minX = Math.min(minX, fx.c * cellW); maxX = Math.max(maxX, fx.c * cellW);
        minY = Math.min(minY, fx.r * cellH); maxY = Math.max(maxY, fx.r * cellH);
        const x0 = s.c * cellW, y0 = s.r * cellH;
        particles.push({
          x0, y0,
          cx: rand(-0.35, 0.35), cy: rand(-0.5, -0.12),
          ch: s.ch,
          delay: 0.28 * ((s.c - pc0) / pCols) + Math.random() * 0.1,
          tracked: false,
          sx: rand(-140, 140), sy: rand(-280, -60),
        });
      }
      wordBox = { x: minX, y: minY, w: maxX - minX + cellW, h: maxY - minY + cellH };
      for (let k = 0; k < 6; k++) particles[Math.floor(rand(0, particles.length))].tracked = true;
      targets = { en: tEn, ru: tRu };
    }

    // ---------- HUD ----------
    const t0 = performance.now();
    let flick: 'en' | 'ru' = finalLang;
    let lastFlick = 0;
    let lockSoundGate = 0;
    let done = false;

    function hud(t: number, now: number) {
      ctx.fillStyle = '#0E0E0E';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = PAPER + '0.05)';
      ctx.lineWidth = 1;
      const gs = 96;
      ctx.beginPath();
      for (let x = gs; x < W; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = gs; y < H; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      ctx.font = '10px "Sligoil Micro", monospace';
      ctx.fillStyle = PAPER + '0.15)';
      for (let x = gs; x < W; x += gs * 2)
        for (let y = gs; y < H; y += gs * 2)
          ctx.fillText(`${x} ${y}`, x + 3, y - 3);

      const rp = Math.round(realProgress() * 100);
      const act = ACT_NAMES.filter(([a]) => t >= a).pop()![1];
      ctx.fillStyle = PAPER + '0.6)';
      ctx.font = '11px "Sligoil Micro", monospace';
      ctx.fillText(`kuixl / preload / ${act}`, 20, 24);
      ctx.fillText(`${String(rp).padStart(3, '0')}%`, W - 58, 24);
      ctx.fillText(`F:${real.fonts ? '#' : '.'} I:${real.portrait >= 1 ? '#' : '.'} D:${real.doc ? '#' : '.'}`, 20, H - 20);
      ctx.fillText(`${Math.round(now - t0)}ms`, W - 82, H - 20);
      if (!sound.enabled && !prm) {
        ctx.fillStyle = PAPER + `${0.35 + 0.15 * Math.sin(now / 350)})`;
        ctx.fillText('CLICK ANYWHERE FOR SOUND', W / 2 - 90, H - 20);
      }
    }

    // ---------- acts ----------
    function drawPortrait(a: number, now: number) {
      if (!cells.length) return;
      ctx.font = `${F}px ui-monospace, Consolas, monospace`;
      ctx.textBaseline = 'top';
      // typewriter scanline: rows resolve top to bottom with a ragged edge
      const line = a * (pRows + 10) - 4;
      let locks = 0;
      for (const cell of cells) {
        const r = cell.r - pr0;
        const edge = line - r + cell.jitter * 4;
        if (edge < 0) continue;
        let ch = cell.ch;
        let alpha = 0.92;
        if (edge < 3) {
          const tick = Math.floor((now + cell.seed * 100) / 60);
          ch = RAMP[Math.floor((cell.seed * 13 + tick) % (RAMP.length - 1))];
          alpha = 0.4;
        } else locks++;
        if (ch === ' ') continue;
        ctx.fillStyle = PAPER + alpha + ')';
        ctx.fillText(ch, cell.c * cellW, cell.r * cellH);
      }
      if (locks > lockSoundGate + 120) { lockSoundGate = locks; sound.click(); }
      // spec caption under the block
      ctx.font = '10px "Sligoil Micro", monospace';
      ctx.fillStyle = PAPER + '0.45)';
      ctx.fillText(`portrait.jpg  ->  luminance ${pCols}x${pRows}`, pc0 * cellW, (pr0 + pRows) * cellH + 8);
    }

    function drawMorph(a: number, now: number) {
      if (!targets) { drawPortrait(1, now); return; }
      if (now - lastFlick > 260 && a < 0.55) {
        flick = flick === 'en' ? 'ru' : 'en';
        lastFlick = now;
        sound.click();
      }
      const lang = a >= 0.55 ? finalLang : flick;
      const tg = targets[lang];
      ctx.font = `${F}px ui-monospace, Consolas, monospace`;
      ctx.textBaseline = 'top';
      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const tt = Math.min(1, Math.max(0, (a - pt.delay) / (1 - pt.delay * 0.8)));
        const e = easeIO(tt);
        const tx = tg[i].x, ty = tg[i].y;
        const mx = (pt.x0 + tx) / 2 + pt.cx * Math.abs(tx - pt.x0);
        const my = (pt.y0 + ty) / 2 + pt.cy * Math.abs(ty - pt.y0 + 140);
        const x = (1 - e) ** 2 * pt.x0 + 2 * (1 - e) * e * mx + e ** 2 * tx;
        const y = (1 - e) ** 2 * pt.y0 + 2 * (1 - e) * e * my + e ** 2 * ty;
        ctx.fillStyle = PAPER + '0.92)';
        ctx.fillText(pt.ch, x, y);
        if (pt.tracked && e > 0.02 && e < 0.98) {
          ctx.strokeStyle = PAPER + '0.3)';
          ctx.setLineDash([3, 5]);
          ctx.beginPath();
          ctx.moveTo(pt.x0 + cellW / 2, pt.y0 + cellH / 2);
          ctx.quadraticCurveTo(mx, my, tx + cellW / 2, ty + cellH / 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = PAPER + '0.5)';
          ctx.font = '9px "Sligoil Micro", monospace';
          ctx.fillText(`x: ${Math.round(x)}  y: ${Math.round(y)}`, x + 10, y - 10);
          ctx.font = `${F}px ui-monospace, Consolas, monospace`;
        }
      }
    }

    function drawHold(a: number, now: number) {
      if (!targets) return;
      const tg = targets[finalLang];
      ctx.font = `${F}px ui-monospace, Consolas, monospace`;
      ctx.textBaseline = 'top';
      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const phase = (((i * 2654435761) % 97) / 97) * Math.PI * 2;
        const shimmer = 0.86 + 0.14 * Math.sin(now / 420 + phase);
        ctx.fillStyle = PAPER + shimmer + ')';
        ctx.fillText(pt.ch, tg[i].x, tg[i].y);
      }
      // blinking cursor block after the word
      if (Math.floor(now / 530) % 2 === 0) {
        ctx.fillStyle = PAPER + '0.92)';
        ctx.fillRect(wordBox.x + wordBox.w + cellW, wordBox.y + wordBox.h - cellH * 2.2, cellW * 1.6, cellH * 2.2);
      }
      // corner ticks around the wordmark
      const m = 14, L = 10;
      ctx.strokeStyle = PAPER + '0.5)';
      ctx.lineWidth = 1;
      const cxs = [wordBox.x - m, wordBox.x + wordBox.w + m];
      const cys = [wordBox.y - m, wordBox.y + wordBox.h + m];
      ctx.beginPath();
      for (const gx of cxs) for (const gy of cys) {
        ctx.moveTo(gx, gy + (gy === cys[0] ? L : -L)); ctx.lineTo(gx, gy);
        ctx.lineTo(gx + (gx === cxs[0] ? L : -L), gy);
      }
      ctx.stroke();
      ctx.font = '10px "Sligoil Micro", monospace';
      ctx.fillStyle = PAPER + '0.5)';
      ctx.fillText(`wordmark / ${finalLang}   x: ${Math.round(wordBox.x)}  y: ${Math.round(wordBox.y)}`,
        wordBox.x, wordBox.y + wordBox.h + m + 10);
    }

    function drawExit(a: number) {
      if (!targets) { finishFast(); return; }
      const tg = targets[finalLang];
      ctx.font = `${F}px ui-monospace, Consolas, monospace`;
      ctx.textBaseline = 'top';
      const g = 900;
      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const x = tg[i].x + pt.sx * a;
        const y = tg[i].y + pt.sy * a + 0.5 * g * a * a;
        ctx.fillStyle = PAPER + Math.max(0, 0.92 - a * 1.1) + ')';
        ctx.fillText(pt.ch, x, y);
      }
      shell.style.opacity = String(Math.max(0, 1 - a * 1.2));
    }

    function finishFast() {
      if (done) return;
      done = true;
      sound.complete();
      sound.stopLoop();
      shell.classList.add('is-done');
      document.documentElement.classList.remove('is-preloading');
      setTimeout(() => { shell.remove(); resolve(); }, 500);
    }

    // reduced motion: static final frame, out as soon as assets land
    if (prm) {
      const wait = () => {
        const now = performance.now();
        hud(ACT.morph, now);
        if (cells.length) {
          ctx.font = `${F}px ui-monospace, Consolas, monospace`;
          ctx.textBaseline = 'top';
          for (const cell of cells) {
            if (cell.ch === ' ') continue;
            ctx.fillStyle = PAPER + '0.92)';
            ctx.fillText(cell.ch, cell.c * cellW, cell.r * cellH);
          }
        }
        if (realProgress() >= 0.99 || now - t0 > 2500) finishFast();
        else requestAnimationFrame(wait);
      };
      requestAnimationFrame(wait);
      return;
    }

    sound.armAutostart();
    initSketches(document.getElementById('sketch-layer') as unknown as SVGSVGElement, () => t);

    let t = 0;
    let gateStart = 0;
    function frame(now: number) {
      if (done) return;
      const elapsed = now - t0;
      t = forcedP ?? Math.min(1, elapsed / TOTAL_MS);
      // asset gate: hold the wordmark until real loading is finished
      if (forcedP === null && t > ACT.hold && realProgress() < 0.99) {
        if (!gateStart) gateStart = now;
        if (now - gateStart < GATE_EXTRA_MS) t = ACT.hold;
      }

      hud(t, now);
      if (t < ACT.sketch) {
        // sketches own the stage; a faint hint of the grid to come
      } else if (t < ACT.portrait) {
        drawPortrait(seg(t, ACT.sketch, ACT.portrait), now);
      } else if (t < ACT.morph) {
        drawMorph(seg(t, ACT.portrait, ACT.morph), now);
      } else if (t < ACT.hold) {
        drawHold(seg(t, ACT.morph, ACT.hold), now);
      } else {
        drawExit(seg(t, ACT.hold, 1));
      }

      if (t >= 1) { finishFast(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
