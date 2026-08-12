/**
 * The sitemap, built from the same case list the pages are built from.
 *
 * Written as a route rather than a static file so it cannot fall behind: add a
 * case and it appears here without anyone remembering to. Each URL carries its
 * alternates, which is what tells a search engine the two language versions
 * are the same page rather than duplicates of each other.
 */
import type { APIRoute } from 'astro';
import { cases } from '../data/cases';

const SITE = 'https://kuixl.github.io';

export const GET: APIRoute = () => {
  const paths = ['/', ...cases.map((c) => `/${c.slug}`)];

  const urls = paths
    .flatMap((p) => [p, p === '/' ? '/ru' : `/ru${p}`])
    .map((loc) => {
      const bare = loc.replace(/^\/ru/, '') || '/';
      const ru = bare === '/' ? '/ru' : `/ru${bare}`;
      return `  <url>
    <loc>${SITE}${loc}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${bare}"/>
    <xhtml:link rel="alternate" hreflang="ru" href="${SITE}${ru}"/>
    <changefreq>monthly</changefreq>
  </url>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
