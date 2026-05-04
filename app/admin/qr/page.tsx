import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminQrGeneratorClient } from "@/components/admin/AdminQrGeneratorClient";
import { loadOwnerSession } from "@/lib/admin/load-owner-session";
import { buildScanUrl, getAppOrigin } from "@/lib/scan/build-scan-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "點餐 QR",
};

export default async function AdminQrPage() {
  const { user, restaurants, error } = await loadOwnerSession();

  if (!user) {
    redirect("/admin/login");
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-800">無法載入餐廳：{error.message}</p>
        <Link href="/admin" className="mt-4 inline-block text-menu-primary underline">
          返回主選單
        </Link>
      </div>
    );
  }

  if (!restaurants?.length) {
    redirect("/admin");
  }

  const restaurantIds = restaurants.map((r) => r.id);
  const nameById = Object.fromEntries(
    restaurants.map((r) => [r.id, r.name]),
  );

  const supabase = await createSupabaseServerClient();
  const { data: tableRows, error: tablesError } = await supabase
    .from("tables")
    .select("id, restaurant_id, table_number, qr_token")
    .in("restaurant_id", restaurantIds)
    .order("table_number", { ascending: true });

  if (tablesError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-800">無法載入桌次：{tablesError.message}</p>
        <Link href="/admin" className="mt-4 inline-block text-menu-primary underline">
          返回主選單
        </Link>
      </div>
    );
  }

  const origin = getAppOrigin();
  const tables = (tableRows ?? []).map((row) => ({
    id: row.id,
    restaurant_id: row.restaurant_id,
    restaurant_name: nameById[row.restaurant_id] ?? "—",
    table_number: row.table_number,
    qr_token: row.qr_token,
    scanUrl: buildScanUrl(origin, row.qr_token),
  }));

  return (
    <AdminQrGeneratorClient tables={tables} userEmail={user.email} />
  );
}
