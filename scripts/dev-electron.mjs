import { spawn } from 'node:child_process'
import process from 'node:process'

const children = []

function run(command, args, env = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  })
  children.push(child)
  return child
}

function shutdown(code = 0) {
  for (const child of children) {
    try {
      child.kill()
    } catch {
      /* ignore */
    }
  }
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

run('npx', ['vite', '--port', '5178', '--strictPort'])
setTimeout(() => {
  run('npx', ['electron', '.'], {
    TIMEBOARD_DEV: '1',
    TIMEBOARD_DEV_URL: 'http://127.0.0.1:5178',
  })
}, 1500)
