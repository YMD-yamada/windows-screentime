import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveLang, t, type Lang } from './i18n'

type Range = 'today' | '7d' | '30d'
type Tab = Range | 'unused' | 'settings'

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
}

type NowInfo = {
  name?: string
  title?: string
  status?: string
  idleMs?: number
}

type UnusedApp = {
  id: string
  name: string
  publisher?: string
  type?: string
  uninstallOpen?: string
  switchHint?: number
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

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [now, setNow] = useState<NowInfo | null>(null)
  const [unused, setUnused] = useState<UnusedApp[] | null>(null)
  const [unusedMeta, setUnusedMeta] = useState('')
  const [busy, setBusy] = useState(false)

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
    if (tab !== 'unused' || !api) return
    let cancelled = false
    setBusy(true)
    api
      .getUnused(settings?.unusedDays || 14)
      .then((res) => {
        if (cancelled) return
        setUnused(res.unused || [])
        setUnusedMeta(`${res.unused?.length || 0} / ${res.inventoryCount || 0}`)
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

  const statusLabel = useMemo(() => {
    if (!settings?.tracking || now?.status === 'paused') return d.paused
    if (now?.status === 'idle') return d.idle
    return d.tracking
  }, [settings, now, d])

  async function patchSettings(patch: Partial<Settings>) {
    if (!api) return
    const next = await api.setSettings(patch)
    setSettings(next)
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="brand">
          <h1>{d.title}</h1>
          <p>{d.tagline}</p>
          <div className="disclaimer">{d.disclaimer}</div>
        </div>
        <div className="now-pill">
          <div className="muted">{d.now}</div>
          <b>{now?.name || '—'}</b>
          <div className="muted">{statusLabel}</div>
        </div>
      </header>

      <nav className="tabs">
        {(['today', '7d', '30d', 'unused', 'settings'] as Tab[]).map((key) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {key === 'today' ? d.today : key === '7d' ? d.d7 : key === '30d' ? d.d30 : key === 'unused' ? d.unused : d.settings}
          </button>
        ))}
      </nav>

      {(tab === 'today' || tab === '7d' || tab === '30d') && (
        <section className="grid">
          <article className="card">
            <div className="muted">{d.total}</div>
            <div className="total-num">{formatDuration(summary?.totalMs || 0, lang)}</div>
            <div className="muted">
              {d.idle}: {formatDuration(summary?.idleMs || 0, lang)}
            </div>
            <div className="actions">
              <button className="btn" onClick={() => api?.exportCsv(tab === 'today' ? 'today' : tab)}>
                {d.exportCsv}
              </button>
            </div>
            {tab !== 'today' && (
              <div style={{ marginTop: 16 }}>
                {(summary?.byDay || []).map((day) => (
                  <div className="day-row" key={day.date}>
                    <span>{day.date.slice(5)}</span>
                    <div className="track">
                      <div className="fill" style={{ width: `${Math.max(4, (day.ms / maxDay) * 100)}%` }} />
                    </div>
                    <span>{formatDuration(day.ms, lang)}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
          <article className="card">
            {!summary?.apps.length ? (
              <div className="empty">{d.noData}</div>
            ) : (
              summary.apps.slice(0, 20).map((app) => (
                <div className="bar-row" key={app.id} title={app.path || app.exe}>
                  <span>{app.name}</span>
                  <div className="track">
                    <div className="fill" style={{ width: `${Math.max(4, (app.ms / maxApp) * 100)}%` }} />
                  </div>
                  <span>{formatDuration(app.ms, lang)}</span>
                </div>
              ))
            )}
          </article>
        </section>
      )}

      {tab === 'unused' && (
        <section className="card">
          <p className="muted">{d.unusedHelp}</p>
          <div className="actions">
            <button
              className="btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await api?.refreshInstalled()
                  const res = await api?.getUnused(settings?.unusedDays || 14)
                  setUnused(res?.unused || [])
                  setUnusedMeta(`${res?.unused?.length || 0} / ${res?.inventoryCount || 0}`)
                } finally {
                  setBusy(false)
                }
              }}
            >
              {d.refreshInstalled}
            </button>
            <span className="muted">{busy ? '…' : unusedMeta}</span>
          </div>
          {(unused || []).slice(0, 80).map((app) => (
            <div className="unused-item" key={app.id}>
              <div>
                <h3>{app.name}</h3>
                <div className="muted">
                  {app.type === 'store' ? d.typeStore : d.typeWin32}
                  {app.publisher ? ` · ${app.publisher}` : ''}
                  {typeof app.switchHint === 'number' ? ` · ${d.switchHint} ${app.switchHint}` : ''}
                </div>
              </div>
              <button className="btn" onClick={() => api?.openUninstall(app)}>
                {d.openUninstall}
              </button>
            </div>
          ))}
        </section>
      )}

      {tab === 'settings' && settings && (
        <section className="card settings">
          <label>{d.language}</label>
          <select
            value={settings.language}
            onChange={(e) => patchSettings({ language: e.target.value as Settings['language'] })}
          >
            <option value="system">{d.langSystem}</option>
            <option value="ja">{d.langJa}</option>
            <option value="en">{d.langEn}</option>
          </select>

          <div className="row">
            <span>{d.trackingEnabled}</span>
            <input
              type="checkbox"
              checked={settings.tracking}
              onChange={(e) => patchSettings({ tracking: e.target.checked })}
            />
          </div>
          <div className="row">
            <span>{d.autostart}</span>
            <input
              type="checkbox"
              checked={settings.autostart}
              onChange={(e) => patchSettings({ autostart: e.target.checked })}
            />
          </div>

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

          <h3 style={{ marginTop: 24 }}>{d.privacy}</h3>
          <p className="muted">{d.privacyBody}</p>
          <p className="muted">{d.quitHint}</p>
        </section>
      )}
    </div>
  )
}
