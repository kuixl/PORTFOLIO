import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://kuixl.github.io',
  base: '/PORTFOLIO/', 
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
});