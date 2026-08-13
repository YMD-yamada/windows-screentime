const { spawn } = require('child_process')
const path = require('path')

const HELPER = path.join(__dirname, 'helper.ps1')
const INSTALLED = path.join(__dirname, 'installed-apps.ps1')
const FLUSH_MS = 15_000
const TICK_MS = 1_000

function exeName(filePath, fallback) {
  if (filePath) {
    const base = path.basename(filePath)
    if (base) return base
  }
  return fallback || 'Unknown'
}

function displayName(snapshot) {
  const exe = exeName(snapshot.path, snapshot.name)
  const pretty = exe.replace(/\.exe$/i, '')
  if (!pretty) return snapshot.name || 'Unknown'
  return pretty
}

function appId(snapshot) {
  if (snapshot.path) return snapshot.path.toLowerCase()
  if (snapshot.name) return `name:${String(snapshot.name).toLowerCase()}`
  return 'unknown'
}

function normPath(p) {
  return String(p || '').toLowerCase().replace(/\//g, '\\')
}

function isOurProcess(snapshot, projectRoot) {
  const p = normPath(snapshot.path)
  const root = normPath(projectRoot)
  if (root && p.includes(root)) return true
  const n = String(snapshot.name || '').toLowerCase()
  return n === 'timeboard'
}

class Tracker {
  constructor(store, options = {}) {
    this.store = store
    this.projectRoot = options.projectRoot || ''
    this.child = null
    this.buffer = ''
    this.last = null
    this.lastTick = Date.now()
    this.current = null
    this.running = false
    this.paused = !store.readSettings().tracking
    this.flushTimer = null
  }

  start() {
    if (this.running) return
    this.running = true
    this.lastTick = Date.now()
    this.child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', HELPER, '-IntervalMs', String(TICK_MS)],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    this.child.stdout.setEncoding('utf8')
    this.child.stdout.on('data', (chunk) => this.onChunk(chunk))
    this.child.stderr.setEncoding('utf8')
    this.child.stderr.on('data', () => {})
    this.child.on('exit', () => {
      this.child = null
      if (this.running) {
        setTimeout(() => {
          if (this.running) {
            this.running = false
            this.start()
          }
        }, 2000)
      }
    })
    this.flushTimer = setInterval(() => this.flush(), FLUSH_MS)
  }

  stop() {
    this.running = false
    this.flush()
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    if (this.child) {
      try {
        this.child.kill()
      } catch {
        /* ignore */
      }
      this.child = null
    }
  }

  setPaused(paused) {
    this.flush()
    this.paused = Boolean(paused)
    this.store.writeSettings({ tracking: !this.paused })
  }

  onChunk(chunk) {
    this.buffer += chunk
    const lines = this.buffer.split(/\r?\n/)
    this.buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        this.onSnapshot(JSON.parse(trimmed))
      } catch {
        /* ignore partial JSON */
      }
    }
  }

  onSnapshot(snapshot) {
    const now = Date.now()
    const elapsed = Math.min(Math.max(now - this.lastTick, 0), TICK_MS * 3)
    this.lastTick = now
    this.last = snapshot
    if (!snapshot || snapshot.error) return

    const settings = this.store.readSettings()
    const idleLimit = Math.max(10, Number(settings.idleSeconds) || 90) * 1000
    const idle = Number(snapshot.idleMs) || 0

    if (this.paused || !settings.tracking) {
      this.current = { ...snapshot, status: 'paused' }
      return
    }

    if (idle >= idleLimit) {
      this.store.addUsage(null, 0, elapsed)
      this.current = { ...snapshot, status: 'idle', name: displayName(snapshot) }
      return
    }

    if (isOurProcess(snapshot, this.projectRoot)) {
      this.current = { ...snapshot, status: 'self', name: 'Timeboard' }
      this.store.addUsage(
        {
          id: 'timeboard',
          name: 'Timeboard',
          exe: exeName(snapshot.path, snapshot.name),
          path: snapshot.path || '',
        },
        elapsed,
        0,
      )
      return
    }

    const app = {
      id: appId(snapshot),
      name: displayName(snapshot),
      exe: exeName(snapshot.path, snapshot.name),
      path: snapshot.path || '',
    }
    this.current = { ...snapshot, status: 'active', name: app.name }
    this.store.addUsage(app, elapsed, 0)
  }

  flush() {
    /* store writes on each tick; kept for API symmetry */
  }

  now() {
    return this.current
  }
}

function snapshotOnce(timeoutMs = 12_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', HELPER, '-Once'],
      { windowsHide: true },
    )
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        /* ignore */
      }
      reject(new Error('helper timeout'))
    }, timeoutMs)
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (c) => {
      out += c
    })
    child.stderr.on('data', (c) => {
      err += c
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      try {
        const line = out.trim().split(/\r?\n/).filter(Boolean).pop()
        resolve(JSON.parse(line))
      } catch (e) {
        reject(new Error(`helper failed (${code}): ${err || e.message}`))
      }
    })
  })
}

function loadInstalledApps(store, { force = false, maxAgeMs = 12 * 60 * 60 * 1000 } = {}) {
  if (!force) {
    const cached = store.readCache('installed-apps.json', maxAgeMs)
    if (cached) return Promise.resolve(cached)
  }
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', INSTALLED],
      { windowsHide: true },
    )
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        /* ignore */
      }
      reject(new Error('installed-apps timeout'))
    }, 90_000)
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (c) => {
      out += c
    })
    child.stderr.on('data', (c) => {
      err += c
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      try {
        const data = JSON.parse(out.trim())
        store.writeCache('installed-apps.json', data)
        resolve(data)
      } catch (e) {
        reject(new Error(`installed-apps failed (${code}): ${err || e.message}`))
      }
    })
  })
}

function switchedHint(switched, app) {
  if (!switched || typeof switched !== 'object') return 0
  const hay = [
    app.name,
    app.installLocation,
    app.packageFamilyName,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase())
  let best = 0
  for (const [key, count] of Object.entries(switched)) {
    const k = String(key).toLowerCase()
    if (hay.some((h) => k.includes(h) || h.includes(k))) {
      best = Math.max(best, Number(count) || 0)
    }
  }
  return best
}

function unusedApps(store, inventory, { days = 14 } = {}) {
  const summary = store.summarize(Number(days) || 14)
  const usedPaths = new Set()
  const usedNames = new Set()
  for (const app of summary.apps) {
    if (app.path) usedPaths.add(normPath(app.path))
    usedNames.add(String(app.name || '').toLowerCase())
    usedNames.add(String(app.exe || '').replace(/\.exe$/i, '').toLowerCase())
  }
  const switched = inventory.switched || {}
  const list = (inventory.apps || [])
    .filter((app) => {
      const loc = normPath(app.installLocation)
      const name = String(app.name || '').toLowerCase()
      if (name.includes('timeboard') || name.includes('windows-screentime')) return false
      if (loc && [...usedPaths].some((p) => p && (p.startsWith(loc) || loc.includes(path.dirname(p))))) {
        return false
      }
      const short = name.replace(/^microsoft\./, '').replace(/_/g, '.')
      if (usedNames.has(name) || usedNames.has(short)) return false
      if (
        [...usedNames].some(
          (n) => n && n.length >= 4 && (name.includes(n) || (short && n.includes(short))),
        )
      ) {
        return false
      }
      return true
    })
    .map((app) => ({
      ...app,
      switchHint: switchedHint(switched, app),
    }))
    .sort((a, b) => a.switchHint - b.switchHint || String(a.name).localeCompare(String(b.name)))
  return {
    days,
    unused: list,
    trackedApps: summary.apps.length,
    inventoryCount: (inventory.apps || []).length,
  }
}

module.exports = {
  Tracker,
  snapshotOnce,
  loadInstalledApps,
  unusedApps,
  displayName,
  appId,
}
