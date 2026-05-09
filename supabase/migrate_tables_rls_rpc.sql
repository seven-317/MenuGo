DROP POLICY IF EXISTS "tables_select_public" ON public."tables";
DROP POLICY IF EXISTS "tables_select_owner" ON public."tables";

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

-- get_table_for_scan 定義請見 sql/migrate_table_sessions.sql（或 sql/schema.sql）。
-- 勿在此以舊版 RETURNS（僅 3 欄）做 CREATE OR REPLACE，否則會報
-- cannot change return type of existing function。

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
