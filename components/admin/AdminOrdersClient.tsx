"use client";

import Link from "next/link";
import { useState } from "react";

import { RealtimeOrderBoard } from "@/components/admin/RealtimeOrderBoard";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";

type RestaurantOption = { id: string; name: string };

type AdminOrdersClientProps = {
  restaurants: RestaurantOption[];
  userEmail: string | undefined;
};

export function AdminOrdersClient({
  restaurants,
  userEmail,
}: AdminOrdersClientProps) {
  const [restaurantId, setRestaurantId] = useState(restaurants[0]?.id ?? "");

  if (!restaurantId) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-menu-muted">
            {userEmail ? `已登入：${userEmail}` : "已登入"}
          </p>
          <h1 className="font-menu-display text-2xl font-bold text-menu-ink sm:text-3xl">
            店家訂單
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin"
            className="rounded-xl border border-menu-border bg-menu-card px-4 py-2 text-sm font-medium text-menu-ink transition-colors hover:bg-menu-surface"
          >
            主選單
          </Link>
          <Link
            href="/admin/tables"
            className="rounded-xl border border-menu-border bg-menu-card px-4 py-2 text-sm font-medium text-menu-ink transition-colors hover:bg-menu-surface"
          >
            管理餐桌
          </Link>
          <Link
            href="/admin/menus"
            className="rounded-xl border border-menu-border bg-menu-card px-4 py-2 text-sm font-medium text-menu-ink transition-colors hover:bg-menu-surface"
          >
            管理餐點
          </Link>
          <Link
            href="/admin/qr"
            className="rounded-xl border border-menu-primary/40 bg-menu-primary/10 px-4 py-2 text-sm font-semibold text-menu-primary transition-colors hover:bg-menu-primary/20"
          >
            入座 QR
          </Link>
          {restaurants.length > 1 ? (
            <label className="flex items-center gap-2 text-sm text-menu-muted">
              餐廳
              <select
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                className="rounded-xl border border-menu-border bg-menu-card px-3 py-2 text-sm font-medium text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <AdminSignOutButton />
          <Link
            href="/"
            className="rounded-xl border border-menu-primary/40 bg-menu-primary/10 px-4 py-2 text-sm font-semibold text-menu-primary transition-colors hover:bg-menu-primary/20"
          >
            回首頁
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border border-menu-border bg-menu-card p-5 shadow-sm sm:p-8">
        <RealtimeOrderBoard restaurantId={restaurantId} />
      </div>
    </div>
  );
}
