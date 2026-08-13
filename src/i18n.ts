export type Lang = 'ja' | 'en'

const ja = {
  title: 'Timeboard',
  tagline: 'Windows のアプリ使用時間。記録はすべてこの端末の中だけ。',
  disclaimer: 'Apple の Screen Time とは無関係の独立したアプリです。',
  today: '今日',
  d7: '7日',
  d30: '30日',
  unused: '未使用',
  settings: '設定',
  total: '画面時間',
  idle: 'アイドル',
  now: 'いま',
  paused: '一時停止中',
  tracking: '計測中',
  noData: 'まだ記録がありません。このまま使っていると、アプリ別の時間が溜まります。',
  unusedHelp:
    'インストール済みで、選択した期間に Timeboard が前面使用を観測していないアプリです。OS 内部の切替回数は参考値で、正確な使用時間ではありません。',
  unusedDays: '未使用とみなす日数',
  refreshInstalled: 'インストール一覧を更新',
  openUninstall: '削除画面を開く',
  switchHint: 'OS切替回数（参考）',
  publisher: '発行元',
  typeWin32: 'デスクトップ',
  typeStore: 'ストア',
  language: '言語',
  langSystem: 'OSに合わせる',
  langJa: '日本語',
  langEn: 'English',
  autostart: 'Windows 起動時に開始',
  idleSeconds: 'アイドルとみなす秒数',
  trackingEnabled: '使用時間を記録する',
  exportCsv: 'CSV書き出し',
  privacy: 'プライバシー',
  privacyBody:
    '通信しません。データはユーザーフォルダ内の Timeboard にだけ保存します。計測は前面ウィンドウと最終入力時刻のみです。',
  quitHint: '閉じるボタンはトレイに格納します。終了はトレイメニューから。',
  hours: '時間',
  minutes: '分',
}

const en = {
  title: 'Timeboard',
  tagline: 'App usage time for Windows. Everything stays on this PC.',
  disclaimer: 'Independent app. Not affiliated with Apple Screen Time.',
  today: 'Today',
  d7: '7 days',
  d30: '30 days',
  unused: 'Unused',
  settings: 'Settings',
  total: 'Screen time',
  idle: 'Idle',
  now: 'Now',
  paused: 'Paused',
  tracking: 'Tracking',
  noData: 'No records yet. Keep using the PC and per-app time will appear.',
  unusedHelp:
    'Installed apps with no foreground use observed by Timeboard in the selected window. OS switch counts are hints only, not accurate duration.',
  unusedDays: 'Unused after (days)',
  refreshInstalled: 'Refresh installed list',
  openUninstall: 'Open uninstall',
  switchHint: 'OS switch count (hint)',
  publisher: 'Publisher',
  typeWin32: 'Desktop',
  typeStore: 'Store',
  language: 'Language',
  langSystem: 'Match Windows',
  langJa: '日本語',
  langEn: 'English',
  autostart: 'Start with Windows',
  idleSeconds: 'Idle after (seconds)',
  trackingEnabled: 'Record usage',
  exportCsv: 'Export CSV',
  privacy: 'Privacy',
  privacyBody:
    'No network. Data stays in your user folder under Timeboard. We only read the foreground window and last input time.',
  quitHint: 'Close hides to the tray. Quit from the tray menu.',
  hours: 'h',
  minutes: 'm',
}

export type Dict = typeof ja

export function resolveLang(setting: string, systemLang = navigator.language): Lang {
  if (setting === 'ja' || setting === 'en') return setting
  return systemLang.toLowerCase().startsWith('ja') ? 'ja' : 'en'
}

export function t(lang: Lang): Dict {
  return lang === 'en' ? en : ja
}
