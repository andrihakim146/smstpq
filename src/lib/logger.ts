/**
 * Logger terstruktur untuk SMSTPQ.
 * Output: JSON ke stdout/stderr — terbaca di Netlify Functions log,
 * Logtail drain, atau log aggregator manapun.
 *
 * Format:
 * {"ts":"2026-06-06T16:00:00.000Z","level":"info","event":"LOGIN_SUCCESS","...meta}
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  ts:     string
  level:  Level
  event:  string
  [key: string]: unknown
}

function write(level: Level, event: string, meta: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    ts:    new Date().toISOString(),
    level,
    event,
    ...meta,
  }
  const line = JSON.stringify(entry)
  if (level === 'error' || level === 'warn') {
    console.error(line)
  } else {
    console.info(line)
  }
}

export const log = {
  debug: (event: string, meta?: Record<string, unknown>) => write('debug', event, meta),
  info:  (event: string, meta?: Record<string, unknown>) => write('info',  event, meta),
  warn:  (event: string, meta?: Record<string, unknown>) => write('warn',  event, meta),
  error: (event: string, meta?: Record<string, unknown>) => write('error', event, meta),
}

// ── Event helpers (strong-typed shortcuts) ───────────────────────────────────

/** Login sukses */
export function logLoginSuccess(params: { pengajarId: string; nama: string; peran: string; ip: string }) {
  log.info('LOGIN_SUCCESS', params)
}

/** Login gagal */
export function logLoginFailed(params: { reason: string; ip: string; nama?: string }) {
  log.warn('LOGIN_FAILED', params)
}

/** Login diblokir (lockout / rate limit) */
export function logLoginBlocked(params: { reason: string; ip: string; nama?: string }) {
  log.warn('LOGIN_BLOCKED', params)
}

/** Setoran baru disimpan */
export function logSetoranCreated(params: {
  setoranId: string
  santriId:  string
  santriNama: string
  tipe:      string
  pengajarId: string
  ip:        string
}) {
  log.info('SETORAN_CREATED', params)
}

/** Catatan baru disimpan */
export function logCatatanCreated(params: {
  catatanId: string
  santriId:  string
  pengajarId: string
  ip:        string
}) {
  log.info('CATATAN_CREATED', params)
}

/** Absensi batch disimpan */
export function logAbsensiSaved(params: { count: number; tanggal: string; kelasId?: string; ip: string }) {
  log.info('ABSENSI_SAVED', params)
}

/** Backup diunduh */
export function logBackupDownload(params: { pengajarId: string; ip: string; sizeEstimate?: string }) {
  log.info('BACKUP_DOWNLOAD', params)
}

/** Restore dijalankan */
export function logBackupRestore(params: {
  pengajarId: string
  ip:         string
  mode:       string
  tables:     Record<string, number>
}) {
  log.info('BACKUP_RESTORE', params)
}

/** Rate limit terlampaui */
export function logRateLimit(params: { path: string; ip: string; key: string }) {
  log.warn('RATE_LIMIT_EXCEEDED', params)
}

/** Cron retensi selesai */
export function logRetentionCron(params: { deleted: number; before: string }) {
  log.info('CRON_RETENTION', params)
}

/** Error tidak tertangani di API route */
export function logApiError(params: { path: string; method: string; error: string; ip?: string }) {
  log.error('API_ERROR', params)
}
