import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminTablesClient } from "@/components/admin/AdminTablesClient";
import { loadOwnerSession } from "@/lib/admin/load-owner-session";
import { buildScanUrl, getAppOrigin } from "@/lib/scan/build-scan-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "管理餐桌",
};

export default async function AdminTablesPage() {
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
  const { data: tableRows, error: tablesError } = await supabase
    .from("tables")
    .select("id, restaurant_id, table_number, qr_token")
    .in("restaurant_id", ids)
    .order("restaurant_id", { ascending: true })
    .order("table_number", { ascending: true });

  if (tablesError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-red-800">
        無法載入桌次：{tablesError.message}
        <Link href="/admin" className="mt-4 block text-menu-primary underline">
          返回主選單
        </Link>
      </div>
    );
  }

  const origin = getAppOrigin();
  const tables = (tableRows ?? []).map((row) => ({
    ...row,
    scan_url: buildScanUrl(origin, row.qr_token),
  }));

  return (
    <AdminTablesClient
      restaurants={restaurants}
      tables={tables}
      userEmail={user.email}
    />
  );
}
