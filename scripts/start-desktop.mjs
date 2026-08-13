import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distIndex = path.join(root, 'dist', 'index.html')

if (!fs.existsSync(distIndex)) {
  const build = spawn('npx', ['vite', 'build'], { cwd: root, stdio: 'inherit', shell: true })
  build.on('exit', (code) => {
    if (code !== 0) process.exit(code || 1)
    launch()
  })
} else {
  launch()
}

function launch() {
  const child = spawn('npx', ['electron', '.'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  })
  child.on('exit', (code) => process.exit(code || 0))
}
