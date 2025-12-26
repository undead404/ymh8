import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['apps/*/dist/**/*.js', 'packages/*/dist/**/*.js'],
    projects: ['apps/*', 'packages/*'],
  },
});
