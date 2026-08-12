/**
 * Chrome strings.
 *
 * These used to be written straight into the components, which is why the
 * Russian version showed "FULL VIEW", "click to open", "3 pages" and "Skip to
 * content" in English: nothing was translating them because nothing could.
 * Anything a visitor reads that is not case copy belongs here.
 */
import type { Lang } from './home';

export const ui: Record<Lang, Record<string, string>> = {
  en: {
    skip: 'Skip to content',
    fullView: 'FULL VIEW',
    clickToOpen: 'click to open',
    openLive: 'open the live site',
    open: 'OPEN',
    page: 'page',
    pages: 'pages',
    sitePages: 'Site pages',
    viewport: 'viewport',
  },
  ru: {
    skip: 'Перейти к содержимому',
    fullView: 'ЦЕЛИКОМ',
    clickToOpen: 'нажмите, чтобы открыть',
    openLive: 'открыть живой сайт',
    open: 'ОТКРЫТЬ',
    page: 'страница',
    pages: 'страницы',
    sitePages: 'Страницы сайта',
    viewport: 'ширина окна',
  },
};

/** "3 страницы" needs a different form from "5 страниц". */
export const pageCount = (n: number, lang: Lang): string => {
  if (lang === 'en') return `${n} ${n === 1 ? ui.en.page : ui.en.pages}`;
  const t = n % 10, h = n % 100;
  if (t === 1 && h !== 11) return `${n} страница`;
  if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return `${n} страницы`;
  return `${n} страниц`;
};
