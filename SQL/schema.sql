CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12, 2) NOT NULL CHECK (price >= 0),
  category text,
  status text NOT NULL DEFAULT 'available',
  description text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public."tables" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  table_number text NOT NULL,
  qr_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tables_qr_token_unique UNIQUE (qr_token),
  CONSTRAINT tables_restaurant_table_unique UNIQUE (restaurant_id, table_number)
);

CREATE TABLE public.table_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public."tables" (id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  qr_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  started_at timestamptz NOT NULL DEFAULT now(),
  dining_duration_minutes integer NOT NULL DEFAULT 120
    CHECK (dining_duration_minutes >= 1 AND dining_duration_minutes <= 1440),
  order_window_minutes integer NOT NULL DEFAULT 90
    CHECK (order_window_minutes >= 1 AND order_window_minutes <= 1440),
  revoked_at timestamptz,
  CONSTRAINT table_sessions_qr_token_unique UNIQUE (qr_token),
  CONSTRAINT table_sessions_order_within_dining CHECK (
    order_window_minutes <= dining_duration_minutes
  )
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public."tables" (id) ON DELETE RESTRICT,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants (id) ON DELETE RESTRICT,
  table_session_id uuid REFERENCES public.table_sessions (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  total_price numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  menu_id uuid NOT NULL REFERENCES public.menus (id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_menus_restaurant_id ON public.menus (restaurant_id);
CREATE INDEX idx_tables_restaurant_id ON public."tables" (restaurant_id);
CREATE INDEX idx_table_sessions_table_id ON public.table_sessions (table_id);
CREATE INDEX idx_table_sessions_restaurant_id ON public.table_sessions (restaurant_id);
CREATE INDEX idx_table_sessions_qr_token ON public.table_sessions (qr_token);
CREATE INDEX idx_orders_restaurant_id ON public.orders (restaurant_id);
CREATE INDEX idx_orders_table_id ON public.orders (table_id);
CREATE INDEX idx_orders_table_session_id ON public.orders (table_session_id);
CREATE INDEX idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX idx_order_items_menu_id ON public.order_items (menu_id);

CREATE OR REPLACE FUNCTION public.enforce_order_restaurant_matches_table ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public."tables" t
    WHERE t.id = NEW.table_id
      AND t.restaurant_id = NEW.restaurant_id
  ) THEN
    RAISE EXCEPTION 'orders.restaurant_id 必須與 table_id 所對應之餐桌餐廳一致';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_restaurant_matches_table
  BEFORE INSERT OR UPDATE OF table_id, restaurant_id ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_restaurant_matches_table();

CREATE OR REPLACE FUNCTION public.enforce_order_item_menu_belongs_to_order_restaurant ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.orders o
    INNER JOIN public.menus m ON m.id = NEW.menu_id
    WHERE o.id = NEW.order_id
      AND m.restaurant_id = o.restaurant_id
  ) THEN
    RAISE EXCEPTION 'order_items.menu_id 必須屬於該訂單餐廳之菜單';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_items_menu_restaurant
  BEFORE INSERT OR UPDATE OF order_id, menu_id ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_item_menu_belongs_to_order_restaurant();

CREATE OR REPLACE FUNCTION public.revoke_prior_table_sessions ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.table_sessions
  SET revoked_at = now()
  WHERE table_id = NEW.table_id
    AND id IS DISTINCT FROM NEW.id
    AND revoked_at IS NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_revoke_prior_table_sessions
  BEFORE INSERT ON public.table_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.revoke_prior_table_sessions();

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurants_select_public"
  ON public.restaurants
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "restaurants_insert_owner"
  ON public.restaurants
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "restaurants_update_owner"
  ON public.restaurants
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "restaurants_delete_owner"
  ON public.restaurants
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "menus_select_public"
  ON public.menus
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "menus_insert_owner"
  ON public.menus
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "menus_update_owner"
  ON public.menus
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "menus_delete_owner"
  ON public.menus
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "tables_select_owner"
  ON public."tables"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "tables_insert_owner"
  ON public."tables"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "tables_update_owner"
  ON public."tables"
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "tables_delete_owner"
  ON public."tables"
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "table_sessions_select_owner"
  ON public.table_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "table_sessions_insert_owner"
  ON public.table_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public."tables" t
      WHERE t.id = table_id
        AND t.restaurant_id = restaurant_id
    )
  );

CREATE POLICY "table_sessions_update_owner"
  ON public.table_sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "orders_insert_public"
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "orders_select_owner"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "orders_update_owner"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "order_items_insert_public"
  ON public.order_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "order_items_select_owner"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      INNER JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.id = order_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "order_items_update_owner"
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      INNER JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.id = order_id
        AND r.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders o
      INNER JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.id = order_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "order_items_delete_owner"
  ON public.order_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      INNER JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.id = order_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.get_table_for_scan (p_qr_token text)
RETURNS TABLE (
  id uuid,
  restaurant_id uuid,
  table_number text,
  session_id uuid,
  order_until timestamptz,
  session_until timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.restaurant_id,
    t.table_number,
    s.id,
    s.started_at + (s.order_window_minutes || ' minutes')::interval,
    s.started_at + (s.dining_duration_minutes || ' minutes')::interval
  FROM public.table_sessions s
  INNER JOIN public."tables" t ON t.id = s.table_id
    AND t.restaurant_id = s.restaurant_id
  WHERE s.qr_token = p_qr_token
    AND s.revoked_at IS NULL
    AND now() < s.started_at + (s.dining_duration_minutes || ' minutes')::interval
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_table_for_scan (text) TO anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.restaurants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;

GRANT SELECT ON public.menus TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menus TO authenticated;

GRANT SELECT ON public."tables" TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public."tables" TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.table_sessions TO authenticated;

GRANT INSERT ON public.orders TO anon, authenticated;
GRANT SELECT, UPDATE ON public.orders TO authenticated;

GRANT INSERT ON public.order_items TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.order_items TO authenticated;
