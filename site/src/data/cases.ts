/**
 * Case content. Copy comes from the Figma file, already edited - it is not
 * rewritten here, only restructured into the agreed section order:
 * cover -> result -> full view -> brief -> reasoning -> screens -> retro.
 *
 * Sections are optional per case. BETA has a role breakdown, Yakitoria has a
 * teardown of what was broken and jury quotes, nichive has research and a
 * design system. Rendering only what exists beats padding every case to the
 * same shape.
 */
export type Case = {
  slug: string;
  title: string;
  lead: string;
  /**
   * One line for the next-case card, and deliberately not the lead.
   *
   * The card used to print the target case's own opening sentence, so you read
   * the identical sentence twice: once as a promise at the bottom of one page
   * and again as the introduction at the top of the next. This says what is
   * interesting in there instead of describing what it is.
   */
  teaser: string;
  coverMeta: [string, string][];
  facts: [string, string][];
  meta: [string, string][];
  frame?: {
    project: 'nichive' | 'beta' | 'yakitoria' | 'monolith';
    url?: string;
    /** per language: this line sits in the interface, so it has to translate */
    note?: { en: string; ru: string };
    tabs?: string[];
  };
  brief: string[];
  myRole?: string[];
  broken?: string[];
  personas?: [string, string, string][];
  decisions: { n: string; title: string; body: string[] }[];
  /** short label for the retro section; long ones wrap badly in the rail */
  retroLabel?: string;
  screens?: [string, string][];
  system?: string[];
  judges?: { quotes: string[]; source: string };
  retro: string[];
  /**
   * A fact for the empty right field of a text section, keyed by section.
   *
   * Two jobs at once. Prose sections were capped at a reading measure with a
   * third of the row left blank beside them, and three or four of them ran
   * back to back with nothing to tell one from the next. A short figure in
   * that field fills it with something worth reading and breaks the run.
   *
   * Rules it has to keep: it states a number, never the name of the section
   * it sits beside; it goes in every other section, or the asides become the
   * run; and it never repeats what the section's own paragraphs already say.
   */
  asides?: Record<string, string>;
  /**
   * Optional on purpose. The last case in the chain has no next one, and
   * pointing it back at the first turned three cases into a carousel with no
   * exit: you could keep clicking NEXT forever and never learn you had seen
   * everything. The last case closes instead.
   */
  next?: { slug: string; title: string };
};

export const cases: Case[] = [
  {
    slug: 'nichive',
    title: 'nichive',
    lead: 'A digital museum of one archival fashion object per month.',
    teaser: 'A fashion archive that gives an object a month and no price.',
    coverMeta: [
      ['ROLE', 'Solo · design + frontend'],
      ['YEAR', '2026'],
      ['STATUS', 'Live'],
    ],
    facts: [
      ['PAGES', '6, desktop and mobile'],
      ['3D MODEL', '3.3 MB, down from 80'],
      ['CODE', 'Public'],
      ['ACCESSIBILITY', 'AA contrast, keyboard, reduced-motion'],
    ],
    meta: [
      ['ROLE', 'Research, UX, UI, frontend, 3D'],
      ['TIMELINE', '3 months'],
      ['TEAM', 'Solo'],
      ['STACK', 'Figma, HTML/CSS/JS, three.js, Blender'],
    ],
    frame: {
      project: 'nichive',
      url: 'https://kuixl.github.io/final-kt/',
      note: { en: 'the site ships in Russian', ru: 'сайт на русском' },
      tabs: ['index', 'exhibitions', 'materials'],
    },
    brief: [
      'Fashion archives online are either shops or museum databases. Shops push you to buy; databases give you a catalogue number and a photo. Neither explains why an object matters.',
      'nichive shows one archival object per month. No prices, no cart, no variants. The object gets a full month of attention: where it came from, how it was made, and what wearing it actually feels like.',
    ],
    personas: [
      ['Anna', '32 · Architect, collector', 'I don’t buy, I study. An object must have provenance.'],
      ['Mark', '27 · Graphic designer', 'I need aesthetics that look like an expensive catalogue.'],
      ['Yulia', '22 · Art history student', 'I want to understand fashion properly. Where do I start?'],
    ],
    decisions: [
      {
        n: '1',
        title: 'No cart, no prices',
        body: [
          'I built the first structure as a shop: product page, sizes, a buy button. Then cut all of it. Next to a price the page starts persuading, and the photography works for the sale. With the button gone the object could take the whole screen.',
        ],
      },
      {
        n: '2',
        title: 'One object per month',
        body: [
          'A catalogue was the safer option: more pages, better search coverage. I chose the constraint. One object per month means a weak page has no grid to hide in. The cost is honest: on launch the site looks empty.',
        ],
      },
      {
        n: '3',
        title: '3D instead of another shoot',
        body: [
          'The object is a shoe with a split toe, and its shape is the whole point. Flat images kept losing it.',
          'The model came out of Blender too heavy for the web by any measure. gltf-transform with meshopt and WebP cut it by a factor of 24, and only then could it go to a browser.',
        ],
      },
    ],
    /* Unnumbered on purpose. These are six places in a site, not six steps in
       an order, and the numbers were being read as one. */
    screens: [
      ['HOME', 'index'],
      ['EXHIBITIONS', 'exhibitions'],
      ['STORIES', 'stories'],
      ['MANIFESTO', 'manifesto'],
      ['MATERIALS', 'materials'],
      ['SUBSCRIBE', 'subscribe'],
    ],
    system: [
      'Variables for colour, spacing and type scale. Components named so you can find them without the file open. Auto layout throughout.',
      'Tokens map to CSS variables one to one, so the build ran straight off the design.',
    ],
    retro: [
      'The typography is set in Inter and JetBrains Mono, which was the safe choice and reads as one. A project about archival fashion deserved a face with more character.',
      'I underestimated how much writing a single-object site needs. With no catalogue to browse, the text carries the whole experience, and I was still editing it after the build was done.',
    ],
    asides: { decisions: '6 pages', retro: '3 months' },
    next: { slug: 'yakitoria', title: 'Yakitoria' },
  },

  {
    slug: 'beta',
    title: 'BETA',
    lead: 'A landing page for a student design sprint. Two weeks, a team of five, a real client.',
    teaser: 'Selling an educational format to people who know it is educational.',
    coverMeta: [
      ['ROLE', 'UX + structure'],
      ['YEAR', '2026'],
      ['STATUS', 'Shipped'],
    ],
    facts: [
      ['FORMAT', 'One page, eight sections'],
      ['DURATION', '2 weeks, fixed'],
      ['TEAM', '5 people, 1 client'],
      ['OUTCOME', 'Structure held without a rewrite'],
    ],
    meta: [
      ['ROLE', 'UX structure, prototype, part of visual design'],
      ['TIMELINE', '2 weeks'],
      ['CLIENT', 'IT-Hub College'],
      ['STACK', 'Figma, HTML/CSS/JS'],
    ],
    frame: { project: 'beta' },
    brief: [
      'IT-Hub runs a two-week design sprint where students work with a real client. The landing page had to recruit the next intake.',
      'The format itself is the problem. Student projects read as practice, and practice is easy to skip. The page needed to say the opposite: a deadline, a client, a public defence.',
    ],
    myRole: [
      'I worked on the information architecture and the prototype. First we worked out what a visitor asks and in what order: what this is, how it runs, what they walk away with, who is behind it. That sequence became the page structure.',
      'From there, wireframes and a clickable prototype, then parts of the interface. Five people, everyone carried a section, mine was mostly the skeleton.',
    ],
    decisions: [
      {
        n: '1',
        title: 'Structure before visuals',
        body: [
          'The fast route is to open Figma and start designing screens. We spent the first days on the question sequence instead, which felt slow at the time. It paid off: when the visual direction changed mid-sprint, the structure held and nothing had to be rebuilt.',
        ],
      },
      {
        n: '2',
        title: 'Name the doubt directly',
        body: [
          'It all fits on one page, so there is no second screen to move an objection to. And there is one objection: "student project" is the first thing a visitor thinks.',
          'We put it in the copy directly and set the deadline, the client and the date of the public defence beside it.',
        ],
      },
      {
        n: '3',
        title: 'A prototype instead of a deck',
        body: [
          'Showing the client static screens invites comments on colour. A clickable prototype moves the conversation to the flow, which is what we actually needed feedback on at that stage.',
        ],
      },
    ],
    retro: [
      'We tested the flow inside the team. Two or three conversations with students who had never heard of the programme would have caught things we could not see from inside.',
      'I left the copy until late in the sprint and it ran out of time. That was my planning, not the deadline.',
    ],
    asides: { role: '2 weeks', retro: '8 sections' },
    // last in the chain: no next, the case closes
  },

  {
    slug: 'yakitoria',
    title: 'Yakitoria',
    lead: 'A menu and cart redesign for a sushi delivery chain.',
    teaser: 'Raise the average order without touching the brand or the range.',
    coverMeta: [
      ['ROLE', 'Solo · UX + UI'],
      ['YEAR', '2025'],
      ['AWARD', '3rd of 47'],
    ],
    facts: [
      ['COMPETITION', 'FoodTech Lab, 47 teams'],
      ['BUDGET', '60 developer hours'],
      ['JUDGED BY', 'Yandex, Lunka, Yakitoria, HSE Design School'],
      ['SCOPE', 'Menu and cart, existing range kept'],
    ],
    meta: [
      ['ROLE', 'Research, UX, UI'],
      ['TIMELINE', 'Competition sprint, May 2025'],
      ['TEAM', 'Solo'],
      ['BRIEF FROM', 'FoodTech Lab and Yakitoria'],
    ],
    frame: { project: 'yakitoria', tabs: ['menu', 'product', 'reviews'] },
    brief: [
      'Redesign the menu and cart so the average order goes up and fewer people drop out before checkout. Audience: 18 to 35, ordering delivery three or four times a week.',
      'Three constraints: keep the brand recognisable, fit inside 60 developer hours, leave the product range alone. The last one shaped the work. The catalogue stays, the interface around it changes.',
    ],
    broken: [
      'The original menu listed dishes with a photo and a price, and stopped there.',
      'Reviews sat behind a separate tab, so nobody reached them. Filters sorted by calories and cooking time. The product page had no upsell at all: you added a roll to the cart and the site let you go.',
    ],
    decisions: [
      {
        n: '1',
        title: 'Nutrition data next to the price',
        body: [
          'The audience counts calories whether the site shows them or not. Without the numbers on the card people leave to look them up elsewhere. The hypothesis was simple: protein, fat and carbs settle the doubt at the moment of choosing.',
        ],
      },
      {
        n: '2',
        title: 'Frequently ordered together',
        body: [
          'Sales data showed rolls going out with soups and gunkan more than anything else. The original site knew this and did nothing with it. I put the pairing on the product page as a visible block. Of every change I made, this is the one aimed straight at the brief.',
        ],
      },
      {
        n: '3',
        title: 'Filters people actually use',
        body: [
          'Calories and cooking time went out, popularity and dish type went in. Nobody browses sushi by cooking time. They browse by what they feel like and what other people order.',
        ],
      },
      {
        n: '4',
        title: 'Reviews on the product page',
        body: [
          'A tab asks for a decision before the visitor has the information, and most never make it. On the card itself, other people\'s experience lands where the doubt is: at the point of adding to cart.',
        ],
      },
    ],
    screens: [
      ['MENU', 'menu'],
      ['PRODUCT PAGE', 'product'],
      ['REVIEWS', 'reviews'],
    ],
    judges: {
      quotes: [
        'A strong focus on product decisions rather than repainting. We saw someone thinking about sales, not pixels.',
        'We asked why the nutrition data. The answer: our audience counts calories and we do not show them - that is white noise. That is the right logic.',
        'The frequently ordered together block was the best example of upselling among all the teams.',
      ],
      source: 'Jury, final broadcast',
    },
    retro: [
      'The judges flagged headings breaking at 375 width. An hour of work, and it went out in the version I submitted.',
      'I had sales data and used it for exactly one decision. With more time I would have taken the same approach to the rest of the menu structure.',
    ],
    asides: { broken: '47 teams', retro: '3rd place' },
    next: { slug: 'beta', title: 'BETA' },
  },
];

export const caseBySlug = (slug: string) => cases.find((c) => c.slug === slug);

/**
 * Reading order, and the order the previous/next links walk.
 *
 * The array above is grouped by when each case was written, which put BETA
 * second; the numbered index on the home page runs nichive, Yakitoria, BETA.
 * Walking the cases in a different order from the list that sent you into
 * them is disorienting, so the order is stated once, here, and both use it.
 */
export const caseOrder = ['nichive', 'yakitoria', 'beta'] as const;

export const orderedCases = caseOrder
  .map((slug) => cases.find((c) => c.slug === slug))
  .filter(Boolean) as Case[];
