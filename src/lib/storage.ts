import type { SessionSummary, TrainerSettings } from '../types'

const SETTINGS_KEY = 'aim-training.settings'
const HISTORY_KEY = 'aim-training.history'

export function loadSettings<T>(fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback
  } catch {
    return fallback
  }
}

export function saveSettings(settings: TrainerSettings): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadHistory(): SessionSummary[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as SessionSummary[]) : []
  } catch {
    return []
  }
}

export function saveHistory(history: SessionSummary[]): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)))
}
