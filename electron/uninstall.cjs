const { spawn } = require('child_process')

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

function buildUninstallCommand(app) {
  if (!app) return null
  if (app.type === 'store') {
    const full = storeFullName(app)
    if (!full) return null
    return {
      kind: 'store',
      file: 'powershell.exe',
      args: [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Remove-AppxPackage -Package ${JSON.stringify(full)}`,
      ],
      shell: false,
    }
  }
  const quiet = String(app.uninstall || '').trim()
  const open = String(app.uninstallOpen || '').trim()
  if (quiet && !/msiexec/i.test(quiet)) {
    return { kind: 'win32-quiet', file: quiet, args: [], shell: true }
  }
  const guid = productCode(quiet || open)
  if (guid) {
    return {
      kind: 'msi',
      file: 'msiexec.exe',
      args: ['/x', guid, '/passive', '/norestart'],
      shell: false,
    }
  }
  if (quiet) return { kind: 'win32-quiet', file: quiet, args: [], shell: true }
  if (open) return { kind: 'win32', file: open, args: [], shell: true }
  return null
}

function runUninstall(app, timeoutMs = 180_000) {
  const spec = buildUninstallCommand(app)
  if (!spec) {
    return Promise.resolve({ ok: false, error: 'no-uninstall-method', method: '' })
  }
  return new Promise((resolve) => {
    const child = spec.shell
      ? spawn(spec.file, { shell: true, windowsHide: false })
      : spawn(spec.file, spec.args, { windowsHide: false })
    let stderr = ''
    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        /* ignore */
      }
      resolve({ ok: false, error: 'timeout', method: spec.kind })
    }, timeoutMs)
    if (child.stderr) {
      child.stderr.setEncoding('utf8')
      child.stderr.on('data', (c) => {
        stderr += c
      })
    }
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ ok: false, error: err.message, method: spec.kind })
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
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

module.exports = { buildUninstallCommand, runUninstall, productCode, storeFullName }
