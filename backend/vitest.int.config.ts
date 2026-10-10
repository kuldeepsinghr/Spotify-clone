import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.int.test.ts', 'test/**/*.int.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup-env.ts'],
    // Integration tests share one database, so files must not run in parallel.
    fileParallelism: false,
    hookTimeout: 60_000,
  },
})
