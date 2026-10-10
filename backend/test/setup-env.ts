import { testDatabaseUrl } from './test-db-url.js'

// Runs before any app module is imported, so config/env.ts sees the test database.
process.env.DATABASE_URL = testDatabaseUrl()
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'silent'
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789abcdefghijklmnop'
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-0123456789abcdefghijklmnop'
process.env.COOKIE_SECURE = 'false'
process.env.GUEST_PREVIEW_SECONDS = '30'
process.env.TRUST_PROXY = '0'
process.env.CORS_ORIGINS = 'http://localhost:5173,http://localhost:5174'
