import { describe, expect, it } from 'vitest'
import { concat, encryptPayload, fromBase64Url, hkdf, isPushEndpoint, toBase64Url, vapidAuthorization } from './webpush'

const text = new TextEncoder()

/** The browser's side of RFC 8291, written out separately: decrypt one aes128gcm message. */
async function decrypt(body: Uint8Array, uaKeys: CryptoKeyPair, authSecret: Uint8Array): Promise<string> {
  const salt = body.slice(0, 16)
  const rs = new DataView(body.buffer, body.byteOffset).getUint32(16)
  const idLength = body[20]
  const asPublic = body.slice(21, 21 + idLength)
  const cipher = body.slice(21 + idLength)
  expect(rs).toBe(4096)

  const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', uaKeys.publicKey))
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, uaKeys.privateKey, 256))
  const ikm = await hkdf(authSecret, secret, concat(text.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const cek = await hkdf(salt, ikm, text.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, text.encode('Content-Encoding: nonce\0'), 12)
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt'])
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, cipher))
  expect(plain[plain.length - 1]).toBe(2)
  return new TextDecoder().decode(plain.slice(0, -1))
}

const newEcdhKeys = () => crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as Promise<CryptoKeyPair>

/** A P-256 key pair from a raw public key and private scalar (both base64url). */
async function keyPairFrom(publicKey: string, privateKey: string): Promise<CryptoKeyPair> {
  const pub = fromBase64Url(publicKey)
  const jwk = { kty: 'EC', crv: 'P-256', x: toBase64Url(pub.slice(1, 33)), y: toBase64Url(pub.slice(33)), ext: true }
  return {
    publicKey: await crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []),
    privateKey: await crypto.subtle.importKey('jwk', { ...jwk, d: privateKey }, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']),
  }
}

describe('base64url', () => {
  it('round-trips bytes without padding', () => {
    const bytes = Uint8Array.from([0, 251, 255, 62, 63, 1])
    expect(toBase64Url(bytes)).not.toMatch(/[+/=]/)
    expect([...fromBase64Url(toBase64Url(bytes))]).toEqual([...bytes])
  })
})

describe('payload encryption', () => {
  it('can be read by the browser it is meant for', async () => {
    const ua = await newEcdhKeys()
    const auth = crypto.getRandomValues(new Uint8Array(16))
    const subscription = { p256dh: toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey))), auth: toBase64Url(auth) }
    const message = JSON.stringify({ title: 'Get off the couch', body: 'Ana says it is time to train.' })
    const body = await encryptPayload(text.encode(message), subscription)
    expect(await decrypt(body, ua, auth)).toBe(message)
  })

  it('cannot be read with another auth secret', async () => {
    const ua = await newEcdhKeys()
    const auth = crypto.getRandomValues(new Uint8Array(16))
    const subscription = { p256dh: toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey))), auth: toBase64Url(auth) }
    const body = await encryptPayload(text.encode('secret'), subscription)
    await expect(decrypt(body, ua, crypto.getRandomValues(new Uint8Array(16)))).rejects.toThrow()
  })

  it('matches the example in RFC 8291', async () => {
    const asKeys = await keyPairFrom(
      'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
      'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
    )
    const body = await encryptPayload(
      text.encode('When I grow up, I want to be a watermelon'),
      { p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' },
      { salt: fromBase64Url('DGv6ra1nlYgDCS1FRnbzlw'), localKeys: asKeys },
    )
    expect(toBase64Url(body)).toBe(
      'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
    )
  })

  it('refuses broken keys', async () => {
    await expect(encryptPayload(text.encode('x'), { p256dh: 'AAAA', auth: 'AAAA' })).rejects.toThrow()
  })
})

describe('VAPID', () => {
  it('signs a token the push service can check with our public key', async () => {
    const keys = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
    const publicKey = toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey)))
    const privateKey = (await crypto.subtle.exportKey('jwk', keys.privateKey)).d!
    const now = Date.UTC(2026, 10, 19, 12)
    const header = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', { publicKey, privateKey, subject: 'mailto:test@example.com' }, now)

    const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!
    expect(k).toBe(publicKey)
    const [head, claims, signature] = token.split('.')
    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(claims)))).toEqual({
      aud: 'https://fcm.googleapis.com',
      exp: now / 1000 + 12 * 3600,
      sub: 'mailto:test@example.com',
    })
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, keys.publicKey, fromBase64Url(signature), text.encode(`${head}.${claims}`))
    expect(ok).toBe(true)
  })
})

describe('endpoints', () => {
  it('only sends to real push services', () => {
    expect(isPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true)
    expect(isPushEndpoint('https://web.push.apple.com/QGx')).toBe(true)
    expect(isPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true)
    expect(isPushEndpoint('https://wns2-par02p.notify.windows.com/w/?token=x')).toBe(true)
    expect(isPushEndpoint('http://fcm.googleapis.com/fcm/send/abc')).toBe(false)
    expect(isPushEndpoint('https://evil.example/fcm.googleapis.com/')).toBe(false)
    expect(isPushEndpoint('https://fcm.googleapis.com.evil.example/x')).toBe(false)
    expect(isPushEndpoint('https://169.254.169.254/latest')).toBe(false)
  })
})
