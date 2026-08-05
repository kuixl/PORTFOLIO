/**
 * Margin doodles for the preloader: quick pencil scribbles that pop up along
 * the edges, live a moment, disappear. Hand-jittered SVG, no vector polish.
 * Preloader only - the site itself never shows these.
 */
import { sound } from './sound';

const NS = 'http://www.w3.org/2000/svg';
const PAPER = '#F4F2EE';
const prm = matchMedia('(prefers-reduced-motion: reduce)').matches;

const j = (v: number, amp = 2.2) => v + (Math.random() - 0.5) * amp * 2;

/** polyline through jittered points */
function path(pts: [number, number][], close = false): SVGPathElement {
  const p = document.createElementNS(NS, 'path');
  let d = `M ${j(pts[0][0])} ${j(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${j(pts[i][0])} ${j(pts[i][1])}`;
  if (close) d += ' Z';
  p.setAttribute('d', d);
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', PAPER);
  p.setAttribute('stroke-width', String(1.5 + Math.random() * 0.5));
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  return p;
}

/** wobbly circle as a many-point polygon, never quite closed */
function blob(cx: number, cy: number, r: number): SVGPathElement {
  const pts: [number, number][] = [];
  const n = 11;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rr = r * (1 + (Math.random() - 0.5) * 0.16);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  pts.pop(); // leave the gap - hand never closes the loop
  return path(pts);
}

function scribbleText(txt: string, size = 16): SVGGElement {
  const g = document.createElementNS(NS, 'g');
  const t = document.createElementNS(NS, 'text');
  t.setAttribute('font-family', '"Sligoil Micro", monospace');
  t.setAttribute('font-size', String(size));
  t.setAttribute('fill', PAPER);
  let x = 0;
  for (const ch of txt) {
    const span = document.createElementNS(NS, 'tspan');
    span.textContent = ch;
    span.setAttribute('x', String(x));
    span.setAttribute('y', String(j(0, 1.6)));
    span.setAttribute('rotate', String((Math.random() - 0.5) * 14));
    x += size * 0.62;
    t.appendChild(span);
  }
  g.appendChild(t);
  return g;
}

// ---- original doodle faces: a couple of strokes each, drawn fresh every time
function face1(): SVGGElement {
  const g = document.createElementNS(NS, 'g');
  g.appendChild(blob(20, 22, 17));                                  // head
  g.appendChild(path([[8, 10], [14, 16]]));                         // bangs
  g.appendChild(path([[16, 7], [19, 15]]));
  g.appendChild(path([[26, 7], [25, 15]]));
  g.appendChild(path([[14, 24], [15.5, 24.5]]));                    // dot eyes
  g.appendChild(path([[26, 24], [27.5, 24.5]]));
  g.appendChild(path([[18, 31], [23, 32]]));                        // mouth
  return g;
}
function face2(): SVGGElement {
  const g = document.createElementNS(NS, 'g');
  g.appendChild(blob(20, 20, 15));
  g.appendChild(path([[10, 9], [30, 7]]));                          // flat fringe
  g.appendChild(path([[13, 20], [17, 17]]));                        // ^ ^ eyes
  g.appendChild(path([[17, 17], [20, 20]]));
  g.appendChild(path([[24, 20], [27, 17]]));
  g.appendChild(path([[27, 17], [30, 20]]));
  g.appendChild(path([[17, 28], [24, 28]]));
  return g;
}

// ---- UI doodles
function placeholderBox(): SVGGElement {
  const g = document.createElementNS(NS, 'g');
  g.appendChild(path([[0, 0], [46, 1], [45, 30], [1, 29]], true));
  g.appendChild(path([[1, 1], [45, 29]]));
  g.appendChild(path([[45, 1], [1, 29]]));
  return g;
}
function arrow(): SVGGElement {
  const g = document.createElementNS(NS, 'g');
  g.appendChild(path([[0, 14], [40, 12]]));
  g.appendChild(path([[31, 4], [40, 12]]));
  g.appendChild(path([[32, 21], [40, 12]]));
  return g;
}
function textLines(): SVGGElement {
  const g = document.createElementNS(NS, 'g');
  g.appendChild(path([[0, 0], [42, 1]]));
  g.appendChild(path([[0, 8], [38, 8.5]]));
  g.appendChild(path([[0, 16], [27, 16]]));
  return g;
}
function circleDot(): SVGGElement {
  const g = document.createElementNS(NS, 'g');
  g.appendChild(blob(14, 14, 12));
  g.appendChild(path([[13, 13.5], [15, 14.5]]));
  return g;
}

const POOL: (() => SVGGElement)[] = [
  () => scribbleText('shq'),
  () => scribbleText('kevin'),
  () => scribbleText('kuixl'),
  () => scribbleText('qq!'),
  () => scribbleText('welcome'),
  () => scribbleText('work work work', 13),
  () => scribbleText('$', 22),
  () => scribbleText('i need money to exist', 12),
  () => scribbleText('^_^', 15),
  () => scribbleText('☆*:.｡. o(≧▽≦)o .｡.:*☆', 11),
  face1, face2,
  placeholderBox, arrow, textLines, circleDot,
];

/** edge slots: everywhere except the busy center */
function slot(w: number, h: number): [number, number] {
  const m = 24;
  const band = Math.random();
  if (band < 0.3) return [m + Math.random() * (w - 200), m + Math.random() * (h * 0.12)];            // top
  if (band < 0.6) return [m + Math.random() * (w - 200), h * 0.84 + Math.random() * (h * 0.1)];      // bottom
  if (band < 0.8) return [m + Math.random() * (w * 0.1), h * 0.18 + Math.random() * (h * 0.6)];      // left
  return [w * 0.86 + Math.random() * (w * 0.08), h * 0.18 + Math.random() * (h * 0.6)];              // right
}

export function initSketches(svg: SVGSVGElement, progress: () => number) {
  if (prm) return;
  const W = innerWidth, H = innerHeight;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let active = 0;
  let stopped = false;

  function spawn() {
    if (stopped || progress() > 0.88) return;
    if (active < 2) {
      active++;
      const g = POOL[Math.floor(Math.random() * POOL.length)]();
      const [x, y] = slot(W, H);
      g.setAttribute('transform', `translate(${x} ${y}) rotate(${(Math.random() - 0.5) * 14})`);
      g.setAttribute('opacity', '0');
      svg.appendChild(g);
      sound.sketch();
      const alpha = 0.4 + Math.random() * 0.3;
      const life = 1200 + Math.random() * 800;
      g.animate([{ opacity: 0 }, { opacity: alpha }], { duration: 140, fill: 'forwards' });
      setTimeout(() => {
        g.animate([{ opacity: alpha }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
        setTimeout(() => { g.remove(); active--; }, 240);
      }, life);
    }
    setTimeout(spawn, 420 + Math.random() * 520);
  }
  setTimeout(spawn, 350);

  return () => { stopped = true; };
}
