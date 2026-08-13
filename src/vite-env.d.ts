export type TimeboardSummary = {
  range: string
  totalMs: number
  idleMs: number
  apps: Array<{
    id: string
    name: string
    exe?: string
    path?: string
    ms: number
    lastSeen?: number
  }>
  byDay: Array<{ date: string; ms: number; idleMs: number }>
}

export type TimeboardSettings = {
  language: 'system' | 'ja' | 'en'
  autostart: boolean
  idleSeconds: number
  tracking: boolean
  unusedDays: number
}

export type TimeboardNow = {
  name?: string
  title?: string
  status?: string
  idleMs?: number
  path?: string
}

export type TimeboardUnused = {
  days: number
  unused: Array<{
    id: string
    name: string
    publisher?: string
    type?: string
    uninstallOpen?: string
    switchHint?: number
  }>
  trackedApps: number
  inventoryCount: number
}

export type TimeboardApi = {
  getSummary: (range: 'today' | '7d' | '30d') => Promise<TimeboardSummary>
  getUnused: (days?: number) => Promise<TimeboardUnused>
  getSettings: () => Promise<TimeboardSettings>
  setSettings: (patch: Partial<TimeboardSettings>) => Promise<TimeboardSettings>
  getNow: () => Promise<TimeboardNow | null>
  exportCsv: (range: 'today' | '7d' | '30d') => Promise<{ ok: boolean; canceled?: boolean; filePath?: string }>
  openUninstall: (app: Record<string, unknown>) => Promise<{ ok: boolean; method?: string }>
  refreshInstalled: () => Promise<{ count: number }>
}

declare global {
  interface Window {
    timeboard?: TimeboardApi
  }
}

export {}
