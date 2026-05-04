-- MenuGo — 示範掃碼用種子資料
-- 在 Supabase SQL Editor 執行（需已完成 schema.sql + rpc）。
--
-- ① 先查自己的登入帳號 UUID（Authentication 後台也可複製）：
--    SELECT id, email FROM auth.users;
-- ② 將下方 v_owner 改成你的 uuid（保留引號）。
-- ③ 若專案有設定 SCAN_HMAC_SECRET，掃碼網址還須加 ?sig=（用 lib/scan/hmac.ts 的 signScanToken 計算）；
--    未設定 secret 時，本機網址範例：http://localhost:3000/scan/menugo_scan_demo_a1

-- 可選：刪除同名示範餐廳（會 CASCADE 刪除其 menus、tables）
DELETE FROM public.restaurants
WHERE name = '示範餐廳 MenuGo Demo';

DO $$
DECLARE
  -- ▼▼▼ 改成你的 auth.users.id ▼▼▼
  v_owner uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_restaurant_id uuid;
BEGIN
  IF v_owner = '00000000-0000-0000-0000-000000000000'::uuid THEN
    RAISE EXCEPTION '請先將 v_owner 改為你在 auth.users 的真實 User UUID';
  END IF;

  INSERT INTO public.restaurants (name, owner_id)
  VALUES ('示範餐廳 MenuGo Demo', v_owner)
  RETURNING id INTO v_restaurant_id;

  INSERT INTO public."tables" (restaurant_id, table_number, qr_token)
  VALUES (v_restaurant_id, 'A1', 'menugo_scan_demo_a1');

  INSERT INTO public.menus (restaurant_id, name, price, category, status, description)
  VALUES
    (v_restaurant_id, '滷肉飯', 65, '主食', 'available', '示範用：肥肉與醬汁'),
    (v_restaurant_id, '排骨飯', 95, '主食', 'available', '示範用：酥炸排骨'),
    (v_restaurant_id, '荷包蛋', 15, '小菜', 'available', '單點加蛋'),
    (v_restaurant_id, '味噌湯', 35, '湯品', 'available', '每日現煮'),
    (v_restaurant_id, '停售品項（測試）', 999, '其他', 'sold_out', '不應出現在顧客掃碼頁');
END $$;

-- 確認桌次與 token（掃碼路徑用最後一欄）
SELECT
  t.table_number,
  t.qr_token,
  r.name AS restaurant
FROM public."tables" t
INNER JOIN public.restaurants r ON r.id = t.restaurant_id
WHERE t.qr_token = 'menugo_scan_demo_a1';
