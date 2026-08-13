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
    const summary = store.summarize('today')
    record('store roundtrip', summary.apps.length === 1 && summary.totalMs === 120_000, `${summary.apps[0]?.name} ${summary.totalMs}ms`)
  } catch (e) {
    record('store roundtrip', false, e.message)
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
