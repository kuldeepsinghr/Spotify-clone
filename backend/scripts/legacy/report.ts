import type { MigrationPlan } from './transform.js'
import type { CheckResult } from './verify.js'

export function renderReport(input: {
  source: string
  mode: 'dry run' | 'applied' | 'verify only'
  plan: MigrationPlan
  checks?: CheckResult[]
}): string {
  const { plan } = input
  const lines = [
    `# MongoDB to PostgreSQL migration report`,
    '',
    `- Date: ${new Date().toISOString()}`,
    `- Source: ${input.source}`,
    `- Mode: ${input.mode}`,
    '',
    '## Counts',
    '',
    '| | In (Mongo) | Out (PostgreSQL) |',
    '| --- | --- | --- |',
    `| Albums | ${plan.counts.albumsIn} | ${plan.counts.albumsOut} |`,
    `| Songs / tracks | ${plan.counts.songsIn} | ${plan.counts.tracksOut} |`,
    '',
    '## Issues',
    '',
  ]

  if (plan.issues.length === 0) {
    lines.push('None.')
  } else {
    lines.push('| Severity | Kind | Legacy ID | Detail |', '| --- | --- | --- | --- |')
    for (const issue of plan.issues) {
      lines.push(`| ${issue.severity} | ${issue.kind} | ${issue.legacyId} | ${issue.detail} |`)
    }
  }

  if (input.checks) {
    lines.push('', '## Verification', '', '| Check | Result | Detail |', '| --- | --- | --- |')
    for (const check of input.checks) {
      lines.push(`| ${check.name} | ${check.passed ? 'pass' : 'FAIL'} | ${check.detail} |`)
    }
  }

  return lines.join('\n') + '\n'
}
