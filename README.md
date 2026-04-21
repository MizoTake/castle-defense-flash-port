# 城を守れ | Web 版

2013年ごろにFlashで作っていた「城を守れ」を、JavaScript と Canvas でブラウザ実行できるように再構成したリポジトリです。

このリポジトリは GitHub Pages でそのまま配信できる静的サイト構成です。`index.html` を起点に、`game.js` がゲーム進行、`app.js` が描画と入力、`assets/` が画像素材を持ちます。

## ローカル確認

任意の静的 HTTP サーバーでリポジトリルートを配信してください。例:

```powershell
cd <repo-root>
py -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開くとタイトル画面を確認できます。

## テスト

```powershell
node --check game.js
node --check app.js
node --test game.test.js
```

## GitHub Pages

`.github/workflows/deploy-convert-pages.yml` はリポジトリルート全体をアーティファクトとして GitHub Pages にデプロイします。workflow の push トリガーは現在 `main` と `master` に対応しています。別ブランチで運用する場合は `branches` を合わせてください。

公開時に確認したい点:

- 画像素材の再配布可否を事前に確認する
- GitHub Pages 側で Actions を有効にする
- URL 配下でも壊れないよう、アセットパスは相対パスを維持する
