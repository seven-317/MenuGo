# MenuGo

**MenuGo** 是為餐廳與小型餐飲品牌打造的 **無紙化 QR Code 線上點餐** 平台。顧客掃描桌邊 QR 即可瀏覽菜單並送出訂單，店家透過後台即時掌握來單並管理菜單與桌次，降低紙本與口頭點餐的摩擦成本。

---

## 技術棧

| 類別 | 技術 |
|------|------|
| 前端框架 | [Next.js](https://nextjs.org/)（App Router）、[React](https://react.dev/) |
| 樣式 | [Tailwind CSS](https://tailwindcss.com/) v4 |
| 後端即服務 | [Supabase](https://supabase.com/)（PostgreSQL、Auth、Realtime） |
| 資料庫 | PostgreSQL（Schema 與 RLS 定義於 `sql/`） |

---

## 核心功能

- **匿名掃碼點餐**：顧客無需註冊即可透過掃碼進入菜單頁並送出訂單（搭配 Row Level Security 與 RPC 確保寫入一致性）。
- **餐廳即時接單 Dashboard**：以 **Supabase Realtime** 監聽 `orders` 的 `INSERT`，後台列表即時更新，並可一鍵接單更新狀態。
- **菜單雲端管理**：菜單與品項儲存於 Supabase，支援分類、價格、狀態與圖片等欄位，由資料庫權限區分公開瀏覽與店家維護。
- **桌號專屬 Token 與安全強化**：每桌 **`qr_token`** 隨機唯一；可選 **`SCAN_HMAC_SECRET`** 為掃碼 URL 加上 **HMAC** 簽章，降低惡意猜測或偽造連結的風險。
- **QR 產圖 API**：後端提供 `/api/qrcode`，將完整掃碼網址轉成 **PNG** QR 圖，供列印或下載。

---

## 快速開始

### 需求

- [Node.js](https://nodejs.org/)（建議 LTS）
- [Supabase](https://supabase.com/) 專案（PostgreSQL + 建議啟用 Realtime）

### 1. 取得程式碼並安裝依賴

```bash
git clone <your-fork-or-repo-url> MenuGo
cd MenuGo
npm install
```

### 2. 設定環境變數

複製範例檔並填入 Supabase 專案憑證：

```bash
cp .env.example .env.local
```

| 變數 | 說明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL（**Project Settings → API**） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **匿名（anon）** 公開金鑰 |
| `SCAN_HMAC_SECRET` | **選填**。設定後，掃碼頁 `/scan/[token]` 需帶正確 `?sig=`；產 QR 時須一併簽章（見 `lib/scan/hmac.ts`） |

> 請勿將 `service_role` 金鑰或 `SCAN_HMAC_SECRET` 放進 `NEXT_PUBLIC_*` 或前端程式碼。

### 3. 初始化資料庫

在 Supabase **SQL Editor** 依序執行（或併入 migration 流程）：

1. `sql/schema.sql` — 資料表、索引、RLS 及建立訂單相關之資料庫物件（含觸發器）
2. `sql/rpc_create_customer_order.sql` — 建立訂單與明細之 RPC（與 `app/api/order` 搭配）

並於 Supabase **Database → Replication** 對 **`public.orders`** 開啟 **Realtime**，以便後台即時接單元件運作。

### 4. 啟動開發伺服器

```bash
npm run dev
```

瀏覽器開啟 [http://localhost:3000](http://localhost:3000)。

其餘常用指令：

```bash
npm run build   # 正式環境建置
npm run start   # 建置後啟動 production server
npm run lint    # ESLint
```

---

## 專案結構節錄

```
app/
  api/order/route.ts              # 顧客送出訂單（RPC）
  api/orders/[orderId]/accept/   # 後台接單
  api/qrcode/route.ts             # URL → PNG QR
  scan/[token]/page.tsx           # 顧客掃碼菜單頁
components/admin/RealtimeOrderBoard.tsx
lib/supabase/                    # Supabase 瀏覽器／伺服器端客戶端
lib/scan/hmac.ts                 # 掃碼 URL HMAC
sql/                             # PostgreSQL schema 與 RPC
```

---

## 專案願景

餐飲現場的人力多耗在重複的點餐、傳單與確認；MenuGo 希望透過 **QR 自助點餐、雲端菜單與即時訂單流**，減少人工往返與溝通錯誤，讓前場更專注於出餐與服務品質，逐步提升 **點餐與出餐流程的自動化與可追蹤性**，並為後續報表與營運分析預留資料基礎。

---

## 授權

本專案授權條款請見儲存庫內的 [LICENSE](./LICENSE)。
