import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RestaurantRow = { id: string; name: string };

export async function loadOwnerSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      restaurants: null as RestaurantRow[] | null,
      error: null as Error | null,
    };
  }

  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("name", { ascending: true });

  return {
    user,
    restaurants: restaurants ?? [],
    error: error ? new Error(error.message) : null,
  };
}
