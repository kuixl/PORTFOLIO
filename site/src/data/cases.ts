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
  coverMeta: [string, string][];
  facts: [string, string][];
  meta: [string, string][];
  frame?: { project: 'nichive' | 'beta' | 'yakitoria' | 'monolith'; url?: string; note?: string; tabs?: string[] };
  brief: string[];
  myRole?: string[];
  broken?: string[];
  personas?: [string, string, string][];
  decisions: { n: string; title: string; body: string[] }[];
  screens?: [string, string][];
  system?: string[];
  judges?: { quotes: string[]; source: string };
  retro: string[];
  next: { slug: string; title: string };
};

export const cases: Case[] = [
  {
    slug: 'nichive',
    title: 'nichive',
    lead: 'A digital museum of one archival fashion object per month.',
    coverMeta: [
      ['ROLE', 'Solo · design + frontend'],
      ['YEAR', '2026'],
      ['STATUS', 'Live'],
    ],
    facts: [
      ['PAGES', '6, desktop and mobile'],
      ['3D MODEL', '3.3 MB in the browser, down from 80'],
      ['STATUS', 'Live, code public'],
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
      note: 'the site ships in Russian',
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
        n: 'DECISION 01',
        title: 'No cart, no prices',
        body: [
          'The obvious move for a fashion site is commerce. I built the first structure with a product page, sizes and a buy button, then cut all of it. The moment a price appears, everything on the page becomes an argument for spending money. The photography starts selling, the copy starts persuading.',
          'Removing commerce freed the layout. Without a buy button there is no hierarchy to fight over, so the object could take the whole screen and the text could take its time.',
        ],
      },
      {
        n: 'DECISION 02',
        title: 'One object per month, not a catalogue',
        body: [
          'A catalogue was the safer option: more content and better search coverage. I chose the constraint instead. A single object per month forces every page to justify itself - there is no grid to hide a weak page in.',
          'The cost is real. Fewer pages means less traffic and a site that looks empty on launch. I accepted it because the concept collapses without the constraint.',
        ],
      },
      {
        n: 'DECISION 03',
        title: '3D in the browser, not more photos',
        body: [
          'Photography would have been faster and lighter. But the object is a shoe with a split toe, and its shape is the whole point - flat images kept losing it.',
          'The model came out of Blender at 80 MB, which is unusable on the web. Optimisation through gltf-transform with meshopt and WebP brought it to 3.3 MB. That number decided whether the feature shipped at all.',
        ],
      },
    ],
    screens: [
      ['01 HOME', 'index'],
      ['02 EXHIBITIONS', 'exhibitions'],
      ['03 STORIES', 'stories'],
      ['04 MANIFESTO', 'manifesto'],
      ['05 MATERIALS', 'materials'],
      ['06 SUBSCRIBE', 'subscribe'],
    ],
    system: [
      'Variables for colour, spacing and type scale. Components named for what they do, not where they sit. Auto layout throughout, so the intent survives handoff.',
      'The system was built to be read by a developer and by an agent. Tokens map to CSS variables one to one, which meant the build stayed close to the design without a translation step.',
    ],
    retro: [
      'The typography is set in Inter and JetBrains Mono, which was the safe choice and reads as one. A project about archival fashion deserved a face with more character.',
      'I also underestimated how much writing a single-object site needs. With no catalogue to browse, the text carries the whole experience, and I was still editing it after the build was done.',
    ],
    next: { slug: 'beta', title: 'BETA' },
  },

  {
    slug: 'beta',
    title: 'BETA',
    lead:
      'A landing page for a student design sprint. One page has to do the whole job - ' +
      'there is no second screen to move an objection to.',
    coverMeta: [
      ['ROLE', 'Team of 5 · UX + structure'],
      ['YEAR', '2026'],
      ['STATUS', 'Shipped'],
    ],
    facts: [
      ['FORMAT', 'One page, eight sections'],
      ['DURATION', '2 weeks, fixed'],
      ['TEAM', '5 people, 1 client'],
      ['OUTCOME', 'Shipped, structure held without a rewrite'],
    ],
    meta: [
      ['ROLE', 'UX structure, prototype, part of visual design'],
      ['TIMELINE', '2 weeks'],
      ['CLIENT', 'IT-Hub College'],
      ['STACK', 'Figma, HTML/CSS/JS'],
    ],
    frame: { project: 'beta' },
    brief: [
      'IT-Hub runs a two-week design sprint where students work with a real client instead of a made-up assignment. The landing page had to recruit the next intake.',
      'The audience knows the format is educational, and that is the problem. Student projects read as practice, and practice is easy to skip. The page needed to say the opposite: a deadline, a client, a public defence, a case you can actually show.',
    ],
    myRole: [
      'I worked on the information architecture and the prototype. Before anything was designed, we needed to know what a visitor asks in what order - what this is, how it runs, what they walk away with, who is behind it. That sequence became the page structure and it did not change after the first review.',
      'From there I built wireframes and a clickable prototype, which let the team test the flow and show the client something concrete before the visual design existed. I also worked on parts of the interface once the direction was set.',
      'Five people, and everyone carried their section. My job was mostly the skeleton: making sure the order made sense and the team had something to build against.',
    ],
    decisions: [
      {
        n: 'DECISION 01',
        title: 'Structure before visuals',
        body: [
          'The fast route is to open Figma and start designing screens. We spent the first days on the question sequence instead, which felt slow at the time. It paid off: when the visual direction changed mid-sprint, the structure held and nothing had to be rebuilt.',
        ],
      },
      {
        n: 'DECISION 02',
        title: 'Answering the objection, not hiding it',
        body: [
          '"Student project" is the first thing a visitor thinks and the hardest thing to argue with. We put it in the copy directly (not a course, a release) rather than dressing it up as something more corporate. Naming the doubt is faster than working around it.',
        ],
      },
      {
        n: 'DECISION 03',
        title: 'A prototype instead of a deck',
        body: [
          'Showing the client static screens invites comments on colour. A clickable prototype moves the conversation to the flow, which is what we actually needed feedback on at that stage.',
        ],
      },
    ],
    retro: [
      'The page shipped and the sprint ran. The structure I set survived the whole two weeks without a rewrite, which for a project this short was the thing that mattered.',
      'What I would do differently: we tested the flow inside the team, not on people from the actual audience. Two or three conversations with students who had never heard of the programme would have caught things we could not see from inside. I also left the copy for late in the sprint, and it needed more time than we gave it.',
      'Working with four other people taught me more than the design did. Agreeing on a structure is slower than deciding alone, and the result holds up better.',
    ],
    next: { slug: 'yakitoria', title: 'Yakitoria' },
  },

  {
    slug: 'yakitoria',
    title: 'Yakitoria',
    lead: 'A menu and cart redesign for a sushi delivery chain. Competition entry, third place out of 47 teams.',
    coverMeta: [
      ['ROLE', 'Solo · UX + UI'],
      ['YEAR', '2025'],
      ['AWARD', '3rd of 47'],
    ],
    facts: [
      ['RESULT', '3rd place, 47 teams'],
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
      'Three constraints. Keep the brand recognisable. Fit inside 60 developer hours. Work with the existing product range - the catalogue stays, the interface around it changes. The last one mattered most: this was not an invitation to redraw the site, it was a question about which mechanics move an order forward.',
    ],
    broken: [
      'The original menu listed dishes with a photo and a price, and stopped there.',
      'Reviews sat behind a separate tab, so nobody reached them. Filters sorted by calories and cooking time - neither is how anyone picks sushi. The product page had no upsell at all: you added a roll to the cart and the site let you go.',
      'Every one of these is a place where the order stops growing or the visitor leaves.',
    ],
    decisions: [
      {
        n: 'DECISION 01',
        title: 'Nutrition data next to the price',
        body: [
          'The audience counts calories whether the site shows them or not. Hiding the numbers does not remove the question, it just moves it somewhere the site cannot answer.',
          'The hypothesis: showing protein, fat and carbs will not scare people off. It removes a doubt at the moment of choosing, and people order what fits them instead of closing the tab to check elsewhere.',
        ],
      },
      {
        n: 'DECISION 02',
        title: 'Frequently ordered together',
        body: [
          'Sales data showed rolls going out with soups and gunkan more than anything else. The original site knew this and did nothing with it.',
          'I put the pairing on the product page as a visible block, not a footnote. This is the one change aimed directly at the brief: average order value.',
        ],
      },
      {
        n: 'DECISION 03',
        title: 'Filters people actually use',
        body: [
          'Calories and cooking time went out. Popularity and dish type went in.',
          'A filter is only useful if it matches how someone decides. Nobody browses sushi by cooking time. They browse by what kind of thing they want and what other people order.',
        ],
      },
      {
        n: 'DECISION 04',
        title: 'Reviews on the page, not behind a tab',
        body: [
          'A tab is a decision the visitor has to make before they get the information. Most do not make it.',
          'Moving reviews onto the product page puts social proof where the doubt is, at the point of adding to cart.',
        ],
      },
    ],
    screens: [
      ['01 MENU', 'menu'],
      ['02 PRODUCT PAGE', 'product'],
      ['03 REVIEWS', 'reviews'],
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
      'Third place out of 47 teams. The jury singled out the upsell block as the strongest conversion mechanic in the competition.',
      'What I would do differently: the judges flagged headings breaking on 375 width. It was a technical slip, an hour of work, and it was in the version I submitted. Small things like that are what separates a prototype from something a client can ship - and the brief was explicitly about shipping inside 60 hours.',
      'I also had sales data and used it for one decision. With more time I would have taken the same approach to the rest of the menu structure, not just the pairing block.',
    ],
    next: { slug: 'nichive', title: 'nichive' },
  },
];

export const caseBySlug = (slug: string) => cases.find((c) => c.slug === slug);
