import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminCreateRestaurantClient } from "@/components/admin/AdminCreateRestaurantClient";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { loadOwnerSession } from "@/lib/admin/load-owner-session";

export const metadata = {
  title: "店家後台",
};

export default async function AdminHubPage() {
  const { user, restaurants, error } = await loadOwnerSession();

  if (!user) {
    redirect("/admin/login");
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          <AdminSignOutButton />
          <Link
            href="/"
            className="rounded-xl border border-menu-border bg-menu-card px-4 py-2 text-sm font-medium text-menu-ink transition-colors hover:bg-menu-surface"
          >
            回首頁
          </Link>
        </div>
        <p className="text-red-800">無法載入餐廳：{error.message}</p>
      </div>
    );
  }

  if (!restaurants?.length) {
    return (
      <AdminCreateRestaurantClient userEmail={user.email ?? null} />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap justify-end gap-2">
        <AdminSignOutButton />
        <Link
          href="/"
          className="rounded-xl border border-menu-primary/40 bg-menu-primary/10 px-4 py-2 text-sm font-semibold text-menu-primary transition-colors hover:bg-menu-primary/20"
        >
          回首頁
        </Link>
      </div>
      <p className="text-center text-sm font-medium text-menu-muted">
        {user.email ? `已登入：${user.email}` : "已登入"}
      </p>
      <h1 className="mt-2 text-center font-menu-display text-2xl font-bold text-menu-ink sm:text-3xl">
        店家後台
      </h1>
      <p className="mt-2 text-center text-sm text-menu-muted">
        請選擇要進行的操作
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/tables"
          className="group rounded-3xl border-2 border-menu-border bg-menu-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-500/60 hover:shadow-md"
        >
          <span className="inline-block rounded-lg bg-amber-500/15 px-2 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
            桌位
          </span>
          <h2 className="mt-3 font-menu-display text-lg font-bold text-menu-ink group-hover:text-amber-800">
            管理餐桌
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-menu-muted">
            新增或編輯桌號；限時掃碼請用下方「入座 QR」。
          </p>
        </Link>
        <Link
          href="/admin/menus"
          className="group rounded-3xl border-2 border-menu-border bg-menu-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-500/50 hover:shadow-md"
        >
          <span className="inline-block rounded-lg bg-violet-500/15 px-2 py-1 text-xs font-bold uppercase tracking-wide text-violet-800">
            菜單
          </span>
          <h2 className="mt-3 font-menu-display text-lg font-bold text-menu-ink group-hover:text-violet-800">
            管理餐點
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-menu-muted">
            價格、分類、上下架與圖片連結。
          </p>
        </Link>
        <Link
          href="/admin/qr"
          className="group rounded-3xl border-2 border-menu-border bg-menu-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-menu-primary hover:shadow-md"
        >
          <span className="inline-block rounded-lg bg-menu-primary/15 px-2 py-1 text-xs font-bold uppercase tracking-wide text-menu-primary">
            QR
          </span>
          <h2 className="mt-3 font-menu-display text-lg font-bold text-menu-ink group-hover:text-menu-primary">
            入座 QR（限時）
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-menu-muted">
            產生限時入座 QR，並可關閉或重新產生進行中的節次。
          </p>
        </Link>
        <Link
          href="/admin/orders"
          className="group rounded-3xl border-2 border-menu-border bg-menu-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-menu-cta hover:shadow-md"
        >
          <span className="inline-block rounded-lg bg-menu-cta/15 px-2 py-1 text-xs font-bold uppercase tracking-wide text-menu-cta">
            Live
          </span>
          <h2 className="mt-3 font-menu-display text-lg font-bold text-menu-ink group-hover:text-menu-cta">
            後廚接單
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-menu-muted">
            即時訂單看板：新單、製作中、已完成（與先前接單頁相同）。
          </p>
        </Link>
      </div>
    </div>
  );
}
