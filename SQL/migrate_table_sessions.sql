CREATE TABLE IF NOT EXISTS public.table_sessions (
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

CREATE INDEX IF NOT EXISTS idx_table_sessions_table_id ON public.table_sessions (table_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_restaurant_id ON public.table_sessions (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_qr_token ON public.table_sessions (qr_token);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_session_id uuid REFERENCES public.table_sessions (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_table_session_id ON public.orders (table_session_id);

ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "table_sessions_select_owner" ON public.table_sessions;
DROP POLICY IF EXISTS "table_sessions_insert_owner" ON public.table_sessions;
DROP POLICY IF EXISTS "table_sessions_update_owner" ON public.table_sessions;

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

DROP TRIGGER IF EXISTS trg_revoke_prior_table_sessions ON public.table_sessions;

CREATE TRIGGER trg_revoke_prior_table_sessions
  BEFORE INSERT ON public.table_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.revoke_prior_table_sessions();

DROP FUNCTION IF EXISTS public.get_table_for_scan (text);

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

GRANT SELECT, INSERT, UPDATE ON public.table_sessions TO authenticated;
