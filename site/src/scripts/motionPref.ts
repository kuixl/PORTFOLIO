/**
 * One answer to "may this page move", shared by every module that animates.
 *
 * This used to be re-derived in six files and four of them tested the media
 * query on its own, so `?motion` only reached the two that knew about the
 * override. On a machine with Windows animation effects switched off - which
 * is a common default, and is this site's author's own setup - the parameter
 * appeared to do nothing: the reveals came on, while the pinned work frame,
 * the preloader sketches and the sound stayed dead. A half-working override
 * reads as a broken one.
 *
 * `?motion` asks for animation, `?replay` asks for the preloader and implies
 * it. Either sticks for the session so it survives navigation between pages.
 */
const FORCED = (() => {
  const q = new URLSearchParams(location.search);
  if (q.has('motion') || q.has('replay')) {
    sessionStorage.setItem('kuixl:motion', '1');
    return true;
  }
  return sessionStorage.getItem('kuixl:motion') === '1';
})();

/** True when the visitor has asked for less movement and has not overridden it. */
export const reducedMotion = () =>
  !FORCED && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const motionForced = () => FORCED;
