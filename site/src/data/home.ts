/**
 * Home page copy in both languages.
 *
 * Kept as data rather than duplicated markup so the two versions cannot drift:
 * a layout change lands in both at once, and a missing translation is a type
 * error rather than a silently English page.
 */
export type Lang = 'en' | 'ru';

type Home = {
  title: string;
  /** written out in the alphabet of its own version, for the portrait alt */
  name: string;
  lead: string;
  /** shown instead of a link label on the entry that has no case page */
  noCase: string;
  tags: string[];
  meta: [string, string][];
  scroll: string;
  works: string;
  worksNote: string;
  caseLink: string;
  fullLink: string;
  kinds: Record<string, string>;
  teams: Record<string, string>;
  profile: string;
  profileText: string[];
  facts: [string, string][];
  contact: string;
  status: string[];
  portrait: string;
};

export const home: Record<Lang, Home> = {
  en: {
    title: 'Konstantin\nDarovskiy',
    name: 'Konstantin Darovskiy',
    lead: 'I design interfaces. Then I build them in code.',
    /* "No case" said nothing about why it is in the list at all. This doubles
       as the caption for the line drawn up to nichive, which is why the line
       itself carries no label. */
    noCase: 'nichive draft, first run at the same idea',
    /* Five, not eight. OBSIDIAN is a notes app rather than a skill and AI
       WORKFLOW names nothing at all; both were padding. */
    tags: ['UX/UI', 'WEB', 'CODE', 'CLAUDE CODE', 'FIGMA MCP'],
    meta: [],
    scroll: 'SCROLL',
    works: 'Works',
    worksNote: 'Monolith was drawn in full and never went live.',
    caseLink: 'CASE',
    fullLink: 'FULL SITE',
    kinds: {
      nichive: 'Digital archive',
      yakitoria: 'E-commerce',
      monolith: 'Side project',
      beta: 'Landing',
    },
    teams: { solo: 'Solo', team: 'Team of 5' },
    profile: 'Profile',
    profileText: [
      '4th year web design student at IT-Hub College in Moscow. I work across UX/UI, motion and 3D, and most of what I make ends up as a site that runs.',
      'AI agents are in the loop: Claude Code writes code with me, Figma MCP handles design systems. The decisions are still mine.',
    ],
    facts: [
      ['EDUCATION', 'IT-Hub College, Moscow, 4th year'],
      ['FOCUS', 'UX/UI, Web, Motion, 3D'],
      ['DESIGN', 'Figma, Blender, Three.js, GSAP'],
      ['AI', 'Claude Code, Cursor, Figma MCP'],
      ['LANGUAGES', 'Russian native, English B2+'],
      ['FORMAT', 'Office, hybrid, remote. Moscow, ready to relocate'],
    ],
    contact: 'Let’s talk.',
    status: ['MOSCOW  GMT+3', 'OPEN TO WORK'],
    portrait: 'PORTRAIT',
  },

  ru: {
    title: 'Константин\nДаровский',
    name: 'Константин Даровский',
    /* «Выпускаю» is what you do with records and product lines, not
       interfaces; it was a literal reading of the English "ship". */
    lead: 'Проектирую интерфейсы. Дальше сам собираю их в коде.',
    noCase: 'Черновик nichive, первый заход на ту же идею',
    tags: ['UX/UI', 'ВЕБ', 'КОД', 'CLAUDE CODE', 'FIGMA MCP'],
    meta: [],
    scroll: 'ВНИЗ',
    works: 'Работы',
    worksNote: 'Monolith я нарисовал целиком, но до запуска он так и не дошёл.',
    caseLink: 'КЕЙС',
    fullLink: 'ВЕСЬ САЙТ',
    kinds: {
      nichive: 'Цифровой архив',
      yakitoria: 'Интернет-магазин',
      monolith: 'Побочный проект',
      beta: 'Лендинг',
    },
    /* "Один" in a metadata column reads as a count, not as "worked alone". */
    teams: { solo: 'Соло', team: 'Команда из 5' },
    profile: 'О себе',
    profileText: [
      'Четвёртый курс веб-дизайна в IT-Hub College, Москва. Занимаюсь UX/UI, моушеном и 3D, почти всё довожу до работающего сайта.',
      'Работаю в связке с ИИ-агентами: Claude Code пишет со мной код, Figma MCP держит дизайн-системы. Решения при этом мои.',
    ],
    facts: [
      ['ОБРАЗОВАНИЕ', 'IT-Hub College, Москва, 4 курс'],
      ['НАПРАВЛЕНИЕ', 'UX/UI, веб, моушен, 3D'],
      ['ДИЗАЙН', 'Figma, Blender, Three.js, GSAP'],
      ['AI', 'Claude Code, Cursor, Figma MCP'],
      ['ЯЗЫКИ', 'Русский родной, английский B2+'],
      ['ФОРМАТ', 'Офис, гибрид, удалёнка. Москва, готов к переезду'],
    ],
    contact: 'Пишите.',
    status: ['МОСКВА  GMT+3', 'ОТКРЫТ К ПРЕДЛОЖЕНИЯМ'],
    portrait: 'ПОРТРЕТ',
  },
};
