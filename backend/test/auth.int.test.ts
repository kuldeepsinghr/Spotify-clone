import request, { type Response } from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/shared/db.js'
import { resetDatabase } from './fixtures.js'

type App = ReturnType<typeof createApp>
let app: App

const password = 'correct horse battery'

beforeEach(async () => {
  await resetDatabase()
  app = createApp()
})
afterAll(() => prisma.$disconnect())

function refreshCookie(res: Response) {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = raw?.find((value) => value.startsWith('refresh_token='))
  if (!cookie) throw new Error('response did not set the refresh cookie')
  return { header: cookie, pair: cookie.split(';')[0]! }
}

function expectNoSecrets(res: Response) {
  expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$argon2|tokenHash/)
}

async function register(email = 'listener@test.dev', displayName = 'Listener') {
  return request(app).post('/v1/auth/register').send({ email, password, displayName }).expect(201)
}

const login = (email: string, pass = password) =>
  request(app).post('/v1/auth/login').send({ email, password: pass })

const refresh = (cookie?: string) => {
  const req = request(app).post('/v1/auth/refresh')
  return cookie ? req.set('cookie', cookie) : req
}

describe('register', () => {
  it('creates a listener, returns an access token and sets an httpOnly refresh cookie', async () => {
    const res = await register('New.User@Test.dev')
    expectNoSecrets(res)
    expect(res.body.data).toMatchObject({
      user: { email: 'new.user@test.dev', displayName: 'Listener', role: 'user', artist: null },
      accessToken: expect.any(String),
      expiresIn: 900,
    })

    const { header } = refreshCookie(res)
    expect(header).toMatch(/HttpOnly/i)
    expect(header).toMatch(/Path=\/v1\/auth/)
    expect(header).toMatch(/SameSite=Lax/i)

    const me = await request(app)
      .get('/v1/me')
      .set('authorization', `Bearer ${res.body.data.accessToken}`)
      .expect(200)
    expect(me.body.data.email).toBe('new.user@test.dev')
    expectNoSecrets(me)
  })

  it('rejects duplicate emails regardless of case, and weak or short passwords', async () => {
    await register('dup@test.dev')
    const dup = await request(app)
      .post('/v1/auth/register')
      .send({ email: 'DUP@test.dev', password, displayName: 'Again' })
      .expect(409)
    expect(dup.body.error.code).toBe('EMAIL_TAKEN')

    const weak = await request(app)
      .post('/v1/auth/register')
      .send({ email: 'weak@test.dev', password: 'password123', displayName: 'Weak' })
      .expect(400)
    expect(weak.body.error.code).toBe('WEAK_PASSWORD')

    const personal = await request(app)
      .post('/v1/auth/register')
      .send({ email: 'jordan@test.dev', password: 'jordan-rocks-1', displayName: 'J' })
      .expect(400)
    expect(personal.body.error.code).toBe('WEAK_PASSWORD')

    const short = await request(app)
      .post('/v1/auth/register')
      .send({ email: 'short@test.dev', password: 'abc', displayName: 'Short' })
      .expect(400)
    expect(short.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('login', () => {
  it('gives the same answer for an unknown email and a wrong password', async () => {
    await register('known@test.dev')
    const wrong = await login('known@test.dev', 'not the password').expect(401)
    const unknown = await login('nobody@test.dev').expect(401)
    expect(wrong.body).toEqual(unknown.body)
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS')

    const ok = await login('KNOWN@test.dev').expect(200)
    expectNoSecrets(ok)
    expect(ok.body.data.accessToken).toEqual(expect.any(String))
  })

  it('rate-limits repeated attempts for one email', async () => {
    for (let i = 0; i < 5; i++) await login('target@test.dev', `guess ${i}`).expect(401)
    const limited = await login('target@test.dev').expect(429)
    expect(limited.body.error.code).toBe('RATE_LIMITED')
    expect(limited.headers).toHaveProperty('ratelimit-policy')
  })

  it('refuses disabled accounts, but only after the password is right', async () => {
    await register('banned@test.dev')
    await prisma.user.update({ where: { email: 'banned@test.dev' }, data: { isDisabled: true } })
    await login('banned@test.dev', 'not the password').expect(401)
    const res = await login('banned@test.dev').expect(403)
    expect(res.body.error.code).toBe('ACCOUNT_DISABLED')
  })
})

describe('refresh', () => {
  it('rotates the refresh token on every use', async () => {
    const first = refreshCookie(await register())
    const res = await refresh(first.pair).expect(200)
    const second = refreshCookie(res)
    expect(second.pair).not.toBe(first.pair)
    expect(res.body.data.accessToken).toEqual(expect.any(String))
    await refresh(second.pair).expect(200)
  })

  it('treats reuse of a rotated token as theft and revokes the whole family', async () => {
    const first = refreshCookie(await register())
    const second = refreshCookie(await refresh(first.pair).expect(200))
    await prisma.refreshToken.updateMany({
      where: { revokedAt: { not: null } },
      data: { revokedAt: new Date(Date.now() - 11_000) },
    })

    const reuse = await refresh(first.pair).expect(401)
    expect(reuse.body.error.code).toBe('REFRESH_TOKEN_REUSED')
    expect(refreshCookie(reuse).header).toMatch(/Expires=Thu, 01 Jan 1970/)

    const after = await refresh(second.pair).expect(401)
    expect(after.body.error.code).toBe('REFRESH_TOKEN_REUSED')
  })

  it('lets two tabs refresh with the same cookie at the same moment', async () => {
    const cookie = refreshCookie(await register())
    const [a, b] = await Promise.all([refresh(cookie.pair), refresh(cookie.pair)])
    expect([a.status, b.status]).toEqual([200, 200])
    await refresh(refreshCookie(a).pair).expect(200)
    await refresh(refreshCookie(b).pair).expect(200)
  })

  it('a just-rotated token can still be exchanged, but not after logout', async () => {
    const first = refreshCookie(await register())
    const second = refreshCookie(await refresh(first.pair).expect(200))
    await refresh(first.pair).expect(200)

    await request(app).post('/v1/auth/logout').set('cookie', second.pair).expect(204)
    expect((await refresh(first.pair).expect(401)).body.error.code).toBe('REFRESH_TOKEN_REUSED')
  })

  it('rejects missing, unknown and expired tokens', async () => {
    expect((await refresh().expect(401)).body.error.code).toBe('REFRESH_TOKEN_INVALID')
    await refresh('refresh_token=made-up').expect(401)

    const cookie = refreshCookie(await register())
    await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } })
    expect((await refresh(cookie.pair).expect(401)).body.error.code).toBe('REFRESH_TOKEN_INVALID')
  })

  it('rejects cookie requests from origins that are not allowed', async () => {
    const cookie = refreshCookie(await register())
    await refresh(cookie.pair).set('origin', 'https://evil.example').expect(403)
    await refresh(cookie.pair).set('origin', 'http://localhost:5173').expect(200)
  })

  it('stops working once the account is disabled', async () => {
    const cookie = refreshCookie(await register('soon-banned@test.dev'))
    await prisma.user.update({
      where: { email: 'soon-banned@test.dev' },
      data: { isDisabled: true },
    })
    expect((await refresh(cookie.pair).expect(403)).body.error.code).toBe('ACCOUNT_DISABLED')
  })
})

describe('logout', () => {
  it('ends this device’s session and clears the cookie', async () => {
    const cookie = refreshCookie(await register())
    const res = await request(app).post('/v1/auth/logout').set('cookie', cookie.pair).expect(204)
    expect(refreshCookie(res).header).toMatch(/Expires=Thu, 01 Jan 1970/)
    await refresh(cookie.pair).expect(401)
    await request(app).post('/v1/auth/logout').expect(204)
  })

  it('logout-all ends every session for the account', async () => {
    const registered = await register('multi@test.dev')
    const laptop = refreshCookie(registered)
    const phone = refreshCookie(await login('multi@test.dev').expect(200))

    await request(app)
      .post('/v1/auth/logout-all')
      .set('authorization', `Bearer ${registered.body.data.accessToken}`)
      .expect(204)
    await refresh(laptop.pair).expect(401)
    await refresh(phone.pair).expect(401)
    await request(app).post('/v1/auth/logout-all').expect(401)
  })
})

describe('access tokens', () => {
  it('rejects tampered, malformed and orphaned tokens', async () => {
    const { accessToken } = (await register('tokens@test.dev')).body.data
    const tampered = `${accessToken.slice(0, -2)}xx`
    expect(
      (await request(app).get('/v1/me').set('authorization', `Bearer ${tampered}`).expect(401)).body
        .error.code,
    ).toBe('UNAUTHENTICATED')
    await request(app).get('/v1/me').set('authorization', accessToken).expect(401)
    await request(app).get('/v1/me').set('authorization', 'Bearer').expect(401)

    await prisma.user.delete({ where: { email: 'tokens@test.dev' } })
    await request(app).get('/v1/me').set('authorization', `Bearer ${accessToken}`).expect(401)
  })

  it('rejects a disabled account’s token on the next request', async () => {
    const { accessToken } = (await register('next@test.dev')).body.data
    await prisma.user.update({ where: { email: 'next@test.dev' }, data: { isDisabled: true } })
    const res = await request(app)
      .get('/v1/me')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(403)
    expect(res.body.error.code).toBe('ACCOUNT_DISABLED')
  })
})

describe('/v1/me', () => {
  it('updates the profile but not the role', async () => {
    const auth = `Bearer ${(await register()).body.data.accessToken}`
    const res = await request(app)
      .patch('/v1/me')
      .set('authorization', auth)
      .send({ displayName: 'Renamed' })
      .expect(200)
    expect(res.body.data.displayName).toBe('Renamed')

    await request(app)
      .patch('/v1/me')
      .set('authorization', auth)
      .send({ role: 'admin' })
      .expect(400)
    await request(app)
      .patch('/v1/me')
      .set('authorization', auth)
      .send({ avatarUrl: 'http://insecure.test/a.png' })
      .expect(400)
  })

  it('changing the password signs out other sessions and keeps this one', async () => {
    const registered = await register('change@test.dev')
    const other = refreshCookie(await login('change@test.dev').expect(200))
    const auth = `Bearer ${registered.body.data.accessToken}`

    await request(app)
      .post('/v1/me/password')
      .set('authorization', auth)
      .send({ currentPassword: 'wrong one', newPassword: 'a brand new phrase' })
      .expect(400)

    const res = await request(app)
      .post('/v1/me/password')
      .set('authorization', auth)
      .send({ currentPassword: password, newPassword: 'a brand new phrase' })
      .expect(200)
    expectNoSecrets(res)
    const current = refreshCookie(res)

    await refresh(other.pair).expect(401)
    await refresh(current.pair).expect(200)
    await login('change@test.dev').expect(401)
    await login('change@test.dev', 'a brand new phrase').expect(200)
  })
})
