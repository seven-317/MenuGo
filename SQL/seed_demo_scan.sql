-- 重建「示範餐廳」掃碼 demo（token：menugo_scan_demo_a1）。
-- 掃碼頁讀的是 public.table_sessions.qr_token，必須有入座節次這一筆。
-- 此 token 在 get_table_for_scan / create_customer_order 中為「展示用」：不套用用餐／點餐截止（仍會檢查 revoked）。
--
-- 使用前：將下方 v_owner 改成 Supabase → Authentication → Users 裡你的使用者 UUID。
-- 或在專案目錄執行 npm run setup（會用 service_role 重種、並印出掃碼網址）。

DO $$
DECLARE
  v_owner uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_rid uuid;
  v_table_id uuid;
  demo_name text := '';
BEGIN
  IF v_owner = '00000000-0000-0000-0000-000000000000'::uuid THEN
    RAISE EXCEPTION '請先將 v_owner 改為你在 auth.users 的真實 User UUID';
  END IF;

  FOR v_rid IN
    SELECT id FROM public.restaurants WHERE name = demo_name
  LOOP
    DELETE FROM public.order_items
    WHERE order_id IN (
      SELECT id FROM public.orders WHERE restaurant_id = v_rid
    );
    DELETE FROM public.orders WHERE restaurant_id = v_rid;
    DELETE FROM public.table_sessions WHERE restaurant_id = v_rid;
    DELETE FROM public."tables" WHERE restaurant_id = v_rid;
    DELETE FROM public.menus WHERE restaurant_id = v_rid;
    DELETE FROM public.restaurants WHERE id = v_rid;
  END LOOP;

  INSERT INTO public.restaurants (name, owner_id)
  VALUES (demo_name, v_owner)
  RETURNING id INTO v_rid;

  INSERT INTO public."tables" (restaurant_id, table_number)
  VALUES (v_rid, 'A1')
  RETURNING id INTO v_table_id;

  INSERT INTO public.table_sessions (
    table_id,
    restaurant_id,
    qr_token,
    dining_duration_minutes,
    order_window_minutes
  )
  VALUES (
    v_table_id,
    v_rid,
    'menugo_scan_demo_a1',
    120,
    90
  );

  INSERT INTO public.menus (restaurant_id, name, price, category, status, description)
  VALUES
    (v_rid, '滷肉飯', 65, '主食', 'available', '示範用：肥肉與醬汁'),
    (v_rid, '排骨飯', 95, '主食', 'available', '示範用：酥炸排骨'),
    (v_rid, '荷包蛋', 15, '小菜', 'available', '單點加蛋'),
    (v_rid, '味噌湯', 35, '湯品', 'available', '每日現煮'),
    (v_rid, '停售品項（測試）', 999, '其他', 'sold_out', '不應出現在顧客掃碼頁');
END $$;

SELECT
  s.qr_token,
  t.table_number,
  r.name AS restaurant
FROM public.table_sessions s
INNER JOIN public."tables" t ON t.id = s.table_id
INNER JOIN public.restaurants r ON r.id = s.restaurant_id
WHERE s.qr_token = 'menugo_scan_demo_a1';
