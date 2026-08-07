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

const prm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** blocks rise into place once, as they enter */
export function initReveals() {
  if (prm()) return;
  gsap.registerPlugin(ScrollTrigger);

  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  targets.forEach((el) => {
    const kids = el.hasAttribute('data-reveal-children')
      ? Array.from(el.children)
      : [el];
    gsap.set(kids, { opacity: 0, y: 18 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () =>
        gsap.to(kids, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power2.out' }),
    });
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
    start: 'top 80%',
    once: true,
    onEnter: () => {
      const total = 34;
      let frame = 0;
      const settleAt = chars.map((_, i) => 8 + Math.floor((i / chars.length) * 20));
      const tick = () => {
        el.textContent = chars
          .map((c, i) =>
            locked[i] || frame >= settleAt[i]
              ? c
              : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
          )
          .join('');
        if (++frame <= total) requestAnimationFrame(tick);
        else el.textContent = final;
      };
      tick();
    },
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
