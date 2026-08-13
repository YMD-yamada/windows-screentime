# Timeboard

Windows 向けのアプリ使用時間トラッカー。データはすべてこの PC 内に保存します。Apple の Screen Time とは無関係です。

- ダウンロード: [GitHub Releases](https://github.com/YMD-yamada/windows-screentime/releases/latest)
- プライバシー: https://personal-site-taupe-gamma.vercel.app/apps/timeboard/
- サポート: https://personal-site-taupe-gamma.vercel.app/support/

## できること

- アプリアイコン付きの使用時間（今日 / 7日 / 30日）
- いま使っているアプリの表示、離席との切り分け
- 使っていないアプリの整理（確認後に Timeboard がアンインストール。ランタイム等は出さない）
- CSV 書き出し、Windows 起動時スタート、日英 UI

## 使い方

```bash
npm install
npm run smoke
npm run desktop
```

トレイに常駐します。ウィンドウを閉じても終了しません。終了はトレイメニューから。

詳細は [docs/RELEASE_FLOW.md](docs/RELEASE_FLOW.md)、[docs/STORE_LISTING.md](docs/STORE_LISTING.md)、[docs/PRIVACY.md](docs/PRIVACY.md)。
