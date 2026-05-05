# MenuGo

[English Version](./README_en.md) | 繁體中文版

> 一個極簡化的 QR Code 點餐系統，旨在優化用餐體驗並全面消除紙本作業流程。

MenuGo 是一個專為餐廳與咖啡廳打造的現代化、輕量化數位點餐解決方案。透過 QR Code 取代實體菜單與傳統紙本單據，降低溝通成本與人為錯誤，並為顧客與管理人員提供無縫的流程體驗。

## ⚠️ 專案聲明

本專案係為「課堂報告與學術研究實作」用途所開發，並非商業化產品。所有功能與技術架構主要用於展示概念與學習交流，請勿直接用於商業營運環境。

## 核心亮點

- 即時掃碼點餐：顧客透過 QR Code 即可進入互動式菜單，無需下載任何應用程式。
- 資料即時同步：訂單立即推送到廚房與管理後台，確保訊息零時差。
- 無紙化作業：完全取代實體菜單、點菜本與收據，落實環保與高效管理。
- 極簡使用者介面：專注於易用性與速度的乾淨介面，減少視覺干擾。
- 統一管理後台：在同一個地方輕鬆管理菜單品項、價格、桌位狀態與進單狀況。

## 技術架構

- 框架：Next.js (App Router)
- 資料庫與驗證：Supabase
- 開發語言：TypeScript
- 樣式設定：Tailwind CSS

## 快速開始

### 前置需求
請確保您的開發環境已安裝以下工具：
- Node.js (版本 18 或更新)
- 套件管理工具 (npm, yarn 或 pnpm)
- 一個 Supabase 專案

### 安裝與設定步驟

1. 複製專案庫
   git clone https://github.com/seven-317/MenuGo.git
   cd MenuGo

2. 安裝相依套件
   npm install

3. 設定環境變數
   在專案根目錄建立一個 .env.local 檔案，並填入您的 Supabase 憑證：
   NEXT_PUBLIC_SUPABASE_URL=您的_Supabase_專案網址
   NEXT_PUBLIC_SUPABASE_ANON_KEY=您的_Supabase_匿名金鑰

4. 啟動開發伺服器
   npm run dev

啟動後，在瀏覽器開啟 http://localhost:3000 即可查看應用程式。

## 專案結構

MenuGo/
├── public/             # 靜態資源與圖片
├── src/
│   ├── app/            # Next.js App Router (頁面與 API 路由)
│   ├── components/     # 可複用的 UI 元件
│   ├── lib/            # 工具函式與 Supabase 客戶端配置
│   └── types/          # TypeScript 類型定義
├── .env.example        # 環境變數範例檔
└── package.json

## 貢獻指南

我們非常歡迎任何形式的貢獻！如果您有改進建議或發現錯誤，歡迎提交 Issue。

1. 衍生 (Fork) 此專案
2. 建立您的功能分支 (git checkout -b feature/AmazingFeature)
3. 提交您的修改 (git commit -m '說明修改內容')
4. 推送到分支 (git push origin feature/AmazingFeature)
5. 開啟合併請求 (Pull Request)

## 授權條款

本專案採用 MIT 授權條款。詳情請參閱 LICENSE 檔案。