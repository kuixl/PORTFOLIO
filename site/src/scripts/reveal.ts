/**
 * Scroll behaviour for the site itself: block reveals, a wordmark that
 * assembles out of characters, and an ASCII wipe between pages.
 *
 * Deliberately modest. Heavy motion on a portfolio reads as "likes effects"
 * rather than "solves problems", and it stutters on the laptops people
 * actually review portfolios on. Sketches and sound stay in the preloader.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { reducedMotion as prm } from './motionPref';

/**
 * Anything already on screen when the page loads is shown at once.
 *
 * A reveal starts at `top 88%`, which is the right place for a block you
 * scroll down to. For a block that is already on screen at load it is the
 * wrong place twice: an element sitting between 88% and 100% of the viewport
 * is visible to the reader and hidden by the animation, and it stays hidden
 * until they scroll. On the home page that was the "Works" heading, and a
 * visitor arriving from a direct link - which is how everyone arrives - saw a
 * blank space where a heading should be.
 *
 * The rule is simply: on screen at load means visible at load.
 */
const onScreenNow = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return r.top < innerHeight && r.bottom > 0;
};

/** blocks rise into place once, as they enter */
export function initReveals() {
  if (prm()) return;
  gsap.registerPlugin(ScrollTrigger);

  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  targets.forEach((el) => {
    const kids = el.hasAttribute('data-reveal-children')
      ? Array.from(el.children)
      : [el];
    const show = () =>
      gsap.to(kids, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power2.out' });

    if (onScreenNow(el)) {
      // no hidden state at all: it was never off screen to arrive from
      return;
    }
    gsap.set(kids, { opacity: 0, y: 18 });
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: show });
  });

  // Lazy images land after the triggers are measured and shift everything below
  // them. Without a re-measure, blocks further down can sit outside a trigger
  // that already passed and stay invisible.
  addEventListener('load', () => ScrollTrigger.refresh());
  document.querySelectorAll('img[loading="lazy"]').forEach((img) =>
    img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })
  );
}

const GLYPHS = '@%#*+=-:.';

/**
 * Index rows: the number scrambles on hover, the row shifts. Cheap, and it
 * makes the list feel like a machine rather than a stack of links.
 */
export function initIndexHover() {
  if (prm()) return;
  document.querySelectorAll<HTMLElement>('.index-link').forEach((row) => {
    const n = row.querySelector<HTMLElement>('.ix-n');
    if (!n) return;
    const final = n.textContent ?? '';
    let timer = 0;
    row.addEventListener('mouseenter', () => {
      let f = 0;
      clearInterval(timer);
      timer = window.setInterval(() => {
        n.textContent = f++ < 6
          ? String(Math.floor(Math.random() * 90) + 10)
          : ((clearInterval(timer), final));
      }, 45);
    });
    row.addEventListener('mouseleave', () => {
      clearInterval(timer);
      n.textContent = final;
    });
  });
}

/**
 * The contact heading resolves from random characters, rhyming with the
 * preloader without repeating it: the preloader does this to the wordmark at
 * the start, this closes the visit five minutes later.
 */
export function initAssembleHeading(selector = '[data-assemble]') {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el || prm()) return;
  gsap.registerPlugin(ScrollTrigger);

  const final = el.textContent ?? '';
  const chars = [...final];
  // spaces stay spaces, otherwise the word boundaries scramble too
  const locked = chars.map((c) => c === ' ' || c === ' ');

  ScrollTrigger.create({
    trigger: el,
    // later than the other reveals: the heading should assemble while it is in
    // view, not have finished before it arrives
    start: 'top 92%',
    once: true,
    onEnter: () => {
      // Was 34 frames - about half a second, over before it registered as
      // anything. Paced off the clock rather than the frame count so it reads
      // the same on a 60Hz and a 144Hz screen, and slow enough to watch a
      // letter resolve.
      const RUN = 1800;
      const HOLD = 380;                 // how long each character scrambles
      const start = performance.now();
      const settleAt = chars.map((_, i) => (i / Math.max(1, chars.length - 1)) * (RUN - HOLD));
      const tick = () => {
        const t = performance.now() - start;
        el.textContent = chars
          .map((c, i) => {
            if (locked[i] || t >= settleAt[i] + HOLD) return c;
            // Characters whose turn has not come used to render as a space,
            // so for the first second the word was a single stray glyph
            // followed by nothing: "Пишите." read as "П=#" and looked broken
            // rather than unresolved. Every position now holds a glyph, so
            // the word keeps its shape and only its letters are in doubt.
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join('');
        if (t <= RUN) requestAnimationFrame(tick);
        else el.textContent = final;
      };
      tick();
    },
  });
}

/**
 * Rail drawings draw themselves in when their section arrives, top to bottom,
 * so they read as something being made rather than a grey stain in the margin.
 * A clip wipe rather than per-character reveal: these grids run to a couple of
 * thousand characters and wrapping each one in a span to animate it would cost
 * far more than the effect is worth.
 */
export function initRailArt() {
  const arts = [...document.querySelectorAll<HTMLElement>('.cs-art')];
  if (!arts.length) return;

  if (prm()) {
    arts.forEach((a) => (a.style.clipPath = 'none'));
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  arts.forEach((art) => {
    gsap.set(art, { clipPath: 'inset(0 0 100% 0)' });
    ScrollTrigger.create({
      trigger: art.closest('.case-section') ?? art,
      start: 'top 78%',
      once: true,
      onEnter: () =>
        gsap.to(art, {
          clipPath: 'inset(0 0 0% 0)',
          duration: 1.4,
          ease: 'power2.inOut',
        }),
    });
  });
}

/**
 * The work frame opens like a window: the chrome bar arrives, then the viewport
 * unrolls beneath it. Scale would squash the screenshot inside, so the height
 * is what animates, with the image held at its final size and clipped.
 */
export function initFrameEntrance() {
  if (prm()) return;
  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll<HTMLElement>('.work-frame').forEach((frame) => {
    const viewport = frame.querySelector<HTMLElement>('[data-viewport]');
    const chrome = frame.querySelector<HTMLElement>('.wf-chrome');
    if (!viewport || !chrome) return;

    ScrollTrigger.create({
      trigger: frame,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        const full = viewport.clientHeight;
        gsap.set(chrome, { opacity: 0, y: -8 });
        gsap.set(viewport, { height: 0, overflow: 'hidden' });
        gsap
          .timeline({
            // hand the measured height back so the pinned scroll-through keeps
            // working off a real number rather than an inline leftover
            onComplete: () => {
              viewport.style.removeProperty('height');
              ScrollTrigger.refresh();
            },
          })
          .to(chrome, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' })
          .to(viewport, { height: full, duration: 0.65, ease: 'power3.inOut' }, '-=0.1');
      },
    });
  });
}

/**
 * ASCII wipe on internal navigation. Runs on click, before the browser leaves,
 * and again on arrival - a real page load, so the two halves are separate.
 */
export function initPageWipe() {
  if (prm()) return;

  const make = () => {
    const el = document.createElement('div');
    el.className = 'page-wipe';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  };

  const fill = (el: HTMLElement, density: number) => {
    const cols = Math.ceil(innerWidth / 10);
    const rows = Math.ceil(innerHeight / 19);
    let s = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++)
        s += Math.random() < density ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : ' ';
      s += '\n';
    }
    el.textContent = s;
  };

  // arrival: a dense screen that thins out
  const inWipe = make();
  inWipe.classList.add('is-in');
  let d = 0.5;
  const thin = () => {
    d -= 0.06;
    if (d <= 0) { inWipe.remove(); return; }
    fill(inWipe, d);
    setTimeout(thin, 45);
  };
  fill(inWipe, d);
  requestAnimationFrame(() => setTimeout(thin, 60));

  // departure: thicken, then let the navigation happen
  document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      const url = a.getAttribute('href')!;
      if (url.startsWith('/#')) return;
      e.preventDefault();
      const out = make();
      let dd = 0;
      const thicken = () => {
        dd += 0.09;
        fill(out, dd);
        if (dd < 0.55) setTimeout(thicken, 40);
        else location.href = url;
      };
      thicken();
    });
  });
}
