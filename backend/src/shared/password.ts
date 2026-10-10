import argon2 from 'argon2'
import { z } from 'zod'
import { AppError, ErrorCode } from './errors.js'

export const PASSWORD_MIN = 10
/** argon2 cost grows with input length; cap it so huge bodies cannot burn CPU. */
export const PASSWORD_MAX = 128

export const passwordSchema = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX)

const COMMON_PASSWORDS = new Set([
  '1234567890',
  '0123456789',
  '1111111111',
  '0000000000',
  '1234554321',
  '1q2w3e4r5t',
  'qwertyuiop',
  'asdfghjkl;',
  'password12',
  'password123',
  'password1234',
  'passw0rd12',
  'iloveyou12',
  'qwerty1234',
  'qwerty12345',
  'abcdefghij',
  'abc1234567',
  'letmein123',
  'welcome123',
  'admin12345',
  'administrator',
  'sunshine12',
  'football12',
  'baseball12',
  'princess12',
  'dragon1234',
  'monkey1234',
  'spotify123',
  'spotify1234',
  'music12345',
  'changeme12',
  'trustno1234',
])

/** Rejects passwords that are common or built from the account's own email or name. */
export function assertStrongPassword(password: string, personal: string[] = []) {
  const lower = password.toLowerCase()
  const fromPersonal = personal
    .map((value) => value.toLowerCase().trim())
    .filter((value) => value.length >= 4)
    .some((value) => lower.includes(value))
  const oneCharacter = new Set(lower).size <= 2

  if (COMMON_PASSWORDS.has(lower) || fromPersonal || oneCharacter) {
    throw new AppError(400, ErrorCode.WEAK_PASSWORD, 'Choose a less common password')
  }
}

export const hashPassword = (password: string) => argon2.hash(password, { type: argon2.argon2id })

export async function verifyPassword(hash: string, password: string) {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

let dummyHash: Promise<string> | undefined

/**
 * Verifies against a throwaway hash when the email is unknown,
 * so "no such user" takes as long as "wrong password".
 */
export async function verifyAgainstDummy(password: string) {
  dummyHash ??= hashPassword('dummy-password-for-timing')
  await verifyPassword(await dummyHash, password)
  return false
}
