const INTERNAL_EXE = new Set(
  [
    'explorer',
    'searchhost',
    'searchapp',
    'shellexperiencehost',
    'startmenuexperiencehost',
    'applicationframehost',
    'systemsettings',
    'immersivecontrolpanel',
    'dwm',
    'conhost',
    'runtimebroker',
    'textinputhost',
    'lockapp',
    'widgetservice',
    'widgets',
    'phoneexperiencehost',
    'securityhealthsystray',
    'securityhealthservice',
    'taskmgr',
    'mmc',
    'rundll32',
    'dllhost',
    'sihost',
    'ctfmon',
    'taskhostw',
    'fontdrvhost',
    'backgroundtaskhost',
    'winstore.app',
    'useroobebroker',
    'consent',
    'logonui',
    'crossdeviceresume',
    'prevhost',
    'pickerhost',
    'openwith',
    'hwndwrapper',
    'lockapp',
    'screensaver',
    'csrss',
    'services',
    'lsass',
    'svchost',
    'smss',
    'winlogon',
    'timeboard',
    'electron',
  ].map((s) => s.toLowerCase()),
)

const INTERNAL_NAME_RE =
  /^(file explorer|windows explorer|explorer|settings|windows security|windows defender|control panel|microsoft store|xbox game bar|cortana|widgets|tips|feedback hub|get started|input indicator|windows shell experience)$/i

function exeBase(app) {
  const fromPath = String(app?.path || app?.exe || '')
    .split(/[/\\]/)
    .pop()
    .replace(/\.exe$/i, '')
  const fromName = String(app?.name || '').replace(/\.exe$/i, '')
  return String(fromPath || fromName || '').toLowerCase().trim()
}

function isInternalApp(app) {
  const exe = exeBase(app)
  if (exe && INTERNAL_EXE.has(exe)) return true
  const name = String(app?.name || '').trim()
  if (INTERNAL_NAME_RE.test(name)) return true
  if (['powershell', 'pwsh', 'cmd'].includes(exe) && !String(app?.title || '').trim()) return true
  return false
}

function windowsBucket() {
  return { id: 'windows-shell', name: 'Windows', exe: 'Windows', path: '' }
}

module.exports = { isInternalApp, windowsBucket, INTERNAL_EXE }
