DELETE FROM public.restaurants
WHERE name = '示範餐廳 MenuGo Demo';

DO $$
DECLARE
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

SELECT
  t.table_number,
  t.qr_token,
  r.name AS restaurant
FROM public."tables" t
INNER JOIN public.restaurants r ON r.id = t.restaurant_id
WHERE t.qr_token = 'menugo_scan_demo_a1';
