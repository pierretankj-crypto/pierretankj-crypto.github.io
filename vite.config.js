import { defineConfig } from 'vite';

// Relative base so the build works from a GitHub Pages sub-path.
export default defineConfig({
  base: './',
  server: { port: 5173, strictPort: true, host: '127.0.0.1' },
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
