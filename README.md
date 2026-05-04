# MenuGo

學校課程用的 **QR Code 線上點餐** 練習專題：顧客掃碼看菜單、下單；店家端可即時看到新訂單。此儲存庫為公開，主要方便繳交與同儕參考，並非商業產品。

## 用了什麼

- **Next.js**（App Router）+ **React**
- **Tailwind CSS**
- **Supabase**：PostgreSQL、Auth、**Realtime**
- 資料表與 RLS 寫在 `sql/`

## 做了什麼（功能概述）

- 掃碼進菜單、匿名送單（訂單寫入用 RPC，避免只寫到單頭沒寫明細）
- 後台用 Realtime 監聽 `orders` 新增，列表會自己刷新，可一鍵把狀態改成已接單
- 菜單、桌次存在 Supabase；每桌有 `qr_token`，可選用 `SCAN_HMAC_SECRET` 幫掃碼網址加簽章（見 `lib/scan/hmac.ts`）
- `/api/qrcode` 把一串網址轉成 QR 圖（PNG）

## 在本機跑起來

1. 安裝依賴：`npm install`
2. 複製環境變數：`cp .env.example .env.local`，到 Supabase 填入：
   - **Settings → API**：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`（service_role，給 `npm run setup` 用）
   - （選填）`SCAN_HMAC_SECRET`
3. **一次搞定資料庫**：在 `.env.local` 加上 **`SUPABASE_DB_PASSWORD`**（Supabase → **Database** → 登入資料庫用的**密碼**，建立專案時設的那個；不是 anon / service_role 金鑰）。然後執行 **`npm run setup`**：會自動建表、RPC、示範餐廳／桌／菜單；**不必**自己開 SQL Editor。若你**不**加密碼、但後台已手動跑過 `schema` / `rpc`，也可以只跑種子。  
   - 店長：可設 `DEMO_OWNER_EMAIL`；**不設則自動用 Authentication 裡第一個帳號**。
4. **Database → Replication**：`public.orders` 開 **Realtime**（接單畫面用）。
5. **`npm run dev`**。

其他：`npm run build` / `npm run start` / `npm run lint`

## 目錄大概長這樣

```
app/api/order/           # 送單
app/api/orders/.../accept/  # 接單改狀態
app/api/qrcode/          # 產 QR 圖
app/scan/[token]/       # 顧客掃碼頁
components/admin/        # 即時訂單列表（範例元件）
lib/supabase/           # 前後端 Supabase client
sql/                    # Schema、RPC
```

## 為什麼做這題

作業想練習：把「點餐」拆成前後台、用資料庫權限保資料、再用 Realtime 做出『新單進來立刻知道』的體驗；順便熟悉 Next.js App Router 與 Supabase 怎麼接。

## 授權

見 [LICENSE](./LICENSE)。
