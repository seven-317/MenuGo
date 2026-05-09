DROP FUNCTION IF EXISTS public.create_customer_order(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.create_customer_order (
  p_table_session_id uuid,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_table_id uuid;
  v_restaurant_id uuid;
  v_qr_token text;
  v_order_until timestamptz;
  v_session_until timestamptz;
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

  SELECT
    s.table_id,
    s.restaurant_id,
    s.qr_token,
    s.started_at + (s.order_window_minutes || ' minutes')::interval,
    s.started_at + (s.dining_duration_minutes || ' minutes')::interval
  INTO v_table_id, v_restaurant_id, v_qr_token, v_order_until, v_session_until
  FROM public.table_sessions s
  WHERE s.id = p_table_session_id
    AND s.revoked_at IS NULL;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'table session not found or revoked';
  END IF;

  -- 示範 token 與 get_table_for_scan 一致：不限時送單
  IF v_qr_token IS DISTINCT FROM 'menugo_scan_demo_a1' THEN
    IF now() >= v_session_until THEN
      RAISE EXCEPTION 'session expired';
    END IF;

    IF now() >= v_order_until THEN
      RAISE EXCEPTION 'ordering window closed';
    END IF;
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
      AND m.restaurant_id = v_restaurant_id;

    IF v_price IS NULL THEN
      RAISE EXCEPTION 'menu not found or not in this restaurant: %', v_menu_id;
    END IF;

    v_total := v_total + v_price * v_qty;
  END LOOP;

  INSERT INTO public.orders (
    table_id,
    restaurant_id,
    table_session_id,
    total_price,
    status
  )
  VALUES (
    v_table_id,
    v_restaurant_id,
    p_table_session_id,
    v_total,
    'pending'
  )
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

GRANT EXECUTE ON FUNCTION public.create_customer_order (uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_customer_order (uuid, jsonb) TO authenticated;
