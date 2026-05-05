export type AgendaStatus =
  | 'akan_datang'
  | 'akan_datang_segera'
  | 'berlangsung'
  | 'selesai'

export interface StatusResult {
  status: AgendaStatus
  diffDays: number
  remainingMs: number
  progressPct: number
}

const H3_MS = 3 * 86_400_000

export function getAgendaStatus(
  mulai: Date,
  selesai: Date,
  now: Date = new Date()
): StatusResult {
  const nowMs = now.getTime()
  const mulaiMs = mulai.getTime()
  const selesaiMs = selesai.getTime()
  const diffMs = mulaiMs - nowMs
  const diffDays = Math.ceil(diffMs / 86_400_000)

  if (nowMs > selesaiMs) {
    return {
      status: 'selesai',
      diffDays,
      remainingMs: 0,
      progressPct: 100,
    }
  }

  if (nowMs >= mulaiMs) {
    const total = selesaiMs - mulaiMs
    const elapsed = nowMs - mulaiMs
    return {
      status: 'berlangsung',
      diffDays: 0,
      remainingMs: selesaiMs - nowMs,
      progressPct: Math.round((elapsed / total) * 100),
    }
  }

  if (diffMs <= H3_MS) {
    return {
      status: 'akan_datang_segera',
      diffDays,
      remainingMs: diffMs,
      progressPct: 0,
    }
  }

  return {
    status: 'akan_datang',
    diffDays,
    remainingMs: diffMs,
    progressPct: 0,
  }
}