import { z } from 'zod'
import { AppError, ErrorCode } from './errors.js'

export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100

export const pageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  cursor: z.string().min(1).max(500).optional(),
})

export type PageRequest = z.infer<typeof pageQuerySchema>

export interface Page<T> {
  items: T[]
  limit: number
  nextCursor: string | null
}

/** Cursors are opaque to clients: base64url-encoded JSON. */
export function encodeCursor(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

export function decodeCursor<T>(cursor: string, schema: z.ZodType<T>): T {
  try {
    return schema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')))
  } catch {
    throw new AppError(400, ErrorCode.INVALID_CURSOR, 'cursor is invalid or expired')
  }
}

export const idCursorSchema = z.object({ id: z.string().uuid() })
export const offsetCursorSchema = z.object({ offset: z.number().int().min(0).max(10_000) })

/** Prisma arguments that start a query after the row with this ID. */
export const startAfter = (afterId?: string): { cursor?: { id: string }; skip?: number } =>
  afterId ? { cursor: { id: afterId }, skip: 1 } : {}

/** Decodes an ID cursor into the row ID that the next page starts after. */
export const afterIdFrom = (request: PageRequest) =>
  request.cursor ? decodeCursor(request.cursor, idCursorSchema).id : undefined

/**
 * Builds a page from rows fetched with `take: limit + 1`.
 * The extra row only signals that another page exists; it is not returned.
 */
export function toIdPage<T extends { id: string }>(rows: T[], limit: number): Page<T> {
  const items = rows.slice(0, limit)
  const last = items.at(-1)
  return {
    items,
    limit,
    nextCursor: rows.length > limit && last ? encodeCursor({ id: last.id }) : null,
  }
}

export function toOffsetPage<T>(rows: T[], limit: number, offset: number): Page<T> {
  return {
    items: rows.slice(0, limit),
    limit,
    nextCursor: rows.length > limit ? encodeCursor({ offset: offset + limit }) : null,
  }
}
