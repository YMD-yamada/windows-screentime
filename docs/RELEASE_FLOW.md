# RELEASE_FLOW — Timeboard (`windows-screentime`)

Windows 向けアプリ使用時間の可視化。第三者公開時も **「iOS / Apple Screen Time と同じ」とは謳わない**。

## ローカル

```
npm install
npm run smoke
npm run desktop
```

開発: `npm run dev`

## 配布パッケージ

```
npm run pack:win
```

成果物は `release/`（NSIS / portable / APPX）。Microsoft Store 用は `npm run pack:store`。

## GitHub

1. `YMD-yamada/windows-screentime` へ push
2. GitHub Release に exe / appx を添付
3. 最新: https://github.com/YMD-yamada/windows-screentime/releases/latest

## Microsoft Store

手順と掲載文: [STORE_LISTING.md](STORE_LISTING.md)  
Identity 雛形: `store-identity.example.json`

Partner Center の本人ログインが必要。個人開発者は [storedeveloper.microsoft.com](https://storedeveloper.microsoft.com) から無料登録（ID＋自撮り）。Identity 反映後に APPX を再ビルドして提出する。

## 掲載

エージェントが `personal-site` の `tools/publish-app-listing.mjs` でストア法務ハブ＋ポートフォリオへ登録する。

- 法務: https://personal-site-taupe-gamma.vercel.app/apps/timeboard/
- プライバシー: https://personal-site-taupe-gamma.vercel.app/legal/privacy/
- サポート: https://personal-site-taupe-gamma.vercel.app/support/

## 法務・表現

- NG: 「iOSと同様」「Screen Time 互換」「Apple公式」
- OK: 「Windows向けデジタルウェルビーイング」「アプリ使用時間の可視化」
