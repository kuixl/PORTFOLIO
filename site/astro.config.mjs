import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  /**
   * The site lives at the root of a domain, not in a subfolder.
   *
   * `base` was set to '/PORTFOLIO/' to serve the build from a project
   * repository, which cannot work here for two reasons. GitHub serves a
   * project page from the repository name in lower case, so '/PORTFOLIO/'
   * would not have matched '/portfolio/' anyway. And every absolute path in
   * this project assumes the root: canonical links, hreflang, the sitemap,
   * the social cards, the fonts, the captures, the art the preloader fetches.
   * Prefixing all of them is a lot of surface to get wrong for no gain, so the
   * build targets the root and the repository is named for the domain.
   */
  site: 'https://kuixl.github.io',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
