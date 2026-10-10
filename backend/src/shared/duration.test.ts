import { describe, expect, it } from 'vitest'
import { formatLegacyDuration, parseLegacyDuration } from './duration.js'

describe('parseLegacyDuration', () => {
  it.each([
    ['3:58', 238_000],
    ['3:5', 185_000],
    ['0:00', 0],
    ['12:30', 750_000],
    [' 1:01 ', 61_000],
  ])('parses %j', (text, ms) => {
    expect(parseLegacyDuration(text)).toBe(ms)
  })

  it.each(['', '3', '3:60', 'a:bc', '3:005', '-1:00'])('rejects %j', (text) => {
    expect(parseLegacyDuration(text)).toBeNull()
  })
})

describe('formatLegacyDuration', () => {
  it('pads seconds', () => {
    expect(formatLegacyDuration(185_000)).toBe('3:05')
    expect(formatLegacyDuration(185_999)).toBe('3:05')
    expect(formatLegacyDuration(0)).toBe('0:00')
  })
})
