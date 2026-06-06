'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface QueueItem {
  id:        string
  payload:   Record<string, unknown>
  timestamp: number
  retries:   number
}

const STORAGE_KEY = 'smstpq_offlineQueue'
const MAX_RETRIES  = 3
const SYNC_ENDPOINT = '/api/setoran/batch'

function loadQueue(): QueueItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveQueue(items: QueueItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function uuid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

interface UseOfflineQueueReturn {
  isOnline:   boolean
  queueSize:  number
  isSyncing:  boolean
  /** Tambah payload ke antrian. Jika online, langsung sync. */
  enqueue:    (payload: Record<string, unknown>) => Promise<boolean>
  /** Sinkronisasi manual semua item antrian. */
  syncAll:    () => Promise<void>
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  const [isOnline,  setIsOnline]  = useState(true)
  const [queue,     setQueue]     = useState<QueueItem[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const syncingRef = useRef(false)

  // Inisialisasi dari localStorage & pasang event listener
  useEffect(() => {
    setIsOnline(navigator.onLine)
    setQueue(loadQueue())

    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-sync saat kembali online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !syncingRef.current) {
      syncAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  const syncAll = useCallback(async () => {
    if (syncingRef.current) return
    const current = loadQueue()
    if (current.length === 0) return

    syncingRef.current = true
    setIsSyncing(true)

    let remaining = [...current]

    for (const item of current) {
      try {
        const res = await fetch(SYNC_ENDPOINT, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ items: [item.payload] }),
        })

        if (res.ok) {
          // Hapus item yang berhasil
          remaining = remaining.filter((r) => r.id !== item.id)
        } else if (res.status >= 400 && res.status < 500) {
          // Error validasi — jangan retry, buang dari antrian
          remaining = remaining.filter((r) => r.id !== item.id)
        } else {
          // Error server — tambah retry counter
          remaining = remaining.map((r) =>
            r.id === item.id ? { ...r, retries: r.retries + 1 } : r,
          )
        }
      } catch {
        // Network error — akan dicoba lagi berikutnya
      }
    }

    // Buang item yang sudah melewati batas retry
    remaining = remaining.filter((r) => r.retries < MAX_RETRIES)

    saveQueue(remaining)
    setQueue(remaining)
    syncingRef.current = false
    setIsSyncing(false)
  }, [])

  const enqueue = useCallback(
    async (payload: Record<string, unknown>): Promise<boolean> => {
      // Jika online, coba kirim langsung dulu
      if (navigator.onLine) {
        try {
          const res = await fetch('/api/setoran', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
          })
          if (res.ok) return true
          // Jika server error (5xx), masukkan ke antrian
          if (res.status < 500) return false // validasi error — jangan queue
        } catch {
          // Network error — masukkan ke antrian
        }
      }

      // Simpan ke antrian offline
      const item: QueueItem = {
        id:        uuid(),
        payload,
        timestamp: Date.now(),
        retries:   0,
      }
      const updated = [...loadQueue(), item]
      saveQueue(updated)
      setQueue(updated)
      return false // menandai bahwa sedang offline / queue
    },
    [],
  )

  return {
    isOnline,
    queueSize: queue.length,
    isSyncing,
    enqueue,
    syncAll,
  }
}
