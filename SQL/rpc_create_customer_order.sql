-- MenuGo：以單一 RPC 在交易內建立訂單與 order_items，並由資料庫計算 total_price
-- 請在 sql/schema.sql 套用後於 Supabase SQL Editor 執行本檔（或併入 migration）。

CREATE OR REPLACE FUNCTION public.create_customer_order (
  p_restaurant_id uuid,
  p_table_id uuid,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_total numeric(12, 2) := 0;
  el jsonb;
  v_menu_id uuid;
  v_qty integer;
  v_notes text;
  v_price numeric(12, 2);
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'cart must be a non-empty array';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public."tables" t
    WHERE t.id = p_table_id
      AND t.restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'table does not belong to restaurant';
  END IF;

  FOR el IN
  SELECT value
  FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_menu_id := (el->>'menu_id')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'invalid menu_id in cart';
    END;

    BEGIN
      v_qty := (el->>'quantity')::integer;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'invalid quantity in cart';
    END;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'quantity must be a positive integer';
    END IF;

    SELECT m.price INTO v_price
    FROM public.menus m
    WHERE m.id = v_menu_id
      AND m.restaurant_id = p_restaurant_id;

    IF v_price IS NULL THEN
      RAISE EXCEPTION 'menu not found or not in this restaurant: %', v_menu_id;
    END IF;

    v_total := v_total + v_price * v_qty;
  END LOOP;

  INSERT INTO public.orders (table_id, restaurant_id, total_price, status)
  VALUES (p_table_id, p_restaurant_id, v_total, 'pending')
  RETURNING id INTO v_order_id;

  FOR el IN
  SELECT value
  FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_id := (el->>'menu_id')::uuid;
    v_qty := (el->>'quantity')::integer;
    v_notes := NULLIF(BTRIM(COALESCE(el->>'notes', '')), '');

    INSERT INTO public.order_items (order_id, menu_id, quantity, notes)
    VALUES (v_order_id, v_menu_id, v_qty, v_notes);
  END LOOP;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_order (uuid, uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_customer_order (uuid, uuid, jsonb) TO authenticated;
