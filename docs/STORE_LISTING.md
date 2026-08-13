# Microsoft Store listing — Timeboard

Reserved / display name: **Timeboard**  
Fallback if taken: **Timeboard by ymd**

Do not claim Apple Screen Time compatibility.

## Japanese (primary)

**短い説明**  
PC で何に時間を使ったかを見て、使っていないアプリを外します。

**長い説明**  
Timeboard は、Windows 向けのデジタルウェルビーイングアプリです。できることは2つだけです。(1) 今日・7日・30日で、どのアプリに時間を使ったかを見る。(2) スタートメニューにある使っていないアプリを、確認のうえ PC から外す。

Windows の内部部品・ランタイム・ドライバは一覧に出しません。判断しなくてよいものは、そもそも表示しません。データはインターネットへ送りません。アカウントも広告も解析ツールもありません。記録はユーザーフォルダ内だけです。

Apple の Screen Time とは無関係の独立したアプリです。

**キーワード**  
使用時間, スクリーンタイム, デジタルウェルビーイング, アプリ使用, 未使用アプリ, プライバシー

## English

**Short description**  
See where PC time went, then remove apps you do not use.

**Full description**  
Timeboard is a digital wellbeing app for Windows with two jobs: (1) see which apps used time today, over 7 days, or 30 days; (2) uninstall unused Start-menu apps after one confirmation.

Windows internals, runtimes, and drivers are not listed. No network. No account. No ads. No analytics. Data stays in your user folder.

Independent app. Not affiliated with Apple Screen Time.

**Keywords**  
screen time, app usage, digital wellbeing, unused apps, privacy, windows

## Age / properties

- Age: 3+ / Everyone
- Category: Productivity or Lifestyle
- Privacy URL: https://personal-site-taupe-gamma.vercel.app/apps/timeboard/
- Support URL: https://personal-site-taupe-gamma.vercel.app/support/
- Website: https://github.com/YMD-yamada/windows-screentime
- Screenshots: `store/screenshot-1366x768.png`
- Icon: `build/icon.png`

## Submission

1. [storedeveloper.microsoft.com](https://storedeveloper.microsoft.com) から個人開発者登録（無料。ID＋自撮り。入口はここだけ使う） — 済
2. Partner Center で **Timeboard** を予約 — 済（Identity: `KentoYamada.Timeboard` / `CN=2BF85987-6A2E-4A9B-9DBF-C9A3580E7588` / `Kento Yamada`）
3. `electron-builder.yml` の `appx` に反映して `npm run pack:store`
4. Partner Center の **Packages** に arm64 / x64 の `.appx` をアップロード
5. Store listings / Age ratings / Properties を提出（掲載文はこのファイル）
6. 公開 URL が付いたら `storeUrls.windows` を personal-site に追記
