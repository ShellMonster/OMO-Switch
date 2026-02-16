# 🔄 OMO Switch

[![GitHub stars](https://img.shields.io/github/stars/ShellMonster/OMO-Switch?style=flat-square)](https://github.com/ShellMonster/OMO-Switch/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/ShellMonster/OMO-Switch/blob/main/LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/ShellMonster/OMO-Switch?style=flat-square)](https://github.com/ShellMonster/OMO-Switch/releases)
![React](https://img.shields.io/badge/React-18.3.1-blue.svg?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131.svg?style=flat-square)
![Rust](https://img.shields.io/badge/Rust-1.75-000000.svg?style=flat-square)

[English](README_EN.md) | [简体中文](README.md) | [繁體中文](README_TW.md) | [日本語](README_JP.md) | [한국어](README_KR.md)

**OMO Switch** は、[oh-my-opencode](https://github.com/oh-my-opencode/oh-my-opencode) 向けのデスクトップモデル設定管理ツールです。**Tauri 2.0** をベースに構築され、AIモデルの切り替え、プリセット管理、モデルライブラリの閲覧、自動アップデート機能を提供します。

<p align="center">
  <img src="assets/demo_1.png" alt="OMO Switch プレビュー" width="800">
</p>

> 💡 **主な機能**：
> - **🤖 Agent モデル切り替え**：すべての Agent のモデル設定を視覚的に管理
> - **📊 設定概要**：設定状態、接続プロバイダー、モデル割り当てをリアルタイムで確認
> - **🔑 Provider 管理**：API Key とモデルプロバイダーの設定・管理
> - **💾 プリセット管理**：異なるモデル設定プリセットを保存および読み込み
> - **🌐 モデルライブラリ**：利用可能なモデル、価格、機能情報を閲覧
> - **📥 インポート/エクスポート**：設定ファイルのバックアップと復元
> - **🔄 自動更新**：ワンクリックで更新を確認し、自動ダウンロードとインストール
> - **🌍 多言語対応**：中/英/日/韓 5 言語をサポート

---

## 🌟 主な特徴

- **🚀 最高のパフォーマンス**：**Tauri 2.0** + **React 18** ベース、軽量で高速、リソース使用量が極めて低い
- **🎨 モダン UI**：Tailwind CSS を使用したデザイン、シンプルで美しいインターフェース
- **🔄 リアルタイム同期**：設定変更は即座に有効になり、元の設定を自動バックアップ
- **💾 スマートプリセット**：複数の設定プロファイルを保存し、ワンクリックで異なるシーンに切り替え
- **📦 自動更新**：Tauri Updater を統合し、新バージョンを自動通知してワンクリックインストール
- **🌍 多言語対応**：簡体中文、繁体中文、英語、日本語、韓国語を完全サポート
- **🛡️ 安全で信頼性が高い**：すべての設定操作前に自動バックアップ、設定検証をサポート

---

## 🚀 機能の詳細

### 1. Agent モデル切り替え
- **ビジュアル設定**：すべての Agent のモデルと強度レベルをグラフィカルに管理
- **バッチ操作**：Agent 設定のバッチ変更をサポート
- **カテゴリ管理**：カテゴリ（Category）別に Agent を整理し、バッチ設定が容易
- **リアルタイムプレビュー**：設定変更がリアルタイムに表示され、変更後すぐに有効

### 2. 設定概要
- **状態監視**：設定ファイルのパス、サイズ、変更時間をリアルタイムに表示
- **プロバイダーリスト**：接続されているモデルプロバイダーを表示
- **モデル割り当て表**：すべての Agent のモデル割り当てを一目で確認
- **設定検証**：設定形式の正確性を自動検証

### 3. プリセット管理
- **クイック保存**：現在の設定をワンクリックでプリセットとして保存
- **複数プリセット切り替え**：複数のプリセットを作成し、異なる作業シーンに対応
- **プリセット統計**：プリセットに含まれる Agent と Category の数を表示
- **インポート/エクスポート**：プリセット設定のインポート/エクスポートをサポート

### 4. モデルライブラリ
- **モデルリスト**：利用可能なすべてのモデルとそのプロバイダーを表示
- **価格情報**：モデルの入力/出力価格を表示
- **機能説明**：モデルの機能と使用シーンを確認
- **クイック適用**：ワンクリックで指定した Agent にモデルを適用

### 5. インポート/エクスポート
- **完全バックアップ**：すべての設定を JSON ファイルにエクスポート
- **安全なインポート**：インポート前に現在の設定を自動バックアップ
- **履歴**：インポート/エクスポート操作履歴を表示
- **デバイス間同期**：設定ファイルを通じて異なるデバイス間で同期

### 6. 設定センター
- **言語切り替え**：5 言語をリアルタイムに切り替え
- **バージョン検出**：OpenCode と oh-my-opencode のバージョンを検出
- **自動更新**：アプリの更新を確認し、ワンクリックでダウンロードとインストール
- **GitHub リンク**：プロジェクトリポジトリにクイックアクセス

---

## 🏗️ 技術アーキテクチャ

### コア技術スタック
- **フロントエンド**：React 18 + TypeScript + Tailwind CSS + Zustand
- **デスクトップフレームワーク**：Tauri 2.0 (Rust)
- **状態管理**：Zustand + persist ミドルウェア
- **多言語**：react-i18next
- **アイコン**：Lucide React
- **ビルドツール**：Vite

---

## 💻 開発者ガイド

### 1. 環境準備
- **Node.js**: 18+ (20 の使用を推奨)
- **Rust**: 1.75+ (Tauri ビルドに必須)
- **Bun** または **npm**: パッケージマネージャー

### 2. 依存関係のインストール
```bash
# bun を使用（推奨）
bun install

# または npm を使用
npm install
```

### 3. 開発モード
```bash
# 開発サーバーを起動
bun run tauri:dev

# または npm を使用
npm run tauri:dev
```

### 4. アプリケーションのビルド
```bash
# 本番バージョンをビルド
bun run tauri:build

# または npm を使用
npm run tauri:build
```

---

## 🔄 自動更新の設定

プロジェクトは Tauri 公式 Updater プラグインを統合しており、自動更新確認とワンクリックインストールをサポートしています。

### セットアップ手順

1. **署名キーの生成**（一度だけ、秘密鍵を安全に保管）
```bash
cd src-tauri
bun run tauri signer generate -- -w ~/.tauri/omo-switch.key
```

2. **公開鍵の設定**：`src-tauri/tauri.conf.json` に公開鍵を追加

3. **GitHub Secrets の設定**：
   - `TAURI_SIGNING_PRIVATE_KEY`: 秘密鍵ファイルの内容
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: 秘密鍵のパスワード（設定している場合）

---

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下でオープンソース化されています。

---

## 🙏 謝辞

- 本プロジェクトは [Tauri](https://tauri.app/) をベースに構築されています。Tauri チームに感謝します
- 強力な Agent フレームワークを提供してくれた [oh-my-opencode](https://github.com/oh-my-opencode/oh-my-opencode) に感謝します
- すべての貢献者とユーザーのサポートに感謝します

---

## 📞 お問い合わせ

- **GitHub**: [https://github.com/ShellMonster/OMO-Switch](https://github.com/ShellMonster/OMO-Switch)
- **Issues**: [https://github.com/ShellMonster/OMO-Switch/issues](https://github.com/ShellMonster/OMO-Switch/issues)

---

<p align="center">
  Made with ❤️ by OMO Team
</p>
