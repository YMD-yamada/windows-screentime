const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { spawn } = require('child_process')

const EXTRACT = path.join(__dirname, 'extract-icon.ps1')
const MAX_PARALLEL = 3

function hashKey(source) {
  return crypto.createHash('sha1').update(String(source || '').toLowerCase()).digest('hex')
}

function cleanSource(source) {
  if (!source) return ''
  let s = String(source).trim().replace(/^"+|"+$/g, '')
  s = s.replace(/,\s*-?\d+$/, '')
  return s
}

function findStoreLogo(installLocation) {
  if (!installLocation || !fs.existsSync(installLocation)) return ''
  const manifest = path.join(installLocation, 'AppxManifest.xml')
  const rels = []
  if (fs.existsSync(manifest)) {
    try {
      const xml = fs.readFileSync(manifest, 'utf8')
      const re = /(Square44x44Logo|Square150x150Logo|StoreLogo|Logo)="([^"]+)"/gi
      let m
      while ((m = re.exec(xml))) rels.push(m[2].replace(/\//g, '\\'))
    } catch {
      /* ignore */
    }
  }
  const tryFile = (abs) => {
    if (fs.existsSync(abs)) return abs
    const dir = path.dirname(abs)
    const stem = path.basename(abs, path.extname(abs)).toLowerCase()
    if (!fs.existsSync(dir)) return ''
    try {
      const hits = fs
        .readdirSync(dir)
        .filter((f) => f.toLowerCase().startsWith(stem) && /\.(png|jpg|jpeg)$/i.test(f))
        .map((f) => ({ f, p: path.join(dir, f), n: fs.statSync(path.join(dir, f)).size }))
        .sort((a, b) => {
          const as = /scale-200|targetsize-64|targetsize-48/i.test(a.f) ? 1 : 0
          const bs = /scale-200|targetsize-64|targetsize-48/i.test(b.f) ? 1 : 0
          return bs - as || b.n - a.n
        })
      return hits[0]?.p || ''
    } catch {
      return ''
    }
  }
  for (const rel of rels) {
    const hit = tryFile(path.join(installLocation, rel))
    if (hit) return hit
  }
  const assets = path.join(installLocation, 'Assets')
  if (fs.existsSync(assets)) {
    try {
      const hits = fs
        .readdirSync(assets)
        .filter((f) => /logo|storelogo|applist/i.test(f) && /\.png$/i.test(f))
        .map((f) => ({ p: path.join(assets, f), n: fs.statSync(path.join(assets, f)).size }))
        .sort((a, b) => b.n - a.n)
      if (hits[0]) return hits[0].p
    } catch {
      /* ignore */
    }
  }
  return ''
}

function pickSource(req) {
  const candidates = [req.path, req.exe, req.displayIcon, req.icon]
    .map(cleanSource)
    .filter(Boolean)
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  if (req.installLocation) {
    const logo = findStoreLogo(req.installLocation)
    if (logo) return logo
    try {
      const exes = fs
        .readdirSync(req.installLocation)
        .filter((f) => f.toLowerCase().endsWith('.exe'))
        .map((f) => path.join(req.installLocation, f))
      if (exes[0] && fs.existsSync(exes[0])) return exes[0]
    } catch {
      /* ignore */
    }
  }
  return candidates[0] || ''
}

class IconCache {
  constructor(rootDir) {
    this.dir = path.join(rootDir, 'icons')
    fs.mkdirSync(this.dir, { recursive: true })
    this.mem = new Map()
    this.queue = []
    this.active = 0
  }

  fileFor(source) {
    return path.join(this.dir, `${hashKey(source)}.png`)
  }

  dataUrl(file) {
    try {
      const buf = fs.readFileSync(file)
      if (buf.length < 80) return ''
      return `data:image/png;base64,${buf.toString('base64')}`
    } catch {
      return ''
    }
  }

  peek(req) {
    const source = pickSource(req)
    if (!source) return ''
    if (this.mem.has(source)) return this.mem.get(source)
    const file = this.fileFor(source)
    if (fs.existsSync(file)) {
      const url = this.dataUrl(file)
      if (url) this.mem.set(source, url)
      return url
    }
    return ''
  }

  enqueue(req, onReady) {
    const source = pickSource(req)
    if (!source) {
      onReady('')
      return
    }
    const cached = this.peek({ ...req, path: source })
    if (cached) {
      onReady(cached)
      return
    }
    this.queue.push({ source, req, onReady })
    this.pump()
  }

  pump() {
    while (this.active < MAX_PARALLEL && this.queue.length) {
      const job = this.queue.shift()
      this.active += 1
      this.extract(job.source)
        .then((url) => job.onReady(url || ''))
        .catch(() => job.onReady(''))
        .finally(() => {
          this.active -= 1
          this.pump()
        })
    }
  }

  extract(source) {
    const dest = this.fileFor(source)
    if (fs.existsSync(dest)) {
      const url = this.dataUrl(dest)
      if (url) {
        this.mem.set(source, url)
        return Promise.resolve(url)
      }
    }
    return new Promise((resolve) => {
      const child = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          EXTRACT,
          '-Source',
          source,
          '-Dest',
          dest,
          '-Size',
          '64',
        ],
        { windowsHide: true },
      )
      const timer = setTimeout(() => {
        try {
          child.kill()
        } catch {
          /* ignore */
        }
      }, 12_000)
      child.on('exit', () => {
        clearTimeout(timer)
        const url = this.dataUrl(dest)
        if (url) this.mem.set(source, url)
        resolve(url || '')
      })
    })
  }

  snapshotOnce(source) {
    return new Promise((resolve) => {
      this.enqueue({ path: source }, resolve)
    })
  }
}

module.exports = { IconCache, pickSource, findStoreLogo, cleanSource }
