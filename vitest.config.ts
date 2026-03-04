import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, 'src') + '/',
      '@modules/': path.resolve(__dirname, 'src/modules') + '/',
      '@utils/': path.resolve(__dirname, 'src/utils') + '/',
      '@types': path.resolve(__dirname, 'src/types/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
});
