import { testDatabaseUrl } from './test-db-url.js'

// Runs before any app module is imported, so config/env.ts sees the test database.
process.env.DATABASE_URL = testDatabaseUrl()
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'silent'
