import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Hook tests need a DOM; the algorithm tests are environment-agnostic.
    environment: 'jsdom',
    // Playback is driven by requestAnimationFrame, which jsdom only provides
    // when it is pretending to be a visual browser.
    environmentOptions: { jsdom: { pretendToBeVisual: true } },
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
