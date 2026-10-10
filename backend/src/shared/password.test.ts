import { describe, expect, it } from 'vitest'
import { AppError } from './errors.js'
import { assertStrongPassword, hashPassword, verifyPassword } from './password.js'

describe('assertStrongPassword', () => {
  it.each(['password123', 'Qwertyuiop', 'aaaaaaaaaa', 'ababababab'])('rejects %j', (password) => {
    expect(() => assertStrongPassword(password)).toThrow(AppError)
  })

  it('rejects passwords containing the email name or display name', () => {
    expect(() => assertStrongPassword('kuldeep-rocks-2026', ['kuldeep'])).toThrow(AppError)
  })

  it('accepts a reasonable passphrase', () => {
    expect(() => assertStrongPassword('correct horse battery', ['kuldeep'])).not.toThrow()
  })
})

describe('hashPassword', () => {
  it('produces argon2id hashes that verify', async () => {
    const hash = await hashPassword('correct horse battery')
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(await verifyPassword(hash, 'correct horse battery')).toBe(true)
    expect(await verifyPassword(hash, 'wrong')).toBe(false)
    expect(await verifyPassword('not-a-hash', 'anything')).toBe(false)
  })
})
