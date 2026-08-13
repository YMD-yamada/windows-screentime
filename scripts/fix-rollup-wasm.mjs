import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rollupDir = path.join(root, 'node_modules', 'rollup')
const wasmDir = path.join(root, 'node_modules', '@rollup', 'wasm-node')
const nativeJs = path.join(rollupDir, 'dist', 'native.js')

if (!fs.existsSync(wasmDir)) {
  console.warn('fix-rollup-wasm: @rollup/wasm-node not installed; skip')
  process.exit(0)
}

try {
  fs.rmSync(rollupDir, { recursive: true, force: true })
  fs.cpSync(wasmDir, rollupDir, { recursive: true })
  console.log('fix-rollup-wasm: replaced rollup with @rollup/wasm-node')
} catch (error) {
  if (fs.existsSync(nativeJs)) {
    fs.writeFileSync(nativeJs, 'module.exports = require("./rollup.js");\n', 'utf8')
    console.log('fix-rollup-wasm: patched rollup dist/native.js')
  } else {
    console.warn('fix-rollup-wasm: failed', error.message)
  }
}
