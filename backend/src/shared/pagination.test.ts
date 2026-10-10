import { describe, expect, it } from 'vitest'
import { AppError } from './errors.js'
import {
  decodeCursor,
  encodeCursor,
  idCursorSchema,
  pageQuerySchema,
  toIdPage,
  toOffsetPage,
} from './pagination.js'

const id = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`

describe('pageQuerySchema', () => {
  it('defaults and coerces query strings', () => {
    expect(pageQuerySchema.parse({})).toEqual({ limit: 20 })
    expect(pageQuerySchema.parse({ limit: '5' })).toEqual({ limit: 5 })
  })

  it('rejects limits outside 1..100', () => {
    expect(pageQuerySchema.safeParse({ limit: '0' }).success).toBe(false)
    expect(pageQuerySchema.safeParse({ limit: '101' }).success).toBe(false)
  })
})

describe('cursors', () => {
  it('round-trips', () => {
    const cursor = encodeCursor({ id: id(1) })
    expect(decodeCursor(cursor, idCursorSchema)).toEqual({ id: id(1) })
  })

  it.each(['not-base64-json', encodeCursor({ id: 'not-a-uuid' }), encodeCursor({ offset: 3 })])(
    'rejects %j with INVALID_CURSOR',
    (cursor) => {
      expect(() => decodeCursor(cursor, idCursorSchema)).toThrow(AppError)
    },
  )
})

describe('toIdPage', () => {
  it('drops the look-ahead row and points the cursor at the last returned row', () => {
    const rows = [1, 2, 3].map((n) => ({ id: id(n) }))
    const page = toIdPage(rows, 2)
    expect(page.items).toEqual(rows.slice(0, 2))
    expect(decodeCursor(page.nextCursor!, idCursorSchema)).toEqual({ id: id(2) })
  })

  it('has no cursor on the last page', () => {
    expect(toIdPage([{ id: id(1) }], 2).nextCursor).toBeNull()
  })
})

describe('toOffsetPage', () => {
  it('advances the offset by the limit', () => {
    const page = toOffsetPage(['a', 'b', 'c'], 2, 4)
    expect(page.items).toEqual(['a', 'b'])
    expect(JSON.parse(Buffer.from(page.nextCursor!, 'base64url').toString())).toEqual({ offset: 6 })
  })
})
