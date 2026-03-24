# gaku-navi

学園アイドルマスターのサポートカードを閲覧・検索するためのWebアプリです。

## セットアップ

```bash
# プロジェクトフォルダへ移動
cd gaku-navi

# 依存関係のインストール
npm install
```

## 開発サーバーの起動

```bash
npm run dev
```

## 主な確認コマンド

```bash
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npx vitest run
npx knip --reporter compact
```
