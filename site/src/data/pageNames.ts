/**
 * Human names for the pages inside each project.
 *
 * Two things were leaking raw identifiers into the interface: the tabs above
 * the work frame ("index", "exhibitions", "product") and the captions under
 * the screen grid.
 *
 * Russian is not a straight translation here. nichive shipped with an English
 * navigation, so its page names stay English on both versions: they are the
 * real labels of the real site, and translating them would describe something
 * that does not exist. Yakitoria shipped in Russian, so its names are Russian.
 * The screen grid carries a "Site pages" heading so the reader can tell the
 * difference between a fact and an oversight.
 */
import type { Lang } from './home';

type ByProject = Record<string, Record<string, string>>;

const nichive = {
  index: 'Home',
  exhibitions: 'Exhibitions',
  stories: 'Stories',
  manifesto: 'Manifesto',
  materials: 'Materials',
  subscribe: 'Subscribe',
};

export const pageNames: Record<Lang, ByProject> = {
  en: {
    nichive,
    yakitoria: { menu: 'Menu', product: 'Product page', reviews: 'Reviews' },
    /* keyed by the page id in works.json, which for this project is "landing";
       keying it "beta" meant no match and the raw id showing up in alt text */
    beta: { landing: 'Landing' },
    monolith: { index: 'Home', archive: 'Archive', materials: 'Materials' },
  },
  ru: {
    // deliberately unchanged, see the note above
    nichive,
    yakitoria: { menu: 'Меню', product: 'Карточка товара', reviews: 'Отзывы' },
    beta: { landing: 'Лендинг' },
    monolith: { index: 'Главная', archive: 'Архив', materials: 'Материалы' },
  },
};

export const pageName = (lang: Lang, project: string, page: string): string =>
  pageNames[lang]?.[project]?.[page] ?? page;
