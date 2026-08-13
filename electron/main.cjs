const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  shell,
  dialog,
  clipboard,
} = require('electron')
const path = require('path')
const fs = require('fs')
const { TimeboardStore } = require('./store.cjs')
const { Tracker, snapshotOnce, loadInstalledApps, unusedApps } = require('./tracker.cjs')
const { IconCache } = require('./icons.cjs')

if (process.platform === 'win32') {
  app.setAppUserModelId('ymd.Timeboard')
}

const APP_ROOT = path.join(__dirname, '..')
const isDev = process.env.TIMEBOARD_DEV === '1'
const isSmoke = process.env.TIMEBOARD_SMOKE === '1'
const DEV_URL = process.env.TIMEBOARD_DEV_URL || 'http://127.0.0.1:5178'

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  if (isSmoke) {
    console.error('TIMEBOARD_SMOKE: another instance is running')
    app.exit(2)
  } else {
    app.quit()
  }
}

let mainWindow = null
let tray = null
let store
let tracker
let icons

function dataRoot() {
  return path.join(app.getPath('userData'), 'Timeboard')
}

function trayIcon() {
  const fromBuild = path.join(APP_ROOT, 'build', 'icon-44.png')
  if (fs.existsSync(fromBuild)) return nativeImage.createFromPath(fromBuild)
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAsklEQVQ4T2NkwA7+MzIw/GdgYPjPgA1g1TCqAQcGBgbG////M/z794/h379/DP/+/WP4+/cvw79//xj+/v3L8O/fP4Z///4x/P37l+Hfv38M//79Y/j79y/Dv3//GP79+8fw798/hn///jH8/fuX4d+/f4wApVwY/5m2Z0YAAAAASUVORK5CYII='
  return nativeImage.createFromDataURL(`data:image/png;base64,${png}`)
}

function createWindow() {
  const winIcon = path.join(APP_ROOT, 'build', 'icon.png')
  mainWindow = new BrowserWindow({
    width: 980,
    height: 760,
    minWidth: 760,
    minHeight: 600,
    title: 'Timeboard',
    backgroundColor: '#f4f1ea',
    icon: fs.existsSync(winIcon) ? winIcon : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL(DEV_URL)
  } else {
    mainWindow.loadFile(path.join(APP_ROOT, 'dist', 'index.html'))
  }

  mainWindow.on('close', (event) => {
    if (isSmoke || app.quitting) return
    event.preventDefault()
    mainWindow.hide()
  })
}

function showWindow() {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function applyAutostart(enabled) {
  app.setLoginItemSettings({
    openAtLogin: Boolean(enabled),
    path: process.execPath,
    args: isDev ? [APP_ROOT] : [],
  })
}

function createTray() {
  tray = new Tray(trayIcon())
  const menu = Menu.buildFromTemplate([
    { label: 'Timeboard', click: () => showWindow() },
    { type: 'separator' },
    {
      label: '計測を一時停止',
      type: 'checkbox',
      checked: tracker?.paused,
      click: (item) => {
        tracker?.setPaused(item.checked)
      },
    },
    { type: 'separator' },
    {
      label: '終了',
      click: () => {
        app.quitting = true
        app.quit()
      },
    },
  ])
  tray.setToolTip('Timeboard')
  tray.setContextMenu(menu)
  tray.on('click', () => showWindow())
}

function registerIpc() {
  ipcMain.handle('tb:summary', (_e, range) => store.summarize(range || 'today'))
  ipcMain.handle('tb:now', () => tracker?.now() || null)
  ipcMain.handle('tb:getSettings', () => store.readSettings())
  ipcMain.handle('tb:setSettings', (_e, patch) => {
    const next = store.writeSettings(patch || {})
    if (typeof next.autostart === 'boolean') applyAutostart(next.autostart)
    if (typeof next.tracking === 'boolean') tracker?.setPaused(!next.tracking)
    return next
  })
  ipcMain.handle('tb:exportCsv', async (_e, range) => {
    const csv = store.exportCsv(range || '7d')
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export usage CSV',
      defaultPath: `timeboard-${range || '7d'}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (canceled || !filePath) return { ok: false, canceled: true }
    fs.writeFileSync(filePath, `\uFEFF${csv}`, 'utf8')
    return { ok: true, filePath }
  })
  ipcMain.handle('tb:refreshInstalled', async () => {
    const inv = await loadInstalledApps(store, { force: true })
    return { count: (inv.apps || []).length }
  })
  ipcMain.handle('tb:unused', async (_e, days) => {
    const settings = store.readSettings()
    const inv = await loadInstalledApps(store)
    return unusedApps(store, inv, {
      days: Number(days) || settings.unusedDays || 14,
      ignoredIds: (settings.ignoredApps || []).map((a) => a.id || a),
    })
  })
  ipcMain.handle('tb:openUninstall', async (_e, appInfo) => {
    if (!appInfo) return { ok: false }
    if (appInfo.name) {
      try {
        clipboard.writeText(String(appInfo.name))
      } catch {
        /* ignore */
      }
    }
    await shell.openExternal('ms-settings:appsfeatures')
    return { ok: true, method: 'settings', copiedName: appInfo.name || '' }
  })
  ipcMain.handle('tb:openLocation', async (_e, appInfo) => {
    const loc = appInfo?.installLocation || appInfo?.path || appInfo?.displayIcon || ''
    const cleaned = String(loc).replace(/,\s*-?\d+$/, '').replace(/^"+|"+$/g, '')
    if (cleaned && fs.existsSync(cleaned)) {
      if (fs.statSync(cleaned).isDirectory()) shell.openPath(cleaned)
      else shell.showItemInFolder(cleaned)
      return { ok: true }
    }
    return { ok: false }
  })
  ipcMain.handle('tb:icons', (_e, reqs) => {
    const out = {}
    for (const req of reqs || []) {
      const key = req.key || req.id || req.path || req.name
      if (!key) continue
      const cached = icons.peek(req)
      if (cached) out[key] = cached
      else {
        icons.enqueue(req, (dataUrl) => {
          if (dataUrl && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('tb:icon-ready', { key, dataUrl })
          }
        })
      }
    }
    return out
  })
}

async function runSmoke() {
  const snap = await snapshotOnce()
  if (!snap || !snap.name) throw new Error('no foreground snapshot')
  tracker?.onSnapshot(snap)
  const summary = store.summarize('today')
  if (!summary) throw new Error('no summary')
  console.log(
    JSON.stringify({
      ok: true,
      foreground: snap.name,
      apps: summary.apps.length,
      totalMs: summary.totalMs,
    }),
  )
  app.quitting = true
  app.quit()
}

app.on('second-instance', () => showWindow())

app.whenReady().then(async () => {
  store = new TimeboardStore(dataRoot())
  icons = new IconCache(dataRoot())
  const settings = store.readSettings()
  applyAutostart(settings.autostart)
  tracker = new Tracker(store, { projectRoot: APP_ROOT })
  registerIpc()

  if (isSmoke) {
    await runSmoke()
    return
  }

  tracker.start()
  createWindow()
  createTray()
})

app.on('before-quit', () => {
  app.quitting = true
  tracker?.stop()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && app.quitting) app.quit()
})
