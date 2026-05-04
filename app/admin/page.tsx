import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminOrdersClient } from "@/components/admin/AdminOrdersClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "店家後台",
};

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-800">無法載入餐廳：{error.message}</p>
        <Link href="/" className="mt-4 inline-block text-menu-primary underline">
          回首頁
        </Link>
      </div>
    );
  }

  if (!restaurants?.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:py-24">
        <h1 className="font-menu-display text-2xl font-bold text-menu-ink">
          尚無餐廳資料
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-menu-muted">
          此帳號在資料庫中沒有對應的
          <code className="mx-1 rounded bg-menu-surface px-1.5 font-mono text-xs">
            restaurants.owner_id
          </code>
          。請執行
          <code className="mx-1 rounded bg-menu-surface px-1.5 font-mono text-xs">
            npm run setup
          </code>
          或手動跑種子，並將
          <code className="mx-1 rounded bg-menu-surface px-1.5 font-mono text-xs">
            v_owner
          </code>
          設為你的使用者 UUID。
        </p>
        <Link
          href="/admin/login"
          className="mt-6 inline-block rounded-2xl border border-menu-border bg-menu-card px-5 py-2.5 text-sm font-semibold text-menu-ink"
        >
          換帳號登入
        </Link>
      </div>
    );
  }

  return (
    <AdminOrdersClient
      restaurants={restaurants}
      userEmail={user.email}
    />
  );
}
