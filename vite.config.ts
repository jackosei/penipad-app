/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// pdf.js fetches these lazily at runtime (CJK character maps, the 14 standard
// fonts, wasm image codecs, ICC profiles). Copying them into our bundle keeps
// every request same-origin: no CDN, fully offline (CLAUDE.md "PDF worker").
const PDFJS_DIR = 'node_modules/pdfjs-dist';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: `${PDFJS_DIR}/cmaps/*`, dest: 'pdf-assets/cmaps' },
        { src: `${PDFJS_DIR}/standard_fonts/*`, dest: 'pdf-assets/standard_fonts' },
        { src: `${PDFJS_DIR}/wasm/*`, dest: 'pdf-assets/wasm' },
        { src: `${PDFJS_DIR}/iccs/*`, dest: 'pdf-assets/iccs' },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    benchmark: {
      include: ['bench/**/*.bench.ts'],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // The ink engine is the system of record; hold it to a high bar.
      include: ['src/engine/**', 'src/db/**', 'src/utils/**'],
    },
  },
});
