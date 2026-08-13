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

1. Partner Center で製品名を予約（本人ログイン。個人開発者は初回 $19 相当の登録料）
2. Product identity の `identityName` / `publisher` を `electron-builder.yml` の `appx` に反映
3. `npm run pack:store` で APPX を再ビルド
4. Packages / Store listings / Age ratings / Properties を提出
5. 公開 URL が付いたら `storeUrls.windows` を personal-site に追記
