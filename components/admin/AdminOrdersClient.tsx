"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RealtimeOrderBoard } from "@/components/admin/RealtimeOrderBoard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RestaurantOption = { id: string; name: string };

type AdminOrdersClientProps = {
  restaurants: RestaurantOption[];
  userEmail: string | undefined;
};

export function AdminOrdersClient({
  restaurants,
  userEmail,
}: AdminOrdersClientProps) {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState(restaurants[0]?.id ?? "");
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

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
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            className="rounded-xl border border-menu-border bg-menu-card px-4 py-2 text-sm font-medium text-menu-ink transition-colors hover:bg-menu-surface disabled:opacity-50"
          >
            {signingOut ? "登出中…" : "登出"}
          </button>
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
