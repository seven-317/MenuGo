import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminMenusClient, type AdminMenuRow } from "@/components/admin/AdminMenusClient";
import { loadOwnerSession } from "@/lib/admin/load-owner-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "管理餐點",
};

export default async function AdminMenusPage() {
  const { user, restaurants, error } = await loadOwnerSession();

  if (!user) {
    redirect("/admin/login");
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-red-800">
        無法載入餐廳：{error.message}
        <Link href="/admin" className="mt-4 block text-menu-primary underline">
          返回主選單
        </Link>
      </div>
    );
  }

  if (!restaurants?.length) {
    redirect("/admin");
  }

  const ids = restaurants.map((r) => r.id);
  const supabase = await createSupabaseServerClient();
  const { data: menuRows, error: menusError } = await supabase
    .from("menus")
    .select(
      "id, restaurant_id, name, price, category, status, description, image_url",
    )
    .in("restaurant_id", ids)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (menusError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-red-800">
        無法載入菜單：{menusError.message}
        <Link href="/admin" className="mt-4 block text-menu-primary underline">
          返回主選單
        </Link>
      </div>
    );
  }

  const menus: AdminMenuRow[] = (menuRows ?? []).map((m) => ({
    ...m,
    price: Number(m.price),
  }));

  return (
    <AdminMenusClient
      restaurants={restaurants}
      menus={menus}
      userEmail={user.email}
    />
  );
}
