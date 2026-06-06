/**
 * Enkripsi/dekripsi backup SMSTPQ menggunakan:
 *   • PBKDF2-SHA256  — key derivation (100k iterasi, 32-byte key)
 *   • AES-256-CBC    — enkripsi simetris
 *   • HMAC-SHA256    — integritas payload
 *   • gzip           — kompresi JSON sebelum enkripsi
 *
 * Format envelope file (JSON):
 * {
 *   "smstpq": true,      // magic marker
 *   "v":      1,          // versi format
 *   "alg":    "aes-256-cbc",
 *   "kdf":    "pbkdf2-sha256",
 *   "iter":   100000,
 *   "salt":   "<hex>",    // 32 byte salt PBKDF2
 *   "iv":     "<hex>",    // 16 byte IV
 *   "hmac":   "<hex>",    // HMAC-SHA256 dari ciphertext (sebelum encode base64)
 *   "data":   "<base64>"  // gzip → AES-256-CBC → base64
 * }
 */

import crypto from 'crypto'
import { gzipSync, gunzipSync } from 'zlib'

const SALT_LEN = 32
const IV_LEN   = 16
const KEY_LEN  = 32
const ITER     = 100_000
const DIGEST   = 'sha256'

export interface BackupEnvelope {
  smstpq: true
  v:      number
  alg:    string
  kdf:    string
  iter:   number
  salt:   string
  iv:     string
  hmac:   string
  data:   string
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITER, KEY_LEN, DIGEST)
}

function computeHmac(key: Buffer, data: Buffer): string {
  return crypto.createHmac(DIGEST, key).update(data).digest('hex')
}

// ── Enkripsi ─────────────────────────────────────────────────────────────────
/**
 * Enkripsi plaintext JSON string → BackupEnvelope JSON string.
 * Pipeline: utf8 → gzip → AES-256-CBC → base64
 */
export function encryptBackup(plaintext: string, password: string): string {
  const salt       = crypto.randomBytes(SALT_LEN)
  const iv         = crypto.randomBytes(IV_LEN)
  const key        = deriveKey(password, salt)

  // Kompres dulu
  const compressed = gzipSync(Buffer.from(plaintext, 'utf8'), { level: 6 })

  // Enkripsi
  const cipher     = crypto.createCipheriv('aes-256-cbc', key, iv)
  const encrypted  = Buffer.concat([cipher.update(compressed), cipher.final()])

  // HMAC untuk integritas
  const hmac = computeHmac(key, encrypted)

  const envelope: BackupEnvelope = {
    smstpq: true,
    v:      1,
    alg:    'aes-256-cbc',
    kdf:    'pbkdf2-sha256',
    iter:   ITER,
    salt:   salt.toString('hex'),
    iv:     iv.toString('hex'),
    hmac,
    data:   encrypted.toString('base64'),
  }
  return JSON.stringify(envelope)
}

// ── Dekripsi ─────────────────────────────────────────────────────────────────
export type DecryptResult =
  | { ok: true;  plaintext: string }
  | { ok: false; error: string }

/**
 * Dekripsi BackupEnvelope JSON string → plaintext.
 * Pipeline: base64 → AES-256-CBC decrypt → gunzip → utf8
 */
export function decryptBackup(envelopeStr: string, password: string): DecryptResult {
  let envelope: BackupEnvelope
  try {
    envelope = JSON.parse(envelopeStr) as BackupEnvelope
  } catch {
    return { ok: false, error: 'File backup tidak dapat dibaca (bukan JSON valid).' }
  }

  if (!envelope.smstpq || envelope.v !== 1) {
    return { ok: false, error: 'File bukan backup SMSTPQ yang valid.' }
  }

  try {
    const salt      = Buffer.from(envelope.salt, 'hex')
    const iv        = Buffer.from(envelope.iv,   'hex')
    const key       = deriveKey(password, salt)
    const encrypted = Buffer.from(envelope.data, 'base64')

    // Verifikasi HMAC sebelum dekripsi
    const expectedHmac = computeHmac(key, encrypted)
    if (!crypto.timingSafeEqual(
      Buffer.from(expectedHmac, 'hex'),
      Buffer.from(envelope.hmac, 'hex'),
    )) {
      return { ok: false, error: 'Password salah atau file backup rusak.' }
    }

    const decipher    = crypto.createDecipheriv('aes-256-cbc', key, iv)
    const decrypted   = Buffer.concat([decipher.update(encrypted), decipher.final()])
    const decompressed = gunzipSync(decrypted)

    return { ok: true, plaintext: decompressed.toString('utf8') }
  } catch {
    return { ok: false, error: 'Password salah atau file backup rusak (dekripsi gagal).' }
  }
}

/** Validasi kekuatan password: minimal 8 karakter. */
export function validatePassword(p: string): string | null {
  if (!p)        return 'Password wajib diisi.'
  if (p.length < 8) return 'Password minimal 8 karakter.'
  return null
}
