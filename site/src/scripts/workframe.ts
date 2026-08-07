/**
 * Behaviour for <WorkFrame>: tabs, viewport toggle, scroll-through and the
 * full-screen reader.
 *
 * The page inside the frame is driven by ScrollTrigger rather than by its own
 * scrollbar. An inner scroll area would trap the wheel - the visitor scrolls
 * past, the cursor lands in the frame, and the page stops moving. Pinning keeps
 * one scroll direction meaning one thing.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const prm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DESKTOP = matchMedia('(min-width: 901px)');

type FrameState = { page: string; size: string };

function activeImg(root: HTMLElement): HTMLImageElement | null {
  return root.querySelector<HTMLImageElement>('img.is-active');
}

/**
 * How far the page travels inside the window, in rendered pixels. Measured off
 * the element's own rendered width rather than the viewport's, because the
 * mobile capture is displayed at phone width, not stretched to fill.
 */
function travel(root: HTMLElement): number {
  const img = activeImg(root);
  const viewport = root.querySelector<HTMLElement>('[data-viewport]');
  if (!img || !viewport) return 0;
  const shownW = img.getBoundingClientRect().width || img.width;
  const ratio = (img.naturalHeight || img.height) / (img.naturalWidth || img.width || 1);
  return Math.max(0, shownW * ratio - viewport.clientHeight);
}

function show(root: HTMLElement, state: FrameState) {
  const imgs = [...root.querySelectorAll<HTMLImageElement>('[data-viewport] img')];
  // a page may exist at one size only - fall back rather than showing nothing
  let match = imgs.find((i) => i.dataset.page === state.page && i.dataset.size === state.size);
  if (!match) match = imgs.find((i) => i.dataset.page === state.page);
  if (!match) return;
  state.size = match.dataset.size!;
  imgs.forEach((i) => i.classList.toggle('is-active', i === match));
  imgs.forEach((i) => (i.style.transform = 'translateY(0)'));
  root.querySelector('[data-viewport]')?.classList.toggle('is-mobile', state.size === 'mobile');

  // Scope to the control bars. The images carry data-page/data-size too, so an
  // unscoped selector marks every matching image is-active - which silently
  // stacked all three mobile captures and painted the last one on top.
  root.querySelectorAll<HTMLButtonElement>('.wf-tabs [data-page]').forEach((b) => {
    const on = b.dataset.page === state.page;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', String(on));
  });
  root.querySelectorAll<HTMLButtonElement>('.wf-sizes [data-size]').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.size === state.size);
  });
}

// ---------- full-screen reader ----------
let overlay: HTMLElement | null = null;

function openFull(src: string | string[], label: string) {
  close();
  const list = Array.isArray(src) ? src : [src];
  overlay = document.createElement('div');
  overlay.className = 'wf-overlay';
  overlay.innerHTML = `
    <div class="wf-overlay-bar">
      <span>${label}</span>
      <button type="button" aria-label="Close">CLOSE &times;</button>
    </div>
    <div class="wf-overlay-scroll">
      <div class="wf-overlay-stack">
        ${list.map((s) => `<img src="${s}" alt="${label}">`).join('')}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.documentElement.style.overflow = 'hidden';
  overlay.querySelector('button')!.addEventListener('click', close);
  // clicking the backdrop closes; clicking the page itself must not
  overlay.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('img')) close();
  });
  addEventListener('keydown', onKey);
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
}

function close() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
  document.documentElement.style.overflow = '';
  removeEventListener('keydown', onKey);
}

/**
 * Anything with data-fullview opens the reader directly, no frame involved.
 * Monolith has no case page, so its row in the index is the only way in.
 */
export function initFullViewLinks() {
  document.querySelectorAll<HTMLElement>('[data-fullview]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const srcs = (el.dataset.fullview || '').split(',').filter(Boolean);
      if (srcs.length) openFull(srcs, el.dataset.fullviewLabel || 'Full view');
    });
  });
}

export function initWorkFrames() {
  const frames = [...document.querySelectorAll<HTMLElement>('.work-frame')];
  if (!frames.length) return;

  gsap.registerPlugin(ScrollTrigger);

  for (const root of frames) {
    const state: FrameState = {
      page: activeImg(root)?.dataset.page ?? root.querySelector('.wf-tabs [data-page]')?.getAttribute('data-page') ?? '',
      size: 'desktop',
    };

    root.querySelectorAll<HTMLButtonElement>('.wf-tabs [data-page]').forEach((b) =>
      b.addEventListener('click', () => {
        state.page = b.dataset.page!;
        show(root, state);
        ScrollTrigger.refresh();
      })
    );
    root.querySelectorAll<HTMLButtonElement>('.wf-sizes [data-size]').forEach((b) =>
      b.addEventListener('click', () => {
        state.size = b.dataset.size!;
        show(root, state);
        ScrollTrigger.refresh();
      })
    );

    const frame = root.querySelector<HTMLElement>('[data-frame]')!;
    frame.addEventListener('click', () => {
      const img = activeImg(root);
      if (img) openFull(img.src, img.alt);
    });

    if (prm || !DESKTOP.matches) continue;

    // Pin the whole section, not just the window: pinning the window alone
    // scrolls the tabs off the top, so the page can't be switched while the
    // thing it switches is the only thing on screen.
    ScrollTrigger.create({
      trigger: root,
      start: 'center center',
      end: () => `+=${Math.max(300, travel(root))}`,
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const img = activeImg(root);
        if (img) img.style.transform = `translateY(${-travel(root) * self.progress}px)`;
      },
    });
  }

  addEventListener('resize', () => ScrollTrigger.refresh());
}
