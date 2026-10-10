import 'dotenv/config'

/** Integration tests wipe their database, so refuse anything that is not clearly a test database. */
export function testDatabaseUrl(): string {
  const url =
    process.env.TEST_DATABASE_URL ??
    'postgresql://spotify:spotify@localhost:5432/spotify_test?schema=public'
  const database = new URL(url).pathname.slice(1)
  if (!database.endsWith('_test')) {
    throw new Error(
      `TEST_DATABASE_URL must point at a database ending in "_test" (got "${database}")`,
    )
  }
  return url
}
