import type { Session } from './types'

const STORAGE_KEY = 'exam_prep_sessions'
const MAX_SESSIONS = 25

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) => item && item.syllabus && item.id && item.timestamp,
    )
  } catch {
    return []
  }
}

export function saveSession(session: Omit<Session, 'id' | 'timestamp'>): Session[] {
  const existing = loadSessions()
  const withMeta: Session = {
    ...session,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  }
  const next = [withMeta, ...existing].slice(0, MAX_SESSIONS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function removeSession(id: string): Session[] {
  const next = loadSessions().filter((session) => session.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}