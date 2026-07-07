// ============================================
// Local session token — signs/verifies the
// simdir_session_local cookie payload.
//
// Implemented with the Web Crypto API (not the `jsonwebtoken` package)
// because this is imported by middleware.js, which runs in the Edge
// Runtime — `jsonwebtoken` depends on Node-only APIs that don't work there.
// Web Crypto (crypto.subtle) is available in both the Edge Runtime and
// Node, so the same code works for signing (API route) and verifying
// (middleware).
//
// Uses its own SESSION_SECRET (not LEGACY_JWT_SECRET, which is Supabase's
// secret reserved for verifying Supabase-issued tokens, not for signing
// new ones).
// ============================================

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 hari

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET belum diatur di environment')
  }
  return secret
}

function base64UrlEncode(bytes) {
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const bin = atob(str)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function getHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signSession(payload, { expiresInSeconds = DEFAULT_TTL_SECONDS } = {}) {
  const secret = getSecret()
  const now = Math.floor(Date.now() / 1000)
  const body = { ...payload, iat: now, exp: now + expiresInSeconds }

  const encHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const encBody = base64UrlEncode(new TextEncoder().encode(JSON.stringify(body)))
  const data = `${encHeader}.${encBody}`

  const key = await getHmacKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const encSignature = base64UrlEncode(new Uint8Array(signature))

  return `${data}.${encSignature}`
}

export async function verifySession(token) {
  try {
    const secret = getSecret()
    const [encHeader, encBody, encSignature] = (token || '').split('.')
    if (!encHeader || !encBody || !encSignature) return null

    const data = `${encHeader}.${encBody}`
    const key = await getHmacKey(secret)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(encSignature),
      new TextEncoder().encode(data)
    )
    if (!valid) return null

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encBody)))
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null

    return payload
  } catch {
    return null
  }
}
