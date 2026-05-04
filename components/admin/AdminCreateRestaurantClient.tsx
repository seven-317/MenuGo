"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import Link from "next/link";

import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AdminCreateRestaurantClientProps = {
  userEmail: string | null;
};

export function AdminCreateRestaurantClient({
  userEmail,
}: AdminCreateRestaurantClientProps) {
  const [restaurantName, setRestaurantName] = useState("");
  const [tableNumber, setTableNumber] = useState("1");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const name = restaurantName.trim();
    const table = tableNumber.trim() || "1";
    if (!name) {
      setMessage("請輸入餐廳名稱");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setMessage("請重新登入後再試。");
      return;
    }

    const { data: restaurant, error: rErr } = await supabase
      .from("restaurants")
      .insert({ name, owner_id: user.id })
      .select("id")
      .single();

    if (rErr || !restaurant) {
      setLoading(false);
      setMessage(
        rErr?.message ?? "建立餐廳失敗，請稍後再試或檢查是否已建立過餐廳。",
      );
      return;
    }

    const { error: tErr } = await supabase.from("tables").insert({
      restaurant_id: restaurant.id,
      table_number: table,
    });

    setLoading(false);

    if (tErr) {
      setMessage(`餐廳已建立，但新增第一桌失敗：${tErr.message}`);
      return;
    }

    window.location.href = "/admin";
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-24">
      <div className="mb-6 flex flex-wrap justify-end gap-2">
        <AdminSignOutButton />
        <Link
          href="/"
          className="rounded-xl border border-menu-primary/40 bg-menu-primary/10 px-4 py-2 text-sm font-semibold text-menu-primary transition-colors hover:bg-menu-primary/20"
        >
          回首頁
        </Link>
      </div>
      <h1 className="font-menu-display text-2xl font-bold text-menu-ink">
        建立您的餐廳
      </h1>
      {userEmail ? (
        <p className="mt-2 text-sm text-menu-muted">帳號：{userEmail}</p>
      ) : null}
      <p className="mt-3 text-sm leading-relaxed text-menu-muted">
        尚無餐廳資料時，請先建立一間店與第一桌（之後可在後台新增更多桌次與菜單）。
      </p>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="menu-reveal mt-8 space-y-4 rounded-3xl border border-menu-border bg-menu-card p-6 text-left shadow-lg"
      >
        {message ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {message}
          </p>
        ) : null}

        <label className="block text-sm font-medium text-menu-ink">
          餐廳名稱
          <input
            type="text"
            autoComplete="organization"
            required
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-4 py-3 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            placeholder="例如：巷口小吃店"
          />
        </label>

        <label className="block text-sm font-medium text-menu-ink">
          第一桌桌號
          <input
            type="text"
            required
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-4 py-3 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            placeholder="例如：1 或 A1"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-menu-cta py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-menu-cta-hover disabled:opacity-60"
        >
          {loading ? "建立中…" : "建立並進入後台"}
        </button>
      </form>
    </div>
  );
}
