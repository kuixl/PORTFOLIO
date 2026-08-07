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
  lead: string;
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
    lead: 'I design interfaces. Then I ship them.',
    tags: ['UX/UI', 'WEB', 'CODE', 'CLAUDE CODE', 'CURSOR', 'FIGMA MCP', 'OBSIDIAN', 'AI WORKFLOW'],
    meta: [
      ['Study', 'IT-Hub College, 4th year'],
      ['Based', 'Moscow, GMT+3'],
      ['Format', 'Office, hybrid, remote'],
    ],
    scroll: 'SCROLL',
    works: 'Works',
    worksNote: 'Monolith shipped but I never wrote it up. The pages open here instead.',
    caseLink: 'CASE →',
    fullLink: 'FULL SITE →',
    kinds: {
      nichive: 'Digital archive',
      yakitoria: 'E-commerce',
      monolith: 'Type study',
      beta: 'Landing',
    },
    teams: { solo: 'Solo', team: 'Team' },
    profile: 'Profile',
    profileText: [
      '4th year web design student at IT-Hub College in Moscow. I work across UX/UI, motion and 3D. Most of what I make goes from research to a site that runs. I design it, then I build it.',
      'I work with AI agents in the loop. Claude Code and Cursor write production code with me, Figma MCP handles design systems and prototypes, and the research and reasoning live in Obsidian. The tools make execution faster. What to build, and why, is still my call.',
    ],
    facts: [
      ['EDUCATION', 'IT-Hub College, Moscow, 4th year'],
      ['FOCUS', 'UX/UI, Web, Motion, 3D'],
      ['DESIGN', 'Figma, Blender, Three.js, GSAP'],
      ['AI WORKFLOW', 'Claude Code, Cursor, Figma MCP, agent-assisted prototyping'],
      ['NOTES', 'Obsidian, where the research and the case writing live'],
      ['LANGUAGES', 'Russian native, English B2+'],
      ['FORMAT', 'Office, hybrid, remote'],
      ['LOCATION', 'Moscow, ready to relocate'],
    ],
    contact: 'Let’s talk.',
    status: ['MOSCOW  GMT+3', 'OPEN TO WORK'],
    portrait: 'PORTRAIT',
  },

  ru: {
    title: 'Константин\nДаровский',
    lead: 'Проектирую интерфейсы. Потом собираю их сам.',
    tags: ['UX/UI', 'ВЕБ', 'КОД', 'CLAUDE CODE', 'CURSOR', 'FIGMA MCP', 'OBSIDIAN', 'AI WORKFLOW'],
    meta: [
      ['Учёба', 'IT-Hub College, 4 курс'],
      ['Город', 'Москва, GMT+3'],
      ['Формат', 'Офис, гибрид, удалёнка'],
    ],
    scroll: 'ВНИЗ',
    works: 'Работы',
    worksNote:
      'Monolith я выпустил, но кейс так и не написал: страницы открываются прямо здесь. ' +
      'Разборы проектов пока только на английском.',
    caseLink: 'КЕЙС →',
    fullLink: 'ВЕСЬ САЙТ →',
    kinds: {
      nichive: 'Цифровой архив',
      yakitoria: 'Электронная торговля',
      monolith: 'Работа со шрифтом',
      beta: 'Лендинг',
    },
    teams: { solo: 'Один', team: 'Команда' },
    profile: 'О себе',
    profileText: [
      'Учусь на 4 курсе веб-дизайна в IT-Hub College в Москве. Работаю с UX/UI, моушеном и 3D. Почти всё, что делаю, доходит от исследования до сайта, который работает. Сначала проектирую, потом собираю.',
      'Работаю с ИИ-агентами в связке. Claude Code и Cursor пишут продакшн-код вместе со мной, Figma MCP держит дизайн-системы и прототипы, а исследование и рассуждения живут в Obsidian. Инструменты ускоряют работу. Что строить и зачем, решаю всё равно я.',
    ],
    facts: [
      ['ОБРАЗОВАНИЕ', 'IT-Hub College, Москва, 4 курс'],
      ['НАПРАВЛЕНИЕ', 'UX/UI, веб, моушен, 3D'],
      ['ДИЗАЙН', 'Figma, Blender, Three.js, GSAP'],
      ['AI WORKFLOW', 'Claude Code, Cursor, Figma MCP, прототипы с агентами'],
      ['ЗАМЕТКИ', 'Obsidian, там живут исследование и тексты кейсов'],
      ['ЯЗЫКИ', 'Русский родной, английский B2+'],
      ['ФОРМАТ', 'Офис, гибрид, удалёнка'],
      ['ГОРОД', 'Москва, готов к переезду'],
    ],
    contact: 'Давай поговорим.',
    status: ['МОСКВА  GMT+3', 'ОТКРЫТ К РАБОТЕ'],
    portrait: 'ПОРТРЕТ',
  },
};
