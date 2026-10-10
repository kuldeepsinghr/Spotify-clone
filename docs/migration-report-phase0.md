# MongoDB to PostgreSQL migration report (Phase 0, M2)

- Date: 2026-10-10
- Source: catalog exported from the hosted legacy API (`npm run backup:legacy`), because the production MongoDB was not reachable. The same export was also loaded into the local `mongo` container and migrated with `--source mongo` to prove the direct path.
- Target: local PostgreSQL 16 in Docker
- Rules: all albums attached to a placeholder artist, "Unknown Artist" (decision 7). Songs are linked to albums by exact name; unmatched or ambiguous songs are reported, not guessed. Track numbers follow the original insertion order taken from the ObjectId timestamps.

## Counts

| | In (Mongo) | Out (PostgreSQL) |
| --- | --- | --- |
| Albums | 5 | 5 |
| Songs / tracks | 3 | 3 |
| Artists | 0 | 1 (placeholder) |

## Issues

None. Every song matched exactly one album and every duration parsed.

## Verification

| Check | Result | Detail |
| --- | --- | --- |
| album count | pass | expected 5, found 5 |
| track count | pass | expected 3, found 3 |
| track artist matches album artist | pass | all match |
| spot check of random tracks | pass | title, audio URL, duration and album match the source |
| re-run | pass | a second `--apply` updated the same rows; counts unchanged |

## Re-running against the real database

Put the production `MONGODB_URI` in `backend/.env`, then:

```sh
cd backend
npm run migrate:mongo -- --source mongo            # dry run, writes nothing
npm run migrate:mongo -- --source mongo --apply    # one transaction, then verify
```

Keep the export in `backups/` (ignored by git) until Phase 0 is signed off.
