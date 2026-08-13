/**
 * Lightweight smoke: helper snapshot → vite build → electron smoke exit.
 * Does not leave the desktop app running.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { TimeboardStore } = require(path.join(root, 'electron/store.cjs'))
const { snapshotOnce } = require(path.join(root, 'electron/tracker.cjs'))
const { IconCache } = require(path.join(root, 'electron/icons.cjs'))
const { buildUninstallCommand } = require(path.join(root, 'electron/uninstall.cjs'))
const { isJudgableUnused } = require(path.join(root, 'electron/cleanup-filter.cjs'))

const args = new Set(process.argv.slice(2))
const skipBuild = args.has('--skip-build')
const skipElectron = args.has('--skip-electron')
const results = []

function log(msg) {
  console.log(`[smoke] ${msg}`)
}

function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  log(`${ok ? 'OK' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

function run(command, cmdArgs, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, cmdArgs, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, ...extraEnv },
    })
    let out = ''
    let err = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (c) => {
      out += c
      process.stdout.write(c)
    })
    child.stderr.on('data', (c) => {
      err += c
      process.stderr.write(c)
    })
    child.on('exit', (code) => {
      if (code === 0) resolve({ out, err })
      else reject(new Error(`${command} exited ${code}: ${err || out}`))
    })
  })
}

async function main() {
  try {
    const snap = await snapshotOnce(20_000)
    record('helper.ps1 -Once', Boolean(snap?.name || snap?.pid), snap?.name || snap?.error || '')
  } catch (e) {
    record('helper.ps1 -Once', false, e.message)
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'timeboard-smoke-'))
  try {
    const store = new TimeboardStore(tmp)
    store.addUsage({ id: 'c:\\fake\\cursor.exe', name: 'Cursor', exe: 'Cursor.exe', path: 'c:\\fake\\cursor.exe' }, 120_000)
    store.addUsage({ id: 'c:\\windows\\explorer.exe', name: 'explorer', exe: 'explorer.exe', path: 'c:\\windows\\explorer.exe' }, 60_000)
    const summary = store.summarize('today')
    const cursor = summary.apps.find((a) => a.name === 'Cursor')
    const windows = summary.apps.find((a) => a.id === 'windows-shell')
    record(
      'store roundtrip',
      cursor?.ms === 120_000 && windows?.ms === 60_000 && summary.totalMs === 180_000,
      `${summary.apps.map((a) => a.name).join('+')} ${summary.totalMs}ms`,
    )
  } catch (e) {
    record('store roundtrip', false, e.message)
  }

  try {
    const cache = new IconCache(tmp)
    const ps =
      process.env.SystemRoot
        ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
        : 'powershell.exe'
    const url = await cache.snapshotOnce(ps)
    record('extract icon', Boolean(url && url.startsWith('data:image/png')), url ? `${Math.round(url.length / 1024)}kb` : 'empty')
  } catch (e) {
    record('extract icon', false, e.message)
  }

  try {
    const msi = buildUninstallCommand({
      type: 'win32',
      uninstallOpen: 'MsiExec.exe /I{12345678-1234-1234-1234-123456789012}',
    })
    const storeCmd = buildUninstallCommand({
      type: 'store',
      id: 'store|Contoso.Demo_1.0.0.0_neutral__8wekyb3d8bbwe',
    })
    const nsis = buildUninstallCommand({
      type: 'win32',
      uninstall: 'C:\\Program Files\\Foo\\unins000.exe',
    })
    record(
      'uninstall plan',
      msi?.kind === 'msi' && storeCmd?.kind === 'store' && /verysilent/i.test(nsis?.command || ''),
      `${msi?.kind}+${storeCmd?.kind}+silent`,
    )
    const start = [{ name: 'Bambu Studio', appId: 'bambu' }]
    const keep = isJudgableUnused(
      { name: 'Bambu Studio', type: 'win32', uninstallOpen: 'C:\\x\\unins000.exe' },
      start,
    )
    const dropRuntime = !isJudgableUnused(
      { name: 'Microsoft Visual C++ 2015 Redistributable (x64)', type: 'win32', uninstallOpen: 'msiexec' },
      start,
    )
    const dropHidden = !isJudgableUnused(
      { name: 'Mystery Helper', type: 'win32', uninstallOpen: 'C:\\x\\unins000.exe' },
      start,
    )
    const dropFuzzy = !isJudgableUnused(
      { name: 'Host', type: 'win32', uninstallOpen: 'C:\\x\\unins000.exe' },
      [{ name: 'ShellExperienceHost', appId: 'x' }],
    )
    const keepChrome = isJudgableUnused(
      { name: 'Chrome', type: 'win32', uninstallOpen: 'C:\\x\\unins000.exe' },
      [{ name: 'Google Chrome', appId: 'chrome' }],
    )
    record(
      'judgable filter',
      keep && dropRuntime && dropHidden && dropFuzzy && keepChrome,
      `keep=${keep} runtime=${dropRuntime} hidden=${dropHidden} fuzzy=${dropFuzzy} chrome=${keepChrome}`,
    )
  } catch (e) {
    record('uninstall plan', false, e.message)
  }

  if (!skipBuild) {
    try {
      await run('npx', ['vite', 'build'])
      record('vite build', fs.existsSync(path.join(root, 'dist', 'index.html')))
    } catch (e) {
      record('vite build', false, e.message)
    }
  } else {
    record('vite build', fs.existsSync(path.join(root, 'dist', 'index.html')), 'skipped, checked dist')
  }

  if (!skipElectron) {
    try {
      const { out } = await run('npx', ['electron', '.'], { TIMEBOARD_SMOKE: '1' })
      const ok = out.includes('"ok":true') || out.includes('"ok": true')
      record('electron smoke', ok, ok ? 'exited cleanly' : 'missing ok json')
    } catch (e) {
      record('electron smoke', false, e.message)
    }
  }

  const failed = results.filter((r) => !r.ok)
  if (failed.length) {
    log(`FAILED ${failed.length}/${results.length}`)
    process.exit(1)
  }
  log(`passed ${results.length}/${results.length}`)
}

await main()
