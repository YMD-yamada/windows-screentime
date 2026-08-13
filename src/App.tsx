import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppIcon, BrandMark, UsageRing } from './components/AppIcon'
import { resolveLang, t, type Lang } from './i18n'

type Range = 'today' | '7d' | '30d'
type Tab = Range | 'unused' | 'settings'
type Filter = 'all' | 'win32' | 'store'

type AppRow = {
  id: string
  name: string
  exe?: string
  path?: string
  ms: number
  lastSeen?: number
}

type Summary = {
  range: string
  totalMs: number
  idleMs: number
  apps: AppRow[]
  byDay: { date: string; ms: number; idleMs: number }[]
}

type Settings = {
  language: 'system' | 'ja' | 'en'
  autostart: boolean
  idleSeconds: number
  tracking: boolean
  unusedDays: number
  seenTips?: boolean
  ignoredApps?: { id: string; name: string }[]
}

type NowInfo = {
  name?: string
  title?: string
  status?: string
  idleMs?: number
  path?: string
}

type UnusedApp = {
  id: string
  name: string
  publisher?: string
  type?: string
  uninstallOpen?: string
  switchHint?: number
  displayIcon?: string
  installLocation?: string
  path?: string
  sizeKb?: number | null
}

function formatDuration(ms: number, lang: Lang) {
  const totalMin = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (lang === 'ja') {
    if (h <= 0) return `${m}分`
    return `${h}時間 ${m}分`
  }
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

function formatSize(kb?: number | null) {
  const n = Number(kb) || 0
  if (n <= 0) return ''
  if (n < 1024) return `${n} KB`
  const mb = n / 1024
  if (mb < 1024) return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

function weekday(date: string, lang: Lang) {
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
}

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [now, setNow] = useState<NowInfo | null>(null)
  const [unused, setUnused] = useState<UnusedApp[] | null>(null)
  const [unusedMeta, setUnusedMeta] = useState('')
  const [busy, setBusy] = useState(false)
  const [icons, setIcons] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmApp, setConfirmApp] = useState<UnusedApp | null>(null)
  const [notice, setNotice] = useState('')

  const lang = resolveLang(settings?.language || 'system')
  const d = t(lang)
  const api = window.timeboard

  const loadSummary = useCallback(
    async (range: Range) => {
      if (!api) return
      setSummary(await api.getSummary(range))
    },
    [api],
  )

  const loadSettings = useCallback(async () => {
    if (!api) return
    setSettings(await api.getSettings())
  }, [api])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (tab === 'today' || tab === '7d' || tab === '30d') void loadSummary(tab)
  }, [tab, loadSummary])

  useEffect(() => {
    if (!api) return
    const tick = async () => setNow(await api.getNow())
    void tick()
    const id = window.setInterval(tick, 2000)
    return () => window.clearInterval(id)
  }, [api])

  useEffect(() => {
    if (!api?.onIcon) return
    return api.onIcon(({ key, dataUrl }) => {
      if (!key || !dataUrl) return
      setIcons((prev) => (prev[key] === dataUrl ? prev : { ...prev, [key]: dataUrl }))
    })
  }, [api])

  useEffect(() => {
    if (!api) return
    const reqs: Array<Record<string, string>> = []
    if (now?.name || now?.path) {
      reqs.push({ key: now.path || now.name || 'now', path: now.path || '', name: now.name || '' })
    }
    for (const app of summary?.apps || []) {
      reqs.push({ key: app.id, path: app.path || '', exe: app.exe || '', name: app.name })
    }
    for (const app of unused || []) {
      reqs.push({
        key: app.id,
        path: app.path || '',
        displayIcon: app.displayIcon || '',
        installLocation: app.installLocation || '',
        name: app.name,
      })
    }
    if (!reqs.length) return
    void api.getIcons(reqs).then((cached) => {
      if (cached && Object.keys(cached).length) {
        setIcons((prev) => ({ ...cached, ...prev }))
      }
    })
  }, [api, summary, unused, now?.path, now?.name])

  useEffect(() => {
    if (tab !== 'unused' || !api) return
    let cancelled = false
    setBusy(true)
    api
      .getUnused(settings?.unusedDays || 14)
      .then((res) => {
        if (cancelled) return
        setUnused(res.unused || [])
        const size = formatSize(res.sizeTotalKb)
        setUnusedMeta(
          `${d.cleanupStats.replace('{count}', String(res.unused?.length || 0))}${size ? ` · ${size}` : ''}`,
        )
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [tab, api, settings?.unusedDays])

  const maxApp = Math.max(1, ...(summary?.apps.map((a) => a.ms) || [1]))
  const maxDay = Math.max(1, ...(summary?.byDay.map((a) => a.ms) || [1]))
  const activeMs = summary?.totalMs || 0
  const idleMs = summary?.idleMs || 0

  const statusLabel = useMemo(() => {
    if (!settings?.tracking || now?.status === 'paused') return d.paused
    if (now?.status === 'idle') return d.idle
    return d.tracking
  }, [settings, now, d])

  const filteredUnused = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (unused || []).filter((app) => {
      if (filter !== 'all' && app.type !== filter) return false
      if (!q) return true
      return `${app.name} ${app.publisher || ''}`.toLowerCase().includes(q)
    })
  }, [unused, query, filter])

  async function patchSettings(patch: Partial<Settings>) {
    if (!api) return
    const next = await api.setSettings(patch)
    setSettings(next)
    return next
  }

  async function keepApp(app: UnusedApp) {
    const ignoredApps = [
      ...(settings?.ignoredApps || []).filter((x) => x.id !== app.id),
      { id: app.id, name: app.name },
    ]
    await patchSettings({ ignoredApps })
    setUnused((prev) => (prev || []).filter((a) => a.id !== app.id))
    setNotice(`${app.name}: ${d.keep}`)
  }

  async function restoreApp(id: string) {
    const ignoredApps = (settings?.ignoredApps || []).filter((x) => x.id !== id)
    await patchSettings({ ignoredApps })
    if (tab === 'unused') {
      const res = await api?.getUnused(settings?.unusedDays || 14)
      setUnused(res?.unused || [])
    }
  }

  function applyUnusedMeta(res: { unused?: UnusedApp[]; sizeTotalKb?: number } | undefined) {
    const size = formatSize(res?.sizeTotalKb)
    setUnusedMeta(
      `${d.cleanupStats.replace('{count}', String(res?.unused?.length || 0))}${size ? ` · ${size}` : ''}`,
    )
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'today', label: d.today, icon: '◉' },
    { key: '7d', label: d.d7, icon: '▦' },
    { key: '30d', label: d.d30, icon: '▤' },
    { key: 'unused', label: d.unused, icon: '◎' },
    { key: 'settings', label: d.settings, icon: '⚙' },
  ]

  return (
    <div className="app">
      <header className="hero">
        <div className="brand">
          <div className="brand-row">
            <BrandMark size={44} />
            <div>
              <h1>{d.title}</h1>
              <p>{d.tagline}</p>
            </div>
          </div>
          <div className="disclaimer">{d.disclaimer}</div>
        </div>
        <div className={`now-card status-${now?.status || 'active'}`}>
          <AppIcon src={icons[now?.path || now?.name || '']} name={now?.name || d.now} size={40} />
          <div className="now-copy">
            <div className="muted">{d.now}</div>
            <b>{now?.name || '—'}</b>
            <div className={`status-dot ${now?.status || 'active'}`}>{statusLabel}</div>
          </div>
        </div>
      </header>

      {!settings?.seenTips && (
        <aside className="tip-card">
          <BrandMark size={36} />
          <div>
            <strong>{d.tipTitle}</strong>
            <p>{d.tipBody}</p>
          </div>
          <button className="btn primary" onClick={() => patchSettings({ seenTips: true })}>
            {d.tipOk}
          </button>
        </aside>
      )}

      <nav className="tabs" aria-label="views">
        {tabs.map((item) => (
          <button
            key={item.key}
            className={tab === item.key ? 'active' : ''}
            onClick={() => setTab(item.key)}
          >
            <span className="tab-ico" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      {(tab === 'today' || tab === '7d' || tab === '30d') && (
        <section className="grid">
          <article className="card summary-card">
            <UsageRing activeMs={activeMs} idleMs={idleMs} label={formatDuration(activeMs, lang)} />
            <div className="muted">{d.total}</div>
            <div className="legend">
              <span>
                <i className="swatch active" />
                {d.active} {formatDuration(activeMs, lang)}
              </span>
              <span>
                <i className="swatch idle" />
                {d.idle} {formatDuration(idleMs, lang)}
              </span>
            </div>
            <div className="muted">
              {(summary?.apps.length || 0).toString()} {d.appsCount}
            </div>
            <div className="actions">
              <button
                className="btn"
                onClick={() => patchSettings({ tracking: !(settings?.tracking !== false) })}
              >
                {settings?.tracking === false ? d.resume : d.pause}
              </button>
              <button className="btn" onClick={() => api?.exportCsv(tab === 'today' ? 'today' : tab)}>
                {d.exportCsv}
              </button>
            </div>
            {tab !== 'today' && (
              <div className="day-list">
                {(summary?.byDay || []).map((day) => (
                  <div className="day-row" key={day.date} title={day.date}>
                    <span>{weekday(day.date, lang)}</span>
                    <div className="track">
                      <div className="fill" style={{ width: `${Math.max(6, (day.ms / maxDay) * 100)}%` }} />
                    </div>
                    <span>{formatDuration(day.ms, lang)}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
          <article className="card">
            {!summary?.apps.length ? (
              <div className="empty">
                <BrandMark size={56} />
                <p>{d.noData}</p>
              </div>
            ) : (
              summary.apps.slice(0, 24).map((app) => {
                const pct = Math.round((app.ms / Math.max(activeMs, 1)) * 100)
                return (
                  <div className="bar-row" key={app.id} title={app.path || app.exe}>
                    <AppIcon src={icons[app.id]} name={app.name} />
                    <div className="bar-meta">
                      <div className="bar-name">{app.name}</div>
                      <div className="track">
                        <div className="fill" style={{ width: `${Math.max(4, (app.ms / maxApp) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="bar-time">
                      <strong>{formatDuration(app.ms, lang)}</strong>
                      <span className="muted">
                        {pct}% {d.shareOf}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </article>
        </section>
      )}

      {tab === 'unused' && (
        <section className="card">
          <div className="explain">
            <h2>{d.cleanupTitle}</h2>
            <p>{d.cleanupLead}</p>
            <ul>
              <li>{d.cleanupIs}</li>
              <li>{d.cleanupKeep}</li>
              <li>{d.cleanupNot}</li>
            </ul>
          </div>
          {notice ? <div className="notice">{notice}</div> : null}
          <div className="toolbar">
            <input
              className="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={d.searchUnused}
              aria-label={d.searchUnused}
            />
            <div className="filters">
              {(['all', 'win32', 'store'] as Filter[]).map((f) => (
                <button key={f} className={filter === f ? 'btn primary' : 'btn'} onClick={() => setFilter(f)}>
                  {f === 'all' ? d.filterAll : f === 'store' ? d.filterStore : d.filterDesktop}
                </button>
              ))}
            </div>
            <button
              className="btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await api?.refreshInstalled()
                  const res = await api?.getUnused(settings?.unusedDays || 14)
                  setUnused(res?.unused || [])
                  applyUnusedMeta(res)
                } finally {
                  setBusy(false)
                }
              }}
            >
              {d.refreshInstalled}
            </button>
            <span className="muted">{busy ? '…' : unusedMeta}</span>
          </div>
          {filteredUnused.slice(0, 100).map((app) => (
            <div className="unused-item" key={app.id}>
              <AppIcon src={icons[app.id]} name={app.name} size={40} />
              <div className="unused-copy">
                <h3>
                  {app.name}
                  {(app.switchHint || 0) === 0 ? <em className="badge">{d.candidate}</em> : null}
                </h3>
                <div className="muted">
                  {app.type === 'store' ? d.typeStore : d.typeWin32}
                  {formatSize(app.sizeKb) ? ` · ${formatSize(app.sizeKb)}` : ''}
                  {app.publisher ? ` · ${app.publisher}` : ''}
                </div>
              </div>
              <div className="unused-actions">
                <button className="btn" onClick={() => keepApp(app)} title={d.cleanupKeep}>
                  {d.keep}
                </button>
                <button className="btn" onClick={() => api?.openLocation(app)}>
                  {d.openLocation}
                </button>
                <button className="btn primary" onClick={() => setConfirmApp(app)}>
                  {d.openUninstall}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'settings' && settings && (
        <section className="card settings">
          <div className="setting-block">
            <BrandMark size={48} />
            <div>
              <h2>{d.title}</h2>
              <p className="muted">{d.privacyBody}</p>
            </div>
          </div>

          <label>{d.language}</label>
          <select
            value={settings.language}
            onChange={(e) => patchSettings({ language: e.target.value as Settings['language'] })}
          >
            <option value="system">{d.langSystem}</option>
            <option value="ja">{d.langJa}</option>
            <option value="en">{d.langEn}</option>
          </select>

          <label className="toggle">
            <span>{d.trackingEnabled}</span>
            <input
              type="checkbox"
              checked={settings.tracking}
              onChange={(e) => patchSettings({ tracking: e.target.checked })}
            />
          </label>
          <label className="toggle">
            <span>{d.autostart}</span>
            <input
              type="checkbox"
              checked={settings.autostart}
              onChange={(e) => patchSettings({ autostart: e.target.checked })}
            />
          </label>

          <label>{d.idleSeconds}</label>
          <input
            type="number"
            min={20}
            max={600}
            value={settings.idleSeconds}
            onChange={(e) => patchSettings({ idleSeconds: Number(e.target.value) || 90 })}
          />

          <label>{d.unusedDays}</label>
          <input
            type="number"
            min={7}
            max={90}
            value={settings.unusedDays}
            onChange={(e) => patchSettings({ unusedDays: Number(e.target.value) || 14 })}
          />

          <h3>{d.ignoredTitle}</h3>
          {(settings.ignoredApps || []).length === 0 ? (
            <p className="muted">{d.ignoredEmpty}</p>
          ) : (
            (settings.ignoredApps || []).map((item) => (
              <div className="ignored-row" key={item.id}>
                <span>{item.name}</span>
                <button className="btn" onClick={() => restoreApp(item.id)}>
                  {d.restore}
                </button>
              </div>
            ))
          )}

          <h3>{d.privacy}</h3>
          <p className="muted">{d.quitHint}</p>
        </section>
      )}

      {confirmApp ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <AppIcon src={icons[confirmApp.id]} name={confirmApp.name} size={48} />
            <h2>{d.uninstallTitle}</h2>
            <p>{d.uninstallBody.replace('{name}', confirmApp.name)}</p>
            <ul>
              <li>{d.uninstallIs}</li>
              <li>{d.uninstallIsNot}</li>
            </ul>
            <p className="muted">{d.uninstallHow}</p>
            <div className="actions">
              <button className="btn" onClick={() => setConfirmApp(null)}>
                {d.cancel}
              </button>
              <button
                className="btn primary"
                onClick={async () => {
                  await api?.openUninstall(confirmApp)
                  setNotice(d.uninstallOpened)
                  setConfirmApp(null)
                }}
              >
                {d.uninstallConfirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
