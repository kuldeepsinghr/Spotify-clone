import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    exclude: ['**/*.int.test.ts', 'node_modules', 'dist'],
    env: { NODE_ENV: 'test', LOG_LEVEL: 'silent' },
  },
})
