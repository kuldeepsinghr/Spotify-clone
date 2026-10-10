/**
 * Moves the legacy catalog from MongoDB (or a JSON export of it) into PostgreSQL.
 * Dry run by default: it prints and saves a report and writes nothing.
 *
 *   npm run migrate:mongo -- --source file --file ../backups/legacy-....json
 *   npm run migrate:mongo -- --source mongo                 (reads MONGODB_URI)
 *   npm run migrate:mongo -- --source file --file ... --apply
 *
 * Flags:
 *   --apply                write inside one transaction, then verify
 *   --orphans-to-singles   put songs whose album name matches nothing into a "Singles" album
 *   --force                apply even if the report lists skipped records
 *   --mongo-db <name>      database name for --source mongo (default "spotify")
 */
import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { PrismaClient } from '@prisma/client'
import { applyPlan } from './legacy/apply.js'
import { renderReport } from './legacy/report.js'
import { loadFromFile, loadFromMongo, type LegacyData } from './legacy/source.js'
import { hasBlockingIssues, planMigration } from './legacy/transform.js'
import { verifyPlan } from './legacy/verify.js'

const { values } = parseArgs({
  options: {
    source: { type: 'string', default: 'file' },
    file: { type: 'string' },
    'mongo-db': { type: 'string', default: 'spotify' },
    apply: { type: 'boolean', default: false },
    'verify-only': { type: 'boolean', default: false },
    'orphans-to-singles': { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    'report-dir': { type: 'string', default: path.resolve(import.meta.dirname, '../../backups') },
  },
})

async function load(): Promise<LegacyData> {
  if (values.source === 'mongo') {
    const uri = process.env.MONGODB_URI
    if (!uri) throw new Error('Set MONGODB_URI to read from MongoDB')
    return loadFromMongo(uri, values['mongo-db']!)
  }
  if (values.source === 'file') {
    if (!values.file)
      throw new Error('Pass --file <export.json> (create one with `npm run backup:legacy`)')
    return loadFromFile(path.resolve(values.file))
  }
  throw new Error(`Unknown --source "${values.source}"; use "file" or "mongo"`)
}

const data = await load()
const plan = planMigration(data.albums, data.songs, {
  orphansToSingles: values['orphans-to-singles'],
})
const blocked = hasBlockingIssues(plan)

const mode = values['verify-only'] ? 'verify only' : values.apply ? 'applied' : 'dry run'
let checks
let exitCode = 0

if (mode !== 'dry run') {
  if (mode === 'applied' && blocked && !values.force) {
    console.error(
      'The report lists skipped records. Fix the data, use --orphans-to-singles, or pass --force.',
    )
    exitCode = 1
  } else {
    const prisma = new PrismaClient()
    try {
      if (mode === 'applied') {
        const result = await applyPlan(prisma, plan)
        console.log(`Wrote ${result.albums} albums and ${result.tracks} tracks`)
      }
      checks = await verifyPlan(prisma, plan)
      if (checks.some((c) => !c.passed)) exitCode = 1
    } finally {
      await prisma.$disconnect()
    }
  }
}

const report = renderReport({ source: data.description, mode, plan, checks })
console.log(report)

await mkdir(values['report-dir']!, { recursive: true })
const reportFile = path.join(
  values['report-dir']!,
  `migration-report-${new Date().toISOString().replace(/[:.]/g, '-')}.md`,
)
await writeFile(reportFile, report)
console.log(`Report saved to ${reportFile}`)
if (mode === 'dry run' && blocked)
  console.log('Dry run found skipped records; resolve them before --apply.')

process.exitCode = exitCode
