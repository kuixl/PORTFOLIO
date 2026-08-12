/**
 * Behaviour for <WorkFrame>: tabs, viewport toggle and the full-screen reader.
 *
 * The window shows the top of a project page and nothing scrolls inside it.
 * Two alternatives were tried and both got in the reader's way: an inner
 * scroll area traps the wheel when the cursor lands in it, and pinning the
 * section stops the page dead while the image travels. Clicking opens the
 * whole page in the reader, which is the one place scrolling a project page
 * is what the reader asked for.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type FrameState = { page: string; size: string };

function activeImg(root: HTMLElement): HTMLImageElement | null {
  return root.querySelector<HTMLImageElement>('img.is-active');
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
  // Hiding overflow is not enough: Lenis drives the page from wheel events and
  // keeps scrolling the site behind the reader, so the picture stays put while
  // the portfolio moves under it. Stop it for as long as the overlay is up.
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  window.dispatchEvent(new CustomEvent('kuixl:lock'));
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
  document.body.style.overflow = '';
  window.dispatchEvent(new CustomEvent('kuixl:unlock'));
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

    /**
     * No pinning.
     *
     * The window used to pin and the project page scrolled through it. On
     * paper that shows a whole site inside a case; in the hand it means the
     * page stops responding to the wheel for a screen or more, and every
     * reader who met it read that as the site being broken rather than as an
     * effect. Shortening it from 1.5 screens to 0.9 did not change the
     * reading, because the problem is the stop itself, not its length.
     *
     * The whole page is still one click away in the reader, and the tabs
     * still switch between pages. What is gone is the scroll trap.
     */
  }

  addEventListener('resize', () => ScrollTrigger.refresh());
}
