/**
 * Lenis smooth scroll + GSAP/ScrollTrigger, initialized after the preloader.
 * Reduced motion: native scroll, no smoothing.
 */
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initMotion() {
  gsap.registerPlugin(ScrollTrigger);

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const lenis = new Lenis({ autoRaf: false, lerp: 0.12 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
