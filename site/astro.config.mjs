import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // absolute URLs for canonical links and social cards; the deploy target is
  // the user's own github.io root, so there is no base path
  site: 'https://kuixl.github.io',
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
