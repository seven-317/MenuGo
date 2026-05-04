import { createSupabaseServerClient } from "@/lib/supabase/server";

/** 與 {@link createSupabaseServerClient} 相同，保留此別名以相容既有 Route Handler 匯入。 */
export const createSupabaseRouteHandlerClient = createSupabaseServerClient;
