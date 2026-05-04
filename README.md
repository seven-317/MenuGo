# MenuGo

學校報告用 **QR Code 線上點餐** 當練習專題：顧客掃碼看菜單、下單；店家後台管理餐桌／菜單、產生**限時入座 QR**、即時接單。此儲存庫為公開，主要方便繳交與同儕參考，並非商業產品。

## 用了什麼

- **Next.js**（App Router）+ **React**
- **Tailwind CSS**
- **Supabase**：PostgreSQL、Auth、**Realtime**
- 資料表、RLS、RPC 寫在 `sql/`，舊庫可透過 `sql/migrate_*.sql` 補齊

## 功能概述

### 顧客（掃碼）

- **`/scan/[token]`**：依入座節次的 `qr_token` 開啟點餐頁（可選 `SCAN_HMAC_SECRET` 幫網址加簽，見 `lib/scan/hmac.ts`）。
- **限時規則**：店家在後台為「這一桌、這一場客人」產生新 QR；可設定 **用餐時間**（預設 120 分鐘）與 **點餐時間**（預設 90 分鐘）。逾時後掃碼頁失效、亦無法再送單（由 RPC 與頁面雙重把關）。
- 菜單只顯示 `available` 品項；送單走 **`/api/order`** → `create_customer_order(p_table_session_id, …)`，避免單頭／明細寫入不一致。
- 可從「資訊」分頁查看本場次已送訂單（需同一 QR／同一節次）。

### 店家後台

- **`/admin/login`**、**`/admin/register`**：註冊／登入（Supabase Auth）。新帳號可在首頁建立第一間餐廳與第一桌。
- **`/admin/tables`**：管理餐桌（桌號；入座 QR 在別頁產生）。
- **`/admin/menus`**：管理餐點（價格、分類、上架／停售等）。
- **`/admin/qr`（入座 QR）**：選桌 → 設定用餐／點餐分鐘數 → **產生入座 QR**；同一桌開新場次會自動作廢尚未撤銷的舊節次。
- **`/admin/orders`**：即時訂單看板（需開 Realtime，見下方）。

### 資料與安全（精簡）

- **`table_sessions`**：每場入座一筆，帶 `qr_token`、`dining_duration_minutes`、`order_window_minutes`、`revoked_at`。
- **`get_table_for_scan`**：匿名可查有效節次對應的桌與餐廳（`SECURITY DEFINER`）；一般身分無法對 `tables` 做公開 SELECT。
- **`tables` / `menus`**：以 RLS 限制為**該餐廳擁有者**可管理；示範與結構見 `sql/schema.sql` 與 `sql/migrate_table_sessions.sql`。

## 在本機跑起來

1. 安裝依賴：`npm install`
2. 複製環境變數：`cp .env.example .env.local`，到 Supabase 填入：
   - **Settings → API**：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`（service_role 給 `npm run setup` 與種子）
   - （選填）`SCAN_HMAC_SECRET`：啟用後掃碼網址需帶 `?sig=`
   - （選填）`NEXT_PUBLIC_APP_URL`：正式／預覽網址根路徑（QR、重新導向用）
3. **資料庫與種子**：在 `.env.local` 加上 **`SUPABASE_DB_PASSWORD`**（Supabase → **Database** 的 postgres 密碼），執行 **`npm run setup`**：依序跑 `migrate_tables_rls_rpc.sql`、`migrate_table_sessions.sql`、`rpc_create_customer_order.sql`，並寫入示範餐廳／桌／**入座節次**／菜單。若未加密碼但已手動在 SQL Editor 跑過上述檔案，亦可只依賴種子步驟（視你的 `setup-db.mjs` 設定而定）。
   - 示範掃碼 token 仍為 `menugo_scan_demo_a1`（見 script 輸出或 `npm run scan:url`）。
   - 店長種子可設 `DEMO_OWNER_EMAIL`；未設則使用 Authentication 第一位使用者。
4. **Database → Replication**：`public.orders` 開啟 **Realtime**（後廚接單即時更新）。
5. **`npm run dev`**。

常用指令：`npm run build`、`npm run start`、`npm run lint`、`npm run scan:url`。

## 目錄結構

```
app/
  admin/              # 登入、註冊、餐桌／菜單／入座 QR／接單
  api/order/          # 顧客送單
  api/scan/           # 組掃碼網址、查歷史訂單
  scan/[token]/       # 顧客掃碼頁
components/admin/     # 後台 UI、即時訂單板
components/scan/      # 點餐與場次倒數 UX
lib/scan/             # HMAC、截止時間顯示格式等
lib/supabase/         # 各環境 Supabase client
scripts/setup-db.mjs  # 建表／migration／種子
sql/                  # schema、RPC、migrate_*.sql
```

## 這個題目可以練習什麼

練習把點餐拆成前後台、用 **RLS** 與 **RPC** 保資料、用 **Realtime** 做出新單即時反映，並加上**每場入座限時 QR** 這類較貼近實務的限制。

## 授權

見 [LICENSE](./LICENSE)。
