/**
 * Preloader: a staged title sequence built from the site's own ASCII art.
 *
 *   act 00  INVITE    waits for a gesture (up to INVITE_MAX), then starts.
 *                     The gesture is what lets sound play at all - browsers
 *                     block audio until one happens. No gesture, no sound,
 *                     but the sequence still runs so nobody gets trapped.
 *   act 01  DRAW      first drawing resolves in a typewriter scanline
 *   act 02  MORPH A   its glyphs fly along bezier curves into the second
 *   act 03  MORPH B   and again into the third
 *   act 04  GATHER    everything converges into the shape of the wordmark
 *   act 05  FOCUS     ASCII dissolves and the real Switzer 900 kuixl resolves
 *                     underneath it, then the overlay lifts
 *
 * Runs once per session, on the home page only, and any click / scroll / key /
 * Esc skips straight to the end. The HUD numbers are real asset progress; the
 * choreography is on its own clock.
 */
import { initSketches } from './sketches';
import { sound } from './sound';

const RUN_MS = 4500;
const INVITE_MAX = 1500;
const SESSION_KEY = 'kuixl:preloaded';
const PAPER = 'rgba(244,242,238,';

/** sparse glyphs promoted one step up the ramp when they form the wordmark */
const DENSER: Record<string, string> = { '.': '+', ':': '#', '-': '#', '=': '@', '+': '@' };

const ACT = { draw: 0.26, morphA: 0.46, morphB: 0.66, gather: 0.86 };
const ACT_NAMES: [number, string][] = [
  [0, '01 DRAW'], [ACT.draw, '02 MORPH'], [ACT.morphA, '03 MORPH'],
  [ACT.morphB, '04 GATHER'], [ACT.gather, '05 FOCUS'],
];

type Cell = { c: number; r: number; ch: string };
type Node = { ch: string; x: number; y: number };

/**
 * `?replay` forces the full sequence: it ignores the once-per-session flag and
 * overrides reduced motion. Asking for it by hand is explicit consent, unlike
 * the ambient OS setting - and without it nobody whose system has animations
 * switched off can ever see this thing, including its author.
 */
const FORCED = new URLSearchParams(location.search).has('replay');
const prm = !FORCED && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Order glyphs the way a pen would travel: a greedy nearest-neighbour chain
 * from the top-left of the drawing, jumping to the nearest unvisited glyph when
 * a stroke runs out. Returns each glyph's 0..1 position along that path.
 *
 * Ordering by distance from the centre was tried first and does not work on
 * outline art - almost every glyph sits at roughly the same radius, so the
 * drawing stays empty and then arrives all at once. A traversal follows the
 * strokes themselves, which is what reads as drawing.
 *
 * Buckets keep the search local; a plain scan is O(n^2) and n runs past 2000.
 */
function penPath(nodes: Node[]): number[] {
  const n = nodes.length;
  if (!n) return [];
  const CELL = 48;
  const key = (x: number, y: number) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
  const buckets = new Map<string, number[]>();
  nodes.forEach((p, i) => {
    const k = key(p.x, p.y);
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(i);
  });

  const done = new Uint8Array(n);
  const order = new Array<number>(n);
  let cur = 0;
  for (let i = 1; i < n; i++)
    if (nodes[i].y < nodes[cur].y || (nodes[i].y === nodes[cur].y && nodes[i].x < nodes[cur].x)) cur = i;

  for (let step = 0; step < n; step++) {
    done[cur] = 1;
    order[cur] = step / (n - 1 || 1);
    if (step === n - 1) break;

    // widen the search ring until an unvisited glyph turns up
    const cx = Math.floor(nodes[cur].x / CELL), cy = Math.floor(nodes[cur].y / CELL);
    let best = -1, bestD = Infinity;
    for (let ring = 0; ring < 40 && best < 0; ring++) {
      for (let gx = cx - ring; gx <= cx + ring; gx++)
        for (let gy = cy - ring; gy <= cy + ring; gy++) {
          if (ring > 0 && Math.abs(gx - cx) !== ring && Math.abs(gy - cy) !== ring) continue;
          for (const i of buckets.get(`${gx},${gy}`) ?? []) {
            if (done[i]) continue;
            const d = (nodes[i].x - nodes[cur].x) ** 2 + (nodes[i].y - nodes[cur].y) ** 2;
            if (d < bestD) { bestD = d; best = i; }
          }
        }
    }
    if (best < 0) { for (let i = 0; i < n; i++) if (!done[i]) { best = i; break; } }
    if (best < 0) break;
    cur = best;
  }
  return order;
}

const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const seg = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

// ---------- real progress, for honest HUD numbers ----------
const real = { fonts: 0, art: 0, doc: 0 };
const realProgress = () => real.fonts * 0.35 + real.art * 0.45 + real.doc * 0.2;

function parseArt(text: string): Cell[] {
  const lines = text.split('\n');
  const cells: Cell[] = [];
  lines.forEach((line, r) => {
    for (let c = 0; c < line.length; c++) if (line[c] !== ' ') cells.push({ c, r, ch: line[c] });
  });
  return cells;
}

/**
 * Three drawings per visit, drawn at random from the whole set so a repeat
 * visit is a different show. Fisher-Yates, not `sort(() => Math.random()-0.5)`:
 * a random comparator is not a shuffle and leaves the original order visible.
 */
async function loadArts(): Promise<Cell[][]> {
  const manifest: { name: string }[] = await fetch('/art/art.json').then((r) => r.json());
  const pool = [...manifest];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const pick = pool.slice(0, 3);
  const texts = await Promise.all(pick.map((m) => fetch(`/art/${m.name}.txt`).then((r) => r.text())));
  return texts.map(parseArt);
}

export function initPreloader(): Promise<void> {
  return new Promise((resolve) => {
    const shell = document.getElementById('preloader');
    const canvas = document.getElementById('ascii-canvas') as HTMLCanvasElement | null;
    const invite = document.getElementById('preload-invite');
    const wordmark = document.getElementById('preload-wordmark');

    const done = () => {
      document.documentElement.classList.remove('is-preloading');
      shell?.remove();
      resolve();
    };

    // home page only, once per session
    if (!shell || !canvas || (!FORCED && sessionStorage.getItem(SESSION_KEY))) { done(); return; }
    sessionStorage.setItem(SESSION_KEY, '1');

    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = innerWidth, H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const params = new URLSearchParams(location.search);
    const forcedP = params.has('p') ? +params.get('p')! : null;

    // ---------- assets ----------
    Promise.all([
      document.fonts.load('400 13px "Sligoil Micro"'),
      document.fonts.load('900 120px "Switzer"'),
    ]).then(() => (real.fonts = 1)).catch(() => (real.fonts = 1));

    if (document.readyState === 'complete') real.doc = 1;
    else addEventListener('load', () => (real.doc = 1), { once: true });

    let arts: Cell[][] = [];
    let cellW = 12, cellH = 20, F = 18;
    let originX = 0, originY = 0;
    let nodes: Node[][] = [];      // one node list per stage, all the same length
    let stageF: number[] = [];     // glyph size per stage; each is scaled to fit
    let ctrl: { cx: number; cy: number }[] = [];
    let scatter: { sx: number; sy: number }[] = [];
    let tracked: number[] = [];
    let drawOrder: number[] = [];  // per-glyph 0..1 position in the draw-on
    const EDGE = 0.08;             // width of the unsettled working edge
    let wordBox = { x: 0, y: 0, w: 0, h: 0 };

    /** raster `kuixl` into the same grid so the swarm can spell it */
    function rasterWord(cols: number, rows: number): { c: number; r: number }[] {
      const off = document.createElement('canvas');
      off.width = cols; off.height = rows;
      const c = off.getContext('2d', { willReadFrequently: true })!;
      c.fillStyle = '#000'; c.fillRect(0, 0, cols, rows);
      c.fillStyle = '#fff';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      let size = rows * 0.9;
      c.font = `900 ${size}px "Switzer", sans-serif`;
      const measured = c.measureText('kuixl').width;
      size = Math.min(size, (size * cols * 0.82) / measured);
      c.save();
      c.scale(1, cellW / cellH);
      c.font = `900 ${size}px "Switzer", sans-serif`;
      c.fillText('kuixl', cols / 2, (rows / 2) * (cellH / cellW));
      c.restore();
      const d = c.getImageData(0, 0, cols, rows).data;
      const out: { c: number; r: number }[] = [];
      for (let r = 0; r < rows; r++)
        for (let col = 0; col < cols; col++)
          if (d[(r * cols + col) * 4] > 128) out.push({ c: col, r });
      return out;
    }

    /**
     * Fit one stage's grid coordinates into the viewport. Every stage is scaled
     * on its own bounding box: a shared scale would let the tallest drawing in
     * the set shrink all the others, which is how the first pass ended up with
     * art occupying a third of the screen.
     */
    function place(cells: Cell[], fillW: number, fillH: number) {
      const minC = Math.min(...cells.map((c) => c.c));
      const maxC = Math.max(...cells.map((c) => c.c));
      const minR = Math.min(...cells.map((c) => c.r));
      const maxR = Math.max(...cells.map((c) => c.r));
      const cols = maxC - minC + 1;
      const rows = maxR - minR + 1;
      const cw = Math.min((W * fillW) / cols, (H * fillH) / rows / 1.9);
      const ch = cw * 1.9;
      const ox = (W - cols * cw) / 2 - minC * cw;
      const oy = (H - rows * ch) / 2 - minR * ch;
      return {
        cw, ch, f: Math.max(6, Math.round(ch * 0.95)),
        box: { x: ox + minC * cw, y: oy + minR * ch, w: cols * cw, h: rows * ch },
        toX: (c: number) => ox + c * cw,
        toY: (r: number) => oy + r * ch,
      };
    }

    function build(loaded: Cell[][]) {
      arts = loaded;
      // raster the wordmark on a generous grid; `place` handles the sizing
      const word = rasterWord(150, 80).map((p) => ({ ...p, ch: '#' }));

      const order = (a: { c: number; r: number }) => a.c * 3 + a.r; // organic sweep
      const stages = [...arts.map((a) => [...a]), word].map((s) =>
        s.sort((x, y) => order(x) - order(y))
      );
      // Never sample a drawing down: dropping cells punches holes along the
      // sort order and the outline stops reading. Size the swarm to the largest
      // stage instead - stages with fewer cells repeat theirs, and a slightly
      // thickened stroke costs far less than a broken one.
      const n = Math.min(3200, Math.max(...stages.map((s) => s.length)));

      nodes = [];
      stageF = [];
      stages.forEach((st, si) => {
        const isWord = si === stages.length - 1;
        // sources are trimmed to the drawing now, so they can be pushed close
        // to the edges without a margin of empty canvas coming along
        const p = place(st, isWord ? 0.64 : 0.88, isWord ? 0.34 : 0.84);
        const step = st.length / n;
        const used = new Map<number, number>();
        nodes.push(
          Array.from({ length: n }, (_, i) => {
            const k = Math.min(st.length - 1, Math.floor(i * step));
            const s = st[k];
            // a drawing with fewer cells than the swarm reuses them; nudging
            // repeats inside their cell keeps them from stacking exactly
            const dup = used.get(k) ?? 0;
            used.set(k, dup + 1);
            const jx = dup ? ((dup * 0.37) % 1 - 0.5) * p.cw : 0;
            const jy = dup ? ((dup * 0.61) % 1 - 0.5) * p.ch : 0;
            // the word keeps the drawing's glyphs so the swarm stays itself,
            // but the sparsest characters are promoted or the strokes vanish
            const ch = isWord ? DENSER[nodes[0][i].ch] ?? nodes[0][i].ch : s.ch;
            return { ch, x: p.toX(s.c) + jx, y: p.toY(s.r) + jy };
          })
        );
        stageF.push(p.f);
        if (si === 0) { cellW = p.cw; cellH = p.ch; F = p.f; originX = p.box.x; originY = p.box.y; }
        if (isWord) wordBox = p.box;
      });

      drawOrder = penPath(nodes[0]);

      ctrl = Array.from({ length: n }, () => ({ cx: rand(-0.3, 0.3), cy: rand(-0.45, -0.1) }));
      scatter = Array.from({ length: n }, () => ({ sx: rand(-120, 120), sy: rand(-220, -40) }));
      tracked = Array.from({ length: 5 }, () => Math.floor(rand(0, n)));
      real.art = 1;
    }

    // Do not swallow build errors: a silent catch here once turned a crash in
    // build() into a blank screen with a clean console.
    loadArts()
      .then(build)
      .catch((e) => {
        real.art = 1;
        console.error('[preloader] art stage failed', e);
      });

    // ---------- HUD ----------
    function hud(t: number, now: number, startedAt: number) {
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
      ctx.fillStyle = PAPER + '0.14)';
      for (let x = gs; x < W; x += gs * 2)
        for (let y = gs; y < H; y += gs * 2) ctx.fillText(`${x} ${y}`, x + 3, y - 3);

      const act = ACT_NAMES.filter(([a]) => t >= a).pop()![1];
      ctx.fillStyle = PAPER + '0.6)';
      ctx.font = '11px "Sligoil Micro", monospace';
      ctx.fillText(`kuixl / preload / ${act}`, 20, 24);
      ctx.fillText(`${String(Math.round(realProgress() * 100)).padStart(3, '0')}%`, W - 58, 24);
      ctx.fillText(`F:${real.fonts ? '#' : '.'} A:${real.art ? '#' : '.'} D:${real.doc ? '#' : '.'}`, 20, H - 20);
      ctx.fillText(`${Math.round(now - startedAt)}ms`, W - 82, H - 20);
    }

    // ---------- acts ----------
    /**
     * The drawing draws itself. A plain top-to-bottom scanline reads as a
     * window shade coming down; a hand builds a shape outward from where it
     * started. Glyphs are ordered by distance from the drawing's centre, so the
     * subject grows from the middle out, with a live edge that settles behind
     * the front.
     */
    function drawStage(a: number, now: number) {
      const st = nodes[0];
      if (!st || !drawOrder.length) return;
      ctx.font = `${F}px ui-monospace, Consolas, monospace`;
      ctx.textBaseline = 'top';
      const front = a * (1 + EDGE) - EDGE;
      for (let i = 0; i < st.length; i++) {
        const at = drawOrder[i];            // 0..1, when this glyph is reached
        if (at > front + EDGE) continue;
        const nd = st[i];
        if (at > front) {
          // the working edge: unsettled characters, flickering
          ctx.fillStyle = PAPER + '0.3)';
          ctx.fillText('.:-=' [Math.floor(now / 60 + i) % 4], nd.x, nd.y);
        } else {
          ctx.fillStyle = PAPER + '0.92)';
          ctx.fillText(nd.ch, nd.x, nd.y);
        }
      }
    }

    function morph(from: Node[], to: Node[], a: number, showTracks: boolean, fi = 0, ti = 1) {
      if (!from || !to) return;
      // glyphs grow or shrink into the next stage's scale as they travel
      const size = Math.round(stageF[fi] + (stageF[ti] - stageF[fi]) * a);
      ctx.font = `${size}px ui-monospace, Consolas, monospace`;
      ctx.textBaseline = 'top';
      for (let i = 0; i < from.length; i++) {
        const delay = (i / from.length) * 0.22;
        const e = easeIO(Math.min(1, Math.max(0, (a - delay) / (1 - 0.22))));
        const f = from[i], tg = to[i], k = ctrl[i];
        const mx = (f.x + tg.x) / 2 + k.cx * Math.abs(tg.x - f.x);
        const my = (f.y + tg.y) / 2 + k.cy * Math.abs(tg.y - f.y + 120);
        const x = (1 - e) ** 2 * f.x + 2 * (1 - e) * e * mx + e ** 2 * tg.x;
        const y = (1 - e) ** 2 * f.y + 2 * (1 - e) * e * my + e ** 2 * tg.y;
        ctx.fillStyle = PAPER + '0.9)';
        ctx.fillText(e < 0.5 ? f.ch : tg.ch, x, y);

        if (showTracks && tracked.includes(i) && e > 0.03 && e < 0.97) {
          ctx.strokeStyle = PAPER + '0.28)';
          ctx.setLineDash([3, 5]);
          ctx.beginPath();
          ctx.moveTo(f.x + cellW / 2, f.y + cellH / 2);
          ctx.quadraticCurveTo(mx, my, tg.x + cellW / 2, tg.y + cellH / 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = PAPER + '0.5)';
          ctx.font = '9px "Sligoil Micro", monospace';
          ctx.fillText(`x: ${Math.round(x)}  y: ${Math.round(y)}`, x + 10, y - 10);
          ctx.font = `${size}px ui-monospace, Consolas, monospace`;
        }
      }
    }

    /** ASCII wordmark dissolves while the real type resolves in its place */
    function focus(a: number) {
      const st = nodes[3];
      if (!st) return;
      ctx.font = `${stageF[3]}px ui-monospace, Consolas, monospace`;
      ctx.textBaseline = 'top';
      for (let i = 0; i < st.length; i++) {
        const s = scatter[i];
        const x = st[i].x + s.sx * a * a;
        const y = st[i].y + s.sy * a * a;
        ctx.fillStyle = PAPER + Math.max(0, 0.9 - a * 1.6) + ')';
        ctx.fillText(st[i].ch, x, y);
      }
      if (wordmark) {
        wordmark.style.opacity = String(Math.min(1, a * 2.2));
        wordmark.style.transform = `translate(-50%,-50%) scale(${1.06 - 0.06 * Math.min(1, a * 2)})`;
        wordmark.style.filter = `blur(${Math.max(0, 6 - a * 14)}px)`;
      }
      if (shell && a > 0.72) shell.style.opacity = String(Math.max(0, 1 - (a - 0.72) / 0.28));
    }

    // ---------- run ----------
    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      sound.complete();
      sound.stopLoop();
      shell!.style.opacity = '0';
      setTimeout(done, 420);
    }

    if (prm) {
      // Static frame - but held briefly. Reduced motion means no movement, not
      // a 200ms flash of something unreadable; a title card that is gone before
      // it can be read is worse than no title card.
      const STATIC_MS = 900;
      const started = performance.now();
      const wait = () => {
        hud(ACT.morphB, performance.now(), started);
        if (nodes[0]) {
          ctx.font = `${F}px ui-monospace, Consolas, monospace`;
          ctx.textBaseline = 'top';
          ctx.fillStyle = PAPER + '0.9)';
          for (const nd of nodes[0]) ctx.fillText(nd.ch, nd.x, nd.y);
        }
        if (realProgress() >= 0.99 && performance.now() - started > STATIC_MS) finish();
        else requestAnimationFrame(wait);
      };
      invite?.remove();
      requestAnimationFrame(wait);
      return;
    }

    let startedAt = 0;
    const skip = () => finish();

    function begin(withSound: boolean) {
      if (startedAt) return;
      startedAt = performance.now();
      invite?.classList.add('is-gone');
      if (withSound) sound.enable();
      initSketches(document.getElementById('sketch-layer') as unknown as SVGSVGElement, () => t);
      // from here on, any gesture skips instead of starting
      setTimeout(() => {
        addEventListener('pointerdown', skip, { once: true });
        addEventListener('wheel', skip, { once: true, passive: true });
        addEventListener('keydown', skip, { once: true });
      }, 400);
      requestAnimationFrame(frame);
    }

    const gesture = () => begin(true);
    addEventListener('pointerdown', gesture, { once: true });
    addEventListener('keydown', gesture, { once: true });
    addEventListener('wheel', gesture, { once: true, passive: true });
    addEventListener('touchstart', gesture, { once: true, passive: true });
    // nobody is obliged to click: start silently rather than hold the page
    setTimeout(() => begin(false), INVITE_MAX);

    let t = 0;
    function frame(now: number) {
      if (finished) return;
      t = forcedP ?? Math.min(1, (now - startedAt) / RUN_MS);
      hud(t, now, startedAt);

      if (!nodes.length) {
        // art still loading - hold on the grid rather than show a broken stage
        if (t > ACT.draw) startedAt = now - ACT.draw * RUN_MS;
      } else if (t < ACT.draw) {
        drawStage(seg(t, 0, ACT.draw), now);
      } else if (t < ACT.morphA) {
        morph(nodes[0], nodes[1], seg(t, ACT.draw, ACT.morphA), true, 0, 1);
      } else if (t < ACT.morphB) {
        morph(nodes[1], nodes[2], seg(t, ACT.morphA, ACT.morphB), true, 1, 2);
      } else if (t < ACT.gather) {
        morph(nodes[2], nodes[3], seg(t, ACT.morphB, ACT.gather), false, 2, 3);
      } else {
        focus(seg(t, ACT.gather, 1));
      }

      if (t >= 1) { finish(); return; }
      requestAnimationFrame(frame);
    }
  });
}
