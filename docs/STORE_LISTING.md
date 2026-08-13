# Microsoft Store listing — Timeboard

Reserved / display name: **Timeboard**  
Fallback if taken: **Timeboard by ymd**

Do not claim Apple Screen Time compatibility.

## Japanese (primary)

**短い説明**  
Windows のアプリ使用時間を、この PC の中だけで記録します。

**長い説明**  
Timeboard は、Windows 向けのデジタルウェルビーイングアプリです。いま前面にあるアプリを記録し、今日・7日・30日の使用時間を一覧します。使っていないインストール済みアプリの候補も出せるので、削除の検討に使えます。

データはインターネットへ送りません。アカウントも広告も解析ツールもありません。記録はユーザーフォルダ内だけです。

Apple の Screen Time とは無関係の独立したアプリです。

**キーワード**  
使用時間, スクリーンタイム, デジタルウェルビーイング, アプリ使用, 未使用アプリ, プライバシー

## English

**Short description**  
Track Windows app usage time locally on this PC.

**Full description**  
Timeboard is a digital wellbeing app for Windows. It records the foreground app and shows today, 7-day, and 30-day usage. It also lists installed apps with no observed use, so you can consider uninstalling them.

No network. No account. No ads. No analytics. Data stays in your user folder.

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
