const RUNTIME_RE =
  /(visual c\+\+|vcredist|redistributable|\.net (desktop )?runtime|windows desktop runtime|windows app runtime|windows sdk|windows driver|driver package|webview2 runtime|microsoft visual studio tools|click-to-run|update for |security update|hotfix|\bkb\d+|chipset|graphics driver|audio driver|bluetooth driver|microsoft asp\.net|sql server (native|compact|vss|setup)|odbc driver|microsoft report viewer|microsoft system clr types|windows installer|apple software update|\bbonjour\b|microsoft edge update|microsoft visual c)/i

const STORE_INFRA_RE =
  /^(Microsoft\.(UI|VCLibs|WindowsAppRuntime|Win32WebViewHost|DirectX|Services\.Store|DesktopAppInstaller|StorePurchaseApp|ECApp|YourPhone)|MicrosoftWindows\.|Microsoft\.WindowsStore|Microsoft\.Windows\.(DevHome|CloudExperienceHost|StartMenuExperienceHost|PeopleExperienceHost)|Microsoft\.MicrosoftEdge)/i

const SHELL_NAME_RE =
  /^(file explorer|windows explorer|microsoft store|xbox game bar|windows security|windows defender|cortana|widgets|tips|feedback hub|get started|settings)$/i

function isRuntimeOrInternal(app) {
  const name = String(app?.name || '')
  if (RUNTIME_RE.test(name)) return true
  if (SHELL_NAME_RE.test(name)) return true
  if (app?.type === 'store') {
    const pkg = String(app.packageFamilyName || app.name || '')
    if (STORE_INFRA_RE.test(pkg) || STORE_INFRA_RE.test(name)) return true
  }
  return false
}

function hasUninstallMethod(app) {
  if (app?.type === 'store') {
    return Boolean(app.packageFullName || app.packageFamilyName || String(app.id || '').startsWith('store|'))
  }
  return Boolean(String(app?.uninstall || '').trim() || String(app?.uninstallOpen || '').trim())
}

function normalizeName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[™®]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchesStartMenu(app, startApps) {
  if (!Array.isArray(startApps) || !startApps.length) return false
  const n = normalizeName(app?.name)
  if (!n || n.length < 2) return false
  const family = String(app?.packageFamilyName || '').toLowerCase()
  for (const s of startApps) {
    const sn = normalizeName(s?.name)
    const id = String(s?.appId || '').toLowerCase()
    if (!sn) continue
    if (sn === n) return true
    if (sn.endsWith(` ${n}`) || n.endsWith(` ${sn}`)) return true
    if (family && family.length > 8 && id.includes(family)) return true
  }
  return false
}

function isJudgableUnused(app, startApps) {
  if (!app || String(app.name || '').trim().length < 2) return false
  if (isRuntimeOrInternal(app)) return false
  if (!hasUninstallMethod(app)) return false
  if (Array.isArray(startApps) && startApps.length) return matchesStartMenu(app, startApps)
  return true
}

module.exports = {
  isRuntimeOrInternal,
  hasUninstallMethod,
  matchesStartMenu,
  isJudgableUnused,
}
