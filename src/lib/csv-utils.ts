/** Escape satu nilai untuk CSV (RFC 4180). */
function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Konversi array header + rows ke string CSV UTF-8 dengan BOM agar Excel tidak rusak. */
export function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(','))
  }
  // BOM untuk Excel Windows
  return '\uFEFF' + lines.join('\r\n')
}

/** Buat Response unduhan CSV. */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

/** Format tanggal ke YYYY-MM-DD untuk tampilan CSV. */
export function fmtDateOnly(d: Date | string | null): string {
  if (!d) return ''
  return new Date(d).toISOString().split('T')[0]
}

/** Format datetime ke YYYY-MM-DD HH:mm. */
export function fmtDatetime(d: Date | string | null): string {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.toISOString().split('T')[0]} ${dt.toTimeString().slice(0, 5)}`
}
