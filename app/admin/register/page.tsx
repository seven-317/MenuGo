"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function AdminRegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [tableNumber, setTableNumber] = useState("1");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successVerifyHint, setSuccessVerifyHint] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSuccessVerifyHint(false);

    const name = restaurantName.trim();
    const table = tableNumber.trim() || "1";
    if (!name) {
      setMessage("請輸入餐廳名稱");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    const session = data.session;
    const user = data.user;

    if (session && user) {
      const { data: restaurant, error: rErr } = await supabase
        .from("restaurants")
        .insert({ name, owner_id: user.id })
        .select("id")
        .single();

      if (rErr || !restaurant) {
        setLoading(false);
        setMessage(
          rErr?.message ?? "帳號已建立，但餐廳寫入失敗。請登入後於後台手動建立餐廳。",
        );
        return;
      }

      const { error: tErr } = await supabase.from("tables").insert({
        restaurant_id: restaurant.id,
        table_number: table,
      });

      setLoading(false);

      if (tErr) {
        setMessage(`餐廳已建立，但第一桌新增失敗：${tErr.message}`);
        router.push("/admin");
        router.refresh();
        return;
      }

      router.push("/admin");
      router.refresh();
      return;
    }

    setLoading(false);
    setSuccessVerifyHint(true);
    setMessage(
      "已送出註冊。若專案啟用信箱驗證，請開信完成驗證後再登入；登入後若仍無餐廳，請在後台首頁填寫「建立餐廳」表單。",
    );
  };

  return (
    <div className="relative min-h-full bg-menu-bg text-menu-ink">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="menu-blob absolute -right-24 top-10 h-64 w-64 rounded-full bg-menu-primary/15 blur-3xl motion-reduce:blur-none" />
      </div>

      <main className="relative z-10 mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-menu-primary">
          MenuGo
        </p>
        <h1 className="mt-2 text-center font-menu-display text-2xl font-bold sm:text-3xl">
          註冊店家
        </h1>
        <p className="mt-2 text-center text-sm text-menu-muted">
          建立帳號後會一併開通您的餐廳（若需信箱驗證，驗證後登入再補上餐廳資料即可）。
        </p>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="menu-reveal mt-10 space-y-4 rounded-3xl border border-menu-border bg-menu-card p-6 shadow-lg"
        >
          {message ? (
            <p
              className={`rounded-xl px-3 py-2 text-sm ${
                successVerifyHint
                  ? "border border-sky-200 bg-sky-50 text-sky-900"
                  : "border border-red-200 bg-red-50 text-red-900"
              }`}
            >
              {message}
            </p>
          ) : null}

          <label className="block text-sm font-medium text-menu-ink">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-4 py-3 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            />
          </label>

          <label className="block text-sm font-medium text-menu-ink">
            密碼
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-4 py-3 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            />
          </label>

          <label className="block text-sm font-medium text-menu-ink">
            餐廳名稱
            <input
              type="text"
              autoComplete="organization"
              required
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-4 py-3 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
              placeholder="店名"
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
            {loading ? "註冊中…" : "註冊並建立餐廳"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-menu-muted">
          已有帳號？
          <Link
            href="/admin/login"
            className="ms-1 font-semibold text-menu-primary underline-offset-4 hover:underline"
          >
            店家登入
          </Link>
        </p>
        <p className="mt-3 text-center text-sm text-menu-muted">
          <Link
            href="/"
            className="font-semibold text-menu-primary underline-offset-4 hover:underline"
          >
            ← 回首頁
          </Link>
        </p>
      </main>
    </div>
  );
}

export default function AdminRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-menu-bg text-menu-muted">
          載入中…
        </div>
      }
    >
      <AdminRegisterForm />
    </Suspense>
  );
}
