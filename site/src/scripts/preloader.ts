/**
 * Preloader: canvas ASCII morph in three phases.
 *  1. 0.00-0.40  portrait resolves out of random characters
 *  2. 0.40-0.80  ink characters fly along bezier curves into the wordmark,
 *                which flickers kuixl / куиксл until it settles on browser lang
 *  3. 0.80-1.00  characters scatter, overlay fades, hero underneath
 * Background: coordinate grid with live, real loading numbers.
 * Vibe: object-tracking HUD - dashed trajectories + x/y labels on a few
 * tracked glyphs, borrowed from the reference video.
 */
import { initSketches } from './sketches';
import { sound } from './sound';

const RAMP = '@%#*+=-:. ';           // dark -> light
const INK_LIMIT = 5;                  // ramp index <= this counts as "ink"
const PAPER = '#F4F2EE';
const INK = '#0E0E0E';
const CAP_MS = 2000;                  // never block longer than this
const MIN_MS = 1800;                  // pace floor: instant assets still play the choreography
const PORTRAIT_CROP = { x: 0.47, y: 0.02, w: 0.48, h: 0.76 }; // face of portrait.jpg

type Cell = { c: number; r: number; ch: string; lockAt: number; seed: number };
type Particle = {
  x0: number; y0: number;          // px start (grid)
  cx: number; cy: number;          // bezier control offset
  ch: string;
  delay: number;                   // stagger 0..0.25
  tracked: boolean;
  sx: number; sy: number;          // scatter velocity for phase 3
};

const prm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- real progress ----------
const real = { fonts: 0, portrait: 0, doc: 0 };
const realProgress = () => real.fonts * 0.3 + real.portrait * 0.55 + real.doc * 0.15;

function trackReal(onPortrait: (img: HTMLImageElement) => void) {
  Promise.all([
    document.fonts.load('400 13px "Sligoil Micro"'),
    document.fonts.load('900 100px "Switzer"'),
  ]).then(() => (real.fonts = 1)).catch(() => (real.fonts = 1));

  if (document.readyState === 'complete') real.doc = 1;
  else addEventListener('load', () => (real.doc = 1), { once: true });

  // stream the portrait for granular progress
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
    .catch(() => (real.portrait = 1)); // missing portrait must not block
}

// ---------- helpers ----------
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** luminance grid of an image region, cols x rows, 0..1 */
function sampleImage(img: HTMLImageElement, cols: number, rows: number): number[] {
  const off = document.createElement('canvas');
  off.width = cols; off.height = rows;
  const c = off.getContext('2d', { willReadFrequently: true })!;
  const { x, y, w, h } = PORTRAIT_CROP;
  c.drawImage(img, x * img.width, y * img.height, w * img.width, h * img.height, 0, 0, cols, rows);
  const d = c.getImageData(0, 0, cols, rows).data;
  const out: number[] = new Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    const l = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
    out[i] = l / 255;
  }
  // stretch contrast so the ramp is fully used
  let lo = 1, hi = 0;
  for (const v of out) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = Math.max(0.05, hi - lo);
  return out.map((v) => (v - lo) / span);
}

/** raster a word into grid cells (true = ink) */
function rasterWord(word: string, cols: number, rows: number, cellW: number, cellH: number) {
  const off = document.createElement('canvas');
  off.width = cols; off.height = rows;
  const c = off.getContext('2d', { willReadFrequently: true })!;
  c.fillStyle = '#000'; c.fillRect(0, 0, cols, rows);
  c.fillStyle = '#fff';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  // fit the word to ~86% of grid width, aspect corrected by cell shape
  let size = rows * 0.6;
  c.font = `900 ${size}px "Switzer", sans-serif`;
  const w = c.measureText(word).width;
  size = Math.min(size, (size * (cols * 0.86)) / w);
  c.save();
  c.scale(1, cellW / cellH); // undo cell aspect so the word reads correctly
  c.font = `900 ${size}px "Switzer", sans-serif`;
  c.fillText(word, cols / 2, (rows / 2) * (cellH / cellW));
  c.restore();
  const d = c.getImageData(0, 0, cols, rows).data;
  const cells: { c: number; r: number }[] = [];
  for (let r = 0; r < rows; r++)
    for (let col = 0; col < cols; col++)
      if (d[(r * cols + col) * 4] > 128) cells.push({ c: col, r });
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

    // character grid
    const F = W < 600 ? 11 : 13;
    const cellW = Math.round(F * 0.62);
    const cellH = F;
    const cols = Math.ceil(W / cellW);
    const rows = Math.ceil(H / cellH);

    // portrait block, centered, ~68% of rows tall
    const pRows = Math.round(rows * 0.68);
    const cropAspect = (PORTRAIT_CROP.w / PORTRAIT_CROP.h) * (4 / 3); // portrait.jpg is 4:3
    const pCols = Math.min(Math.round(pRows * (cellH / cellW) * cropAspect), Math.round(cols * 0.9));
    const pc0 = Math.floor((cols - pCols) / 2);
    const pr0 = Math.floor((rows - pRows) / 2);

    let cells: Cell[] = [];
    let particles: Particle[] = [];
    let targets: { en: { x: number; y: number }[]; ru: { x: number; y: number }[] } | null = null;
    const finalLang: 'en' | 'ru' = (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';

    trackReal((img) => {
      const lum = sampleImage(img, pCols, pRows);
      cells = [];
      for (let r = 0; r < pRows; r++)
        for (let c = 0; c < pCols; c++) {
          // paper glyphs on ink: bright pixels take the dense characters
          const idx = Math.min(RAMP.length - 1, Math.floor((1 - lum[r * pCols + c]) * RAMP.length));
          cells.push({ c: pc0 + c, r: pr0 + r, ch: RAMP[idx], lockAt: Math.random() * 0.9 + 0.05, seed: Math.random() * 1000 });
        }
      buildParticles();
    });

    function buildParticles() {
      const en = rasterWord('kuixl', cols, rows, cellW, cellH);
      const ru = rasterWord('куиксл', cols, rows, cellW, cellH);
      const ink = cells.filter((c) => RAMP.indexOf(c.ch) <= INK_LIMIT);
      // sort both sides left-to-right with a vertical bias: organic sweep
      const key = (a: { c: number; r: number }) => a.c * 3 + a.r;
      ink.sort((a, b) => key(a) - key(b));
      en.sort((a, b) => key(a) - key(b));
      ru.sort((a, b) => key(a) - key(b));
      const n = Math.min(900, en.length, ink.length);
      const step = ink.length / n;
      const tEn: { x: number; y: number }[] = [];
      const tRu: { x: number; y: number }[] = [];
      particles = [];
      for (let i = 0; i < n; i++) {
        const s = ink[Math.floor(i * step)];
        const eT = en[Math.floor((i / n) * en.length)];
        const rT = ru[Math.floor((i / n) * ru.length)];
        tEn.push({ x: eT.c * cellW, y: eT.r * cellH });
        tRu.push({ x: rT.c * cellW, y: rT.r * cellH });
        const x0 = s.c * cellW, y0 = s.r * cellH;
        particles.push({
          x0, y0,
          cx: rand(-0.35, 0.35), cy: rand(-0.45, -0.1),
          ch: s.ch,
          delay: Math.random() * 0.25,
          tracked: false,
          sx: rand(-120, 120), sy: rand(-260, -60),
        });
      }
      // half a dozen tracked glyphs get HUD treatment
      for (let k = 0; k < 6; k++) particles[Math.floor(rand(0, particles.length))].tracked = true;
      targets = { en: tEn, ru: tRu };
    }

    // ---------- drawing ----------
    const t0 = performance.now();
    let flick: 'en' | 'ru' = 'en';
    let lastFlick = 0;
    let lockSoundGate = 0;
    let done = false;

    function grid(p: number, now: number) {
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(244,242,238,0.05)';
      ctx.lineWidth = 1;
      const gs = 96;
      ctx.beginPath();
      for (let x = gs; x < W; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = gs; y < H; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      ctx.font = '10px "Sligoil Micro", monospace';
      ctx.fillStyle = 'rgba(244,242,238,0.18)';
      for (let x = gs; x < W; x += gs * 2)
        for (let y = gs; y < H; y += gs * 2)
          ctx.fillText(`${x} ${y}`, x + 3, y - 3);
      // honest numbers
      const rp = Math.round(realProgress() * 100);
      ctx.fillStyle = 'rgba(244,242,238,0.6)';
      ctx.font = '11px "Sligoil Micro", monospace';
      ctx.fillText('kuixl / preload', 20, 24);
      ctx.fillText(`${String(rp).padStart(3, '0')}%`, W - 58, 24);
      ctx.fillText(`F:${real.fonts ? '#' : '.'} I:${real.portrait >= 1 ? '#' : '.'} D:${real.doc ? '#' : '.'}`, 20, H - 20);
      ctx.fillText(`${Math.round(now - t0)}ms`, W - 78, H - 20);
    }

    function drawPhase1(t: number, now: number) {
      ctx.font = `${F}px ui-monospace, Consolas, monospace`;
      ctx.textBaseline = 'top';
      let locks = 0;
      for (const cell of cells) {
        const locked = t >= cell.lockAt;
        let ch = cell.ch;
        if (!locked) {
          const tick = Math.floor((now + cell.seed * 100) / 70);
          ch = RAMP[(cell.seed * 31 + tick) % 1 ? Math.floor((cell.seed * 13 + tick) % RAMP.length) : 0];
        } else locks++;
        if (ch === ' ') continue;
        ctx.fillStyle = locked ? 'rgba(244,242,238,0.92)' : 'rgba(244,242,238,0.35)';
        ctx.fillText(ch, cell.c * cellW, cell.r * cellH);
      }
      if (locks > lockSoundGate + 40) { lockSoundGate = locks; sound.click(); }
    }

    function drawPhase2(t: number, now: number) {
      if (!targets) return;
      if (now - lastFlick > 220 && t < 0.8) {
        flick = flick === 'en' ? 'ru' : 'en';
        lastFlick = now;
      }
      const lang = t >= 0.8 ? finalLang : flick;
      const tg = targets[lang];
      ctx.font = `${F}px ui-monospace, Consolas, monospace`;
      ctx.textBaseline = 'top';
      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const tt = Math.min(1, Math.max(0, (t - pt.delay) / (1 - pt.delay)));
        const e = ease(tt);
        const tx = tg[i].x, ty = tg[i].y;
        const mx = (pt.x0 + tx) / 2 + pt.cx * Math.abs(tx - pt.x0);
        const my = (pt.y0 + ty) / 2 + pt.cy * Math.abs(ty - pt.y0 + 120);
        const x = (1 - e) ** 2 * pt.x0 + 2 * (1 - e) * e * mx + e ** 2 * tx;
        const y = (1 - e) ** 2 * pt.y0 + 2 * (1 - e) * e * my + e ** 2 * ty;
        ctx.fillStyle = 'rgba(244,242,238,0.92)';
        ctx.fillText(pt.ch, x, y);
        if (pt.tracked && e > 0.02 && e < 0.98) {
          ctx.strokeStyle = 'rgba(244,242,238,0.3)';
          ctx.setLineDash([3, 5]);
          ctx.beginPath();
          ctx.moveTo(pt.x0 + cellW / 2, pt.y0 + cellH / 2);
          ctx.quadraticCurveTo(mx, my, tx + cellW / 2, ty + cellH / 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(244,242,238,0.5)';
          ctx.font = '9px "Sligoil Micro", monospace';
          ctx.fillText(`x: ${Math.round(x)}  y: ${Math.round(y)}`, x + 10, y - 10);
          ctx.font = `${F}px ui-monospace, Consolas, monospace`;
        }
      }
    }

    function drawPhase3(t: number) {
      if (!targets) return;
      const tg = targets[finalLang];
      ctx.font = `${F}px ui-monospace, Consolas, monospace`;
      ctx.textBaseline = 'top';
      const g = 900;
      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const x = tg[i].x + pt.sx * t;
        const y = tg[i].y + pt.sy * t + 0.5 * g * t * t;
        ctx.fillStyle = `rgba(244,242,238,${Math.max(0, 0.92 - t * 1.1)})`;
        ctx.fillText(pt.ch, x, y);
      }
      shell.style.opacity = String(Math.max(0, 1 - t * 1.25));
    }

    function finish() {
      if (done) return;
      done = true;
      sound.complete();
      sound.stopLoop();
      shell.classList.add('is-done');
      document.documentElement.classList.remove('is-preloading');
      setTimeout(() => { shell.remove(); resolve(); }, 500);
    }

    // reduced motion: one static frame, out as soon as assets land
    if (prm) {
      const wait = () => {
        const now = performance.now();
        grid(1, now);
        if (cells.length) {
          ctx.font = `${F}px ui-monospace, Consolas, monospace`;
          ctx.textBaseline = 'top';
          for (const cell of cells) {
            if (cell.ch === ' ') continue;
            ctx.fillStyle = 'rgba(244,242,238,0.92)';
            ctx.fillText(cell.ch, cell.c * cellW, cell.r * cellH);
          }
        }
        if (realProgress() >= 0.99 || now - t0 > CAP_MS) finish();
        else requestAnimationFrame(wait);
      };
      requestAnimationFrame(wait);
      return;
    }

    initSketches(document.getElementById('sketch-layer') as unknown as SVGSVGElement, () => displayed);

    let displayed = 0;
    function frame(now: number) {
      if (done) return;
      const elapsed = now - t0;
      const timeP = Math.min(1, elapsed / CAP_MS);
      // paced by MIN_MS so instant loads still show the morph,
      // capped by CAP_MS so slow loads never hold the page hostage
      displayed = forcedP ?? Math.min(elapsed / MIN_MS, Math.max(realProgress(), timeP));
      // do not enter phase 2 before the portrait exists - but never past the cap
      if (!cells.length && elapsed < CAP_MS) displayed = Math.min(displayed, 0.38);

      grid(displayed, now);
      if (displayed < 0.4) drawPhase1(displayed / 0.4, now);
      else if (displayed < 0.8) drawPhase2((displayed - 0.4) / 0.4, now);
      else drawPhase3((displayed - 0.8) / 0.2);

      if (displayed >= 1) { finish(); return; }
      if (forcedP === null || displayed < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
