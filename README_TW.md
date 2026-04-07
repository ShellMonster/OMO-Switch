# 🔄 OMO Switch

[![GitHub stars](https://img.shields.io/github/stars/ShellMonster/OMO-Switch?style=flat-square)](https://github.com/ShellMonster/OMO-Switch/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/ShellMonster/OMO-Switch/blob/main/LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/ShellMonster/OMO-Switch?style=flat-square)](https://github.com/ShellMonster/OMO-Switch/releases)
![React](https://img.shields.io/badge/React-18.3.1-blue.svg?style=flat-square)
![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131.svg?style=flat-square)
![Rust](https://img.shields.io/badge/Rust-1.75-000000.svg?style=flat-square)

[English](README_EN.md) | [简体中文](README.md) | [繁體中文](README_TW.md) | [日本語](README_JP.md) | [한국어](README_KR.md)

**OMO Switch** 是專為 [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) 打造的桌面端模型配置管理工具。基於 **Tauri 2.0** 構建，支援可視化切換 AI 模型、管理預設配置、瀏覽模型庫，並提供自動更新功能。

<p align="center">
  <img src="assets/demo_1.png" alt="OMO Switch 預覽" width="800">
</p>

> 💡 **核心功能**：
> - **🤖 Agent 模型切換**：可視化管理所有 Agent 的模型配置
> - **📊 配置總覽**：即時查看配置狀態、已連接提供商、模型分配
> - **🔑 Provider 管理**：配置和管理 API Key 及模型提供商
> - **💾 預設管理**：儲存和載入不同的模型配置預設
> - **🌐 模型庫瀏覽**：查看可用模型、定價和能力資訊
> - **📥 匯入匯出**：備份和還原配置檔案
> - **🔄 自動更新**：一鍵檢查更新，自動下載安裝
> - **🌍 多語言支援**：支援中/英/日/韓 5 種語言

---

## 🌟 核心特性

- **🚀 極致效能**：基於 **Tauri 2.0** + **React 18**，輕量快速，資源佔用極低
- **🎨 現代化 UI**：採用 Tailwind CSS 設計，介面簡潔美觀
- **🔄 即時同步**：配置修改即時生效，自動備份原配置
- **💾 智慧預設**：儲存多套配置方案，一鍵切換不同場景
- **📦 自動更新**：整合 Tauri Updater，新版本自動提醒並一鍵安裝
- **🌍 多語言**：完整支援簡體中文、繁體中文、英文、日文、韓文
- **🛡️ 安全可靠**：所有配置操作前自動備份，支援配置驗證

---

## 🚀 功能特性詳解

### 1. Agent 模型切換
- **可視化配置**：圖形介面管理所有 Agent 的模型和強度等級
- **批次操作**：支援批次修改 Agent 配置
- **分類管理**：按類別（Category）組織 Agent，便於批次設定
- **即時預覽**：配置變更即時顯示，修改後立即生效

### 2. 配置總覽
- **狀態監控**：即時顯示配置檔案路徑、大小、修改時間
- **提供商列表**：查看已連接的模型提供商
- **模型分配表**：一覽所有 Agent 的模型分配情況
- **配置驗證**：自動驗證配置格式正確性

### 3. 預設管理
- **快速儲存**：一鍵儲存目前配置為預設
- **多預設切換**：支援建立多個預設，適應不同工作場景
- **預設統計**：顯示預設包含的 Agent 和 Category 數量
- **匯入匯出**：支援預設配置的匯入匯出

### 4. 模型庫瀏覽
- **模型列表**：查看所有可用模型及其提供商
- **定價資訊**：顯示模型的輸入/輸出定價
- **能力描述**：查看模型能力和適用場景
- **快速應用**：一鍵將模型應用到指定 Agent

### 5. 匯入匯出
- **完整備份**：匯出所有配置到 JSON 檔案
- **安全匯入**：匯入配置前自動備份目前配置
- **歷史記錄**：查看匯入匯出操作歷史
- **跨裝置同步**：透過配置檔案在不同裝置間同步

### 6. 設定中心
- **語言切換**：5 種語言即時切換
- **版本檢測**：檢測 OpenCode 和 oh-my-openagent 版本
- **自動更新**：檢查應用更新，一鍵下載安裝
- **GitHub 連結**：快速訪問專案倉庫

---

## 🏗️ 技術架構

### 核心技術堆疊
- **前端**：React 18 + TypeScript + Tailwind CSS + Zustand
- **桌面框架**：Tauri 2.0 (Rust)
- **狀態管理**：Zustand + persist 中介軟體
- **多語言**：react-i18next
- **圖示**：Lucide React
- **建置工具**：Vite

---

## 💻 開發者指南

### 1. 環境準備
- **Node.js**: 18+ (建議使用 20)
- **Rust**: 1.75+ (Tauri 建置必備)
- **Bun** 或 **npm**: 套件管理器

### 2. 安裝依賴
```bash
# 使用 bun（推薦）
bun install

# 或使用 npm
npm install
```

### 3. 開發模式
```bash
# 啟動開發伺服器
bun run tauri:dev

# 或使用 npm
npm run tauri:dev
```

### 4. 建置應用
```bash
# 建置生產版本
bun run tauri:build

# 或使用 npm
npm run tauri:build
```

---

## 🔄 自動更新配置

專案已整合 Tauri 官方 Updater 外掛程式，支援自動檢查更新和一鍵安裝。

### 配置步驟

1. **產生簽章金鑰**（僅需一次，妥善儲存私鑰）
```bash
cd src-tauri
bun run tauri signer generate -- -w ~/.tauri/omo-switch.key
```

2. **配置公鑰**：將公鑰內容寫入 `src-tauri/tauri.conf.json`

3. **配置 GitHub Secrets**：
   - `TAURI_SIGNING_PRIVATE_KEY`: 私鑰檔案內容
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: 私鑰密碼（如有）

---

## 📄 開源協議

本專案採用 [MIT License](LICENSE) 協議開源。

---

## 🙏 特別鳴謝

- 本專案基於 [Tauri](https://tauri.app/) 建置，感謝 Tauri 團隊提供的優秀框架
- 感謝 [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) 提供的強大 Agent 框架
- 感謝所有貢獻者和使用者的支援與回饋

---

## 📞 聯絡我們

- **GitHub**: [https://github.com/ShellMonster/OMO-Switch](https://github.com/ShellMonster/OMO-Switch)
- **Issues**: [https://github.com/ShellMonster/OMO-Switch/issues](https://github.com/ShellMonster/OMO-Switch/issues)

---

<p align="center">
  Made with ❤️ by OMO Team
</p>
