"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(
    errParam ? decodeURIComponent(errParam) : null,
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/admin");
    router.refresh();
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
          店家後台登入
        </h1>
        <p className="mt-2 text-center text-sm text-menu-muted">
          使用 Supabase Auth 建立的餐廳擁有者帳號（須與種子資料
          <code className="mx-1 rounded bg-menu-surface px-1.5 font-mono text-xs">
            owner_id
          </code>
          一致）。
        </p>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="menu-reveal mt-10 space-y-4 rounded-3xl border border-menu-border bg-menu-card p-6 shadow-lg"
        >
          {message ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-4 py-3 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-menu-cta py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-menu-cta-hover disabled:opacity-60"
          >
            {loading ? "登入中…" : "登入"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-menu-muted">
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

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-menu-bg text-menu-muted">
          載入中…
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
