// Web Push with nothing but WebCrypto, so it runs in Deno (Edge Functions) and
// in Node (unit tests): payload encryption per RFC 8291 (aes128gcm, RFC 8188)
// and VAPID authentication per RFC 8292.

export interface Subscription {
  endpoint: string
  /** The browser's P-256 public key, base64url (65 bytes uncompressed). */
  p256dh: string
  /** The browser's auth secret, base64url (16 bytes). */
  auth: string
}

export interface VapidKeys {
  /** Uncompressed P-256 public key, base64url (65 bytes). */
  publicKey: string
  /** The private scalar d, base64url (32 bytes). */
  privateKey: string
  /** mailto: or https: contact for the push service. */
  subject: string
}

const text = new TextEncoder()

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(base64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

/** HKDF-SHA-256 (RFC 5869), `length` bytes. */
export async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: info as BufferSource }, key, length * 8)
  return new Uint8Array(bits)
}

const importPublicEcdh = (raw: Uint8Array) =>
  crypto.subtle.importKey('raw', raw as BufferSource, { name: 'ECDH', namedCurve: 'P-256' }, false, [])

/**
 * Encrypts a payload for one subscription (a single aes128gcm record). `salt` and
 * `localKeys` are only passed in tests; normally both are fresh for every message.
 */
export async function encryptPayload(
  payload: Uint8Array,
  subscription: Pick<Subscription, 'p256dh' | 'auth'>,
  options: { salt?: Uint8Array; localKeys?: CryptoKeyPair } = {},
): Promise<Uint8Array> {
  const uaPublic = fromBase64Url(subscription.p256dh)
  const authSecret = fromBase64Url(subscription.auth)
  if (uaPublic.length !== 65 || authSecret.length !== 16) throw new Error('Invalid subscription keys')

  const localKeys =
    options.localKeys ?? ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair)
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', localKeys.publicKey))
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: await importPublicEcdh(uaPublic) }, localKeys.privateKey, 256),
  )

  const ikm = await hkdf(authSecret, ecdhSecret, concat(text.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, text.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, text.encode('Content-Encoding: nonce\0'), 12)

  // One record: the payload, then the 0x02 "last record" delimiter, no padding.
  const record = concat(payload, new Uint8Array([2]))
  const rs = 4096
  if (record.length + 16 > rs) throw new Error('Payload too large')
  const key = await crypto.subtle.importKey('raw', cek as BufferSource, 'AES-GCM', false, ['encrypt'])
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, key, record as BufferSource))

  const header = new Uint8Array(16 + 4 + 1 + asPublic.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, rs)
  header[20] = asPublic.length
  header.set(asPublic, 21)
  return concat(header, cipher)
}

/** The VAPID `Authorization` header for an endpoint: a signed ES256 JWT plus our public key. */
export async function vapidAuthorization(endpoint: string, vapid: VapidKeys, now = Date.now()): Promise<string> {
  const pub = fromBase64Url(vapid.publicKey)
  if (pub.length !== 65) throw new Error('Invalid VAPID public key')
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: toBase64Url(pub.slice(1, 33)), y: toBase64Url(pub.slice(33, 65)), d: vapid.privateKey, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const json = (value: unknown) => toBase64Url(text.encode(JSON.stringify(value)))
  // Push services accept at most 24 h; 12 h leaves room for clock skew.
  const unsigned = `${json({ typ: 'JWT', alg: 'ES256' })}.${json({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: vapid.subject })}`
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, text.encode(unsigned) as BufferSource))
  return `vapid t=${unsigned}.${toBase64Url(signature)}, k=${vapid.publicKey}`
}

/** Push services this app sends to; anything else is refused (no requests to arbitrary URLs). */
export function isPushEndpoint(endpoint: string): boolean {
  return /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//.test(endpoint)
}

export interface PushOptions {
  /** Seconds the push service keeps the message for an offline phone. */
  ttl?: number
  urgency?: 'very-low' | 'low' | 'normal' | 'high'
  /** A newer message with the same topic replaces one still waiting (base64url, <= 32 chars). */
  topic?: string
}

/** Sends one message. Resolves to the push service's status: 201 = accepted, 404 / 410 = subscription gone. */
export async function sendPush(subscription: Subscription, message: unknown, vapid: VapidKeys, options: PushOptions = {}): Promise<number> {
  if (!isPushEndpoint(subscription.endpoint)) return 400
  const body = await encryptPayload(text.encode(JSON.stringify(message)), subscription)
  const headers: Record<string, string> = {
    Authorization: await vapidAuthorization(subscription.endpoint, vapid),
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: String(options.ttl ?? 24 * 3600),
    Urgency: options.urgency ?? 'normal',
  }
  if (options.topic) headers.Topic = options.topic
  const response = await fetch(subscription.endpoint, { method: 'POST', headers, body: body as BodyInit })
  await response.body?.cancel()
  return response.status
}
