const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const ELEVATED = path.join(__dirname, 'uninstall-elevated.ps1')

function productCode(str) {
  const m = String(str || '').match(/\{[0-9A-Fa-f-]{36}\}/)
  return m ? m[0] : ''
}

function storeFullName(app) {
  if (app?.packageFullName) return String(app.packageFullName)
  const id = String(app?.id || '')
  if (id.startsWith('store|')) return id.slice(6)
  return ''
}

function quoteIfNeeded(token) {
  const t = String(token).trim()
  if (!t) return t
  if (t.startsWith('"')) return t
  if (/\s/.test(t)) return `"${t}"`
  return t
}

function silentizeWin32(raw) {
  const c = String(raw || '').trim()
  if (!c || /msiexec/i.test(c)) return c
  if (/\/(verysilent|silent|\bs\b|quiet|qn)\b/i.test(c)) return c
  if (/unins\d+\.exe/i.test(c)) return `${c} /VERYSILENT /SUPPRESSMSGBOXES /NORESTART`
  if (/\.exe(\s|"|$)/i.test(c)) return `${c} /S`
  return c
}

function buildUninstallCommand(app) {
  if (!app) return null
  if (app.type === 'store') {
    const full = storeFullName(app)
    if (!full) return null
    return { kind: 'store', package: full }
  }
  const quiet = String(app.uninstall || '').trim()
  const open = String(app.uninstallOpen || '').trim()
  if (quiet && !/msiexec/i.test(quiet)) {
    return { kind: 'cmd', command: silentizeWin32(quiet) }
  }
  const guid = productCode(quiet || open)
  if (guid) return { kind: 'msi', guid }
  if (quiet) return { kind: 'cmd', command: silentizeWin32(quiet) }
  if (open) return { kind: 'cmd', command: silentizeWin32(open) }
  return null
}

function runUninstall(app, timeoutMs = 180_000) {
  const spec = buildUninstallCommand(app)
  if (!spec) {
    return Promise.resolve({ ok: false, error: 'no-uninstall-method', method: '', code: 0 })
  }
  const specFile = path.join(os.tmpdir(), `timeboard-uninst-${Date.now()}-${Math.random().toString(16).slice(2)}.json`)
  fs.writeFileSync(specFile, JSON.stringify(spec), 'utf8')

  const elevate = `
    try {
      $p = Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -PassThru -WindowStyle Hidden -ArgumentList @(
        '-NoProfile','-ExecutionPolicy','Bypass','-File',${JSON.stringify(ELEVATED)},'-SpecFile',${JSON.stringify(specFile)}
      )
      if ($null -eq $p) { exit 1223 }
      exit $p.ExitCode
    } catch {
      exit 1223
    }
  `

  return new Promise((resolve) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', elevate],
      { windowsHide: true },
    )
    let stderr = ''
    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        /* ignore */
      }
      try {
        fs.unlinkSync(specFile)
      } catch {
        /* ignore */
      }
      resolve({ ok: false, error: 'timeout', method: spec.kind, code: 0 })
    }, timeoutMs)
    if (child.stderr) {
      child.stderr.setEncoding('utf8')
      child.stderr.on('data', (c) => {
        stderr += c
      })
    }
    child.on('error', (err) => {
      clearTimeout(timer)
      try {
        fs.unlinkSync(specFile)
      } catch {
        /* ignore */
      }
      resolve({ ok: false, error: err.message, method: spec.kind, code: 0 })
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      try {
        fs.unlinkSync(specFile)
      } catch {
        /* ignore */
      }
      if (code === 1223) {
        resolve({ ok: false, error: 'uac-cancelled', method: spec.kind, code })
        return
      }
      const ok = code === 0 || code === 3010
      resolve({
        ok,
        code,
        error: ok ? '' : stderr.trim() || `exit ${code}`,
        method: spec.kind,
      })
    })
  })
}

module.exports = {
  buildUninstallCommand,
  runUninstall,
  productCode,
  storeFullName,
  silentizeWin32,
  quoteIfNeeded,
}
