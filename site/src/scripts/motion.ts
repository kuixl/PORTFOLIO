/**
 * Lenis smooth scroll + GSAP/ScrollTrigger, initialized after the preloader.
 * Reduced motion: native scroll, no smoothing.
 */
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reducedMotion } from './motionPref';

export function initMotion() {
  gsap.registerPlugin(ScrollTrigger);

  if (reducedMotion()) return;

  const lenis = new Lenis({
    autoRaf: false,
    lerp: 0.12,
    // Lenis takes over the wheel for the whole document, so a scrollable panel
    // on top of the page receives nothing and sits frozen while the page moves
    // behind it. Anything inside the reader is handed back to native scrolling.
    prevent: (node) => !!(node as HTMLElement).closest?.('.wf-overlay'),
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Overlays ask for the page to hold still. `overflow: hidden` alone does not
  // stop Lenis, which reads wheel events directly.
  addEventListener('kuixl:lock', () => lenis.stop());
  addEventListener('kuixl:unlock', () => lenis.start());
}
