const fs = require('fs')
const path = require('path')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dateOffset(days) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return todayKey(d)
}

class TimeboardStore {
  constructor(rootDir) {
    this.rootDir = rootDir
    this.daysDir = path.join(rootDir, 'days')
    this.cacheDir = path.join(rootDir, 'cache')
    this.settingsPath = path.join(rootDir, 'settings.json')
    ensureDir(this.daysDir)
    ensureDir(this.cacheDir)
  }

  defaultSettings() {
    return {
      language: 'system',
      autostart: true,
      idleSeconds: 90,
      tracking: true,
      unusedDays: 14,
    }
  }

  readSettings() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'))
      return { ...this.defaultSettings(), ...raw }
    } catch {
      return this.defaultSettings()
    }
  }

  writeSettings(next) {
    const merged = { ...this.readSettings(), ...next }
    fs.writeFileSync(this.settingsPath, JSON.stringify(merged, null, 2), 'utf8')
    return merged
  }

  dayPath(key) {
    return path.join(this.daysDir, `${key}.json`)
  }

  readDay(key) {
    try {
      return JSON.parse(fs.readFileSync(this.dayPath(key), 'utf8'))
    } catch {
      return {
        date: key,
        apps: {},
        idleMs: 0,
        updatedAt: Date.now(),
      }
    }
  }

  writeDay(day) {
    day.updatedAt = Date.now()
    fs.writeFileSync(this.dayPath(day.date), JSON.stringify(day), 'utf8')
    return day
  }

  addUsage(app, ms, idleMs = 0) {
    const key = todayKey()
    const day = this.readDay(key)
    if (idleMs > 0) day.idleMs = (day.idleMs || 0) + idleMs
    if (app && ms > 0) {
      const id = app.id
      const prev = day.apps[id] || {
        id,
        name: app.name,
        exe: app.exe,
        path: app.path || '',
        ms: 0,
        lastSeen: 0,
      }
      prev.ms += ms
      prev.lastSeen = Date.now()
      prev.name = app.name || prev.name
      prev.path = app.path || prev.path
      day.apps[id] = prev
    }
    return this.writeDay(day)
  }

  rangeKeys(range) {
    if (typeof range === 'number' && Number.isFinite(range)) {
      const n = Math.max(1, Math.floor(range))
      const keys = []
      for (let i = 0; i < n; i += 1) keys.push(dateOffset(-i))
      return keys
    }
    if (range === 'today') return [todayKey()]
    const n = range === '30d' ? 30 : 7
    const keys = []
    for (let i = 0; i < n; i += 1) keys.push(dateOffset(-i))
    return keys
  }

  summarize(range = 'today') {
    const keys = this.rangeKeys(range)
    const apps = new Map()
    let idleMs = 0
    const byDay = []
    for (const key of keys) {
      const day = this.readDay(key)
      let dayTotal = 0
      idleMs += day.idleMs || 0
      for (const app of Object.values(day.apps || {})) {
        dayTotal += app.ms || 0
        const prev = apps.get(app.id) || {
          id: app.id,
          name: app.name,
          exe: app.exe,
          path: app.path || '',
          ms: 0,
          lastSeen: 0,
        }
        prev.ms += app.ms || 0
        prev.lastSeen = Math.max(prev.lastSeen || 0, app.lastSeen || 0)
        prev.name = app.name || prev.name
        apps.set(app.id, prev)
      }
      byDay.push({ date: key, ms: dayTotal, idleMs: day.idleMs || 0 })
    }
    const list = [...apps.values()].sort((a, b) => b.ms - a.ms)
    const totalMs = list.reduce((s, a) => s + a.ms, 0)
    return {
      range,
      totalMs,
      idleMs,
      apps: list,
      byDay: byDay.reverse(),
      generatedAt: Date.now(),
    }
  }

  exportCsv(range = '7d') {
    const summary = this.summarize(range)
    const rows = [['name', 'exe', 'path', 'hours', 'minutes', 'ms', 'lastSeen']]
    for (const app of summary.apps) {
      rows.push([
        csvCell(app.name),
        csvCell(app.exe || ''),
        csvCell(app.path || ''),
        (app.ms / 3_600_000).toFixed(2),
        Math.round(app.ms / 60_000),
        app.ms,
        app.lastSeen ? new Date(app.lastSeen).toISOString() : '',
      ])
    }
    return rows.map((r) => r.join(',')).join('\n')
  }

  cachePath(name) {
    return path.join(this.cacheDir, name)
  }

  readCache(name, maxAgeMs) {
    try {
      const p = this.cachePath(name)
      const st = fs.statSync(p)
      if (Date.now() - st.mtimeMs > maxAgeMs) return null
      return JSON.parse(fs.readFileSync(p, 'utf8'))
    } catch {
      return null
    }
  }

  writeCache(name, data) {
    fs.writeFileSync(this.cachePath(name), JSON.stringify(data), 'utf8')
    return data
  }
}

function csvCell(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

module.exports = { TimeboardStore, todayKey, dateOffset }
