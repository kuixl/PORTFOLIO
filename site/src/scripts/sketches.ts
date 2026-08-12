/**
 * Margin doodles for the preloader. Each one DRAWS ITSELF stroke by stroke
 * (dashoffset animation), lives a few seconds, fades. Hand-jittered paths,
 * fresh randomness on every spawn - no vector polish. Preloader only.
 */
import { sound } from './sound';
import { reducedMotion } from './motionPref';

const NS = 'http://www.w3.org/2000/svg';
const PAPER = '#F4F2EE';
const prm = reducedMotion();

const j = (v: number, amp = 2.2) => v + (Math.random() - 0.5) * amp * 2;

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

function blob(cx: number, cy: number, r: number): SVGPathElement {
  const pts: [number, number][] = [];
  const n = 11;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rr = r * (1 + (Math.random() - 0.5) * 0.16);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  pts.pop(); // the hand never quite closes the loop
  return path(pts);
}

/** text as individual glyphs so they can appear one by one */
function scribbleText(txt: string, size = 16): SVGGElement {
  const g = document.createElementNS(NS, 'g');
  g.dataset.kind = 'text';
  let x = 0;
  for (const ch of txt) {
    const t = document.createElementNS(NS, 'text');
    t.textContent = ch;
    t.setAttribute('font-family', '"Sligoil Micro", monospace');
    t.setAttribute('font-size', String(size));
    t.setAttribute('fill', PAPER);
    t.setAttribute('x', String(x));
    t.setAttribute('y', String(j(0, 1.6)));
    t.setAttribute('transform', `rotate(${(Math.random() - 0.5) * 10} ${x} 0)`);
    x += size * 0.62;
    g.appendChild(t);
  }
  return g;
}

// ---- original doodle faces, a few strokes each
function face1(): SVGGElement {
  const g = document.createElementNS(NS, 'g');
  g.appendChild(blob(20, 22, 17));                     // head
  g.appendChild(path([[8, 10], [14, 16]]));            // bangs
  g.appendChild(path([[16, 7], [19, 15]]));
  g.appendChild(path([[26, 7], [25, 15]]));
  g.appendChild(path([[14, 24], [15.5, 24.5]]));       // dot eyes
  g.appendChild(path([[26, 24], [27.5, 24.5]]));
  g.appendChild(path([[18, 31], [23, 32]]));           // mouth
  return g;
}
function face2(): SVGGElement {
  const g = document.createElementNS(NS, 'g');
  g.appendChild(blob(20, 20, 15));
  g.appendChild(path([[10, 9], [30, 7]]));             // flat fringe
  g.appendChild(path([[13, 20], [17, 17]]));           // ^ ^ eyes
  g.appendChild(path([[17, 17], [20, 20]]));
  g.appendChild(path([[24, 20], [27, 17]]));
  g.appendChild(path([[27, 17], [30, 20]]));
  g.appendChild(path([[17, 28], [24, 28]]));
  return g;
}
function face3(): SVGGElement {
  // cat-ish: ears, closed happy eyes, tiny w-mouth, whisker ticks
  const g = document.createElementNS(NS, 'g');
  g.appendChild(blob(22, 24, 16));
  g.appendChild(path([[10, 12], [7, 2], [17, 9]]));    // left ear
  g.appendChild(path([[28, 9], [37, 2], [34, 12]]));   // right ear
  g.appendChild(path([[14, 23], [17, 21], [20, 23]])); // closed eye
  g.appendChild(path([[25, 23], [28, 21], [31, 23]]));
  g.appendChild(path([[19, 30], [21, 32], [23, 30], [25, 32], [27, 30]])); // w
  g.appendChild(path([[2, 26], [8, 27]]));             // whiskers
  g.appendChild(path([[36, 27], [42, 26]]));
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

// faces carry triple weight - they are the heart of the bit
const POOL: (() => SVGGElement)[] = [
  face1, face1, face1, face2, face2, face2, face3, face3, face3,
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
  placeholderBox, arrow, textLines, circleDot,
];

function slot(w: number, h: number): [number, number] {
  const m = 32;
  const band = Math.random();
  if (band < 0.3) return [m + Math.random() * (w - 320), m + Math.random() * (h * 0.1)];
  if (band < 0.6) return [m + Math.random() * (w - 320), h * 0.82 + Math.random() * (h * 0.08)];
  if (band < 0.8) return [m + Math.random() * (w * 0.09), h * 0.16 + Math.random() * (h * 0.6)];
  return [w * 0.84 + Math.random() * (w * 0.07), h * 0.16 + Math.random() * (h * 0.6)];
}

export function initSketches(svg: SVGSVGElement, progress: () => number) {
  if (prm) return;
  const W = innerWidth, H = innerHeight;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let active = 0;
  let stopped = false;

  function spawn() {
    if (stopped || progress() > 0.9) return;
    if (active < 3) {
      active++;
      const g = POOL[Math.floor(Math.random() * POOL.length)]();
      const [x, y] = slot(W, H);
      const scale = 1.6 + Math.random() * 0.8;
      g.setAttribute('transform',
        `translate(${x} ${y}) rotate(${(Math.random() - 0.5) * 14}) scale(${scale})`);
      svg.appendChild(g);
      sound.sketch();

      const alpha = 0.45 + Math.random() * 0.25;
      const kids = Array.from(g.children) as SVGGraphicsElement[];
      if (g.dataset.kind === 'text') {
        // glyphs pop in one after another, like quick handwriting
        kids.forEach((el, i) => {
          (el as SVGElement).setAttribute('opacity', '0');
          el.animate([{ opacity: 0 }, { opacity: alpha }],
            { duration: 60, delay: i * 55, fill: 'forwards' });
        });
      } else {
        // strokes draw themselves in sequence
        kids.forEach((el, i) => {
          const p = el as SVGPathElement;
          const len = p.getTotalLength();
          p.setAttribute('stroke-dasharray', String(len));
          p.setAttribute('stroke-dashoffset', String(len));
          p.setAttribute('opacity', String(alpha));
          p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
            { duration: 240, delay: i * 130, fill: 'forwards', easing: 'ease-out' });
        });
      }

      const life = 2600 + Math.random() * 1200;
      setTimeout(() => {
        const out = g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
        out.onfinish = () => { g.remove(); active--; };
      }, life);
    }
    setTimeout(spawn, 650 + Math.random() * 400);
  }
  spawn();

  return () => { stopped = true; };
}
