import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getScanHmacSecret,
  verifyScanTokenSignature,
} from "@/lib/scan/hmac";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ScanPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ sig?: string | string[] }>;
};

const TOKEN_RE = /^[a-zA-Z0-9_-]{16,128}$/;

const moneyTwd = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  minimumFractionDigits: 0,
});

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (value == null) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: ScanPageProps): Promise<Metadata> {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken).trim();
  return {
    title: token ? `桌邊點餐` : "掃碼點餐",
    description: "MenuGo QR Code 線上點餐",
  };
}

export default async function ScanPage({ params, searchParams }: ScanPageProps) {
  const { token: rawToken } = await params;
  const sp = await searchParams;
  const sigParam = firstString(sp.sig);

  const token = decodeURIComponent(rawToken).trim();
  if (!TOKEN_RE.test(token)) {
    notFound();
  }

  const hmacSecret = getScanHmacSecret();
  const sigDecoded =
    sigParam != null && sigParam !== ""
      ? decodeURIComponent(sigParam)
      : undefined;

  if (!verifyScanTokenSignature(token, sigDecoded, hmacSecret)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();

  const { data: table, error: tableError } = await supabase
    .from("tables")
    .select("id, restaurant_id, table_number")
    .eq("qr_token", token)
    .maybeSingle();

  if (tableError || table == null) {
    notFound();
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("id", table.restaurant_id)
    .maybeSingle();

  if (restaurantError || restaurant == null) {
    notFound();
  }

  const { data: menuRows, error: menusError } = await supabase
    .from("menus")
    .select("id, name, price, category, status, description, image_url")
    .eq("restaurant_id", table.restaurant_id)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (menusError || menuRows == null) {
    notFound();
  }

  const items = menuRows.filter((m) => m.status === "available");

  return (
    <div className="relative min-h-full bg-menu-bg text-menu-ink">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="menu-blob absolute -right-24 top-0 h-64 w-64 rounded-full bg-menu-primary/18 blur-3xl motion-reduce:blur-none" />
        <div className="menu-blob-alt absolute -left-20 bottom-24 h-72 w-72 rounded-full bg-menu-cta/14 blur-3xl motion-reduce:blur-none" />
      </div>

      <header
        className="menu-reveal relative z-10 border-b border-menu-border bg-menu-card/95 shadow-sm backdrop-blur-md"
        style={{ animationDelay: "0.04s" }}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-1 px-4 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-menu-primary">
                MenuGo
              </p>
              <h1 className="font-menu-display text-2xl font-bold text-menu-ink sm:text-3xl">
                {restaurant.name}
              </h1>
            </div>
            <span className="shrink-0 rounded-2xl bg-menu-cta px-3 py-1.5 text-center text-sm font-bold text-white shadow-md transition-all duration-300 motion-safe:hover:scale-[1.02] motion-safe:hover:shadow-lg">
              桌 {table.table_number}
            </span>
          </div>
          <p className="text-sm text-menu-muted">線上瀏覽菜單 · 請向店員確認點餐方式</p>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        {items.length === 0 ? (
          <p
            className="menu-reveal rounded-3xl border-2 border-dashed border-menu-border bg-menu-card px-6 py-14 text-center text-sm leading-relaxed text-menu-muted"
            style={{ animationDelay: "0.12s" }}
          >
            目前沒有可點餐的品項。
          </p>
        ) : (
          <ul className="space-y-4">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="menu-reveal flex gap-4 rounded-3xl border border-menu-border bg-menu-card p-4 shadow-sm transition-all duration-300 motion-safe:hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  animationDelay: `${0.1 + Math.min(index, 10) * 0.055}s`,
                }}
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-menu-bg ring-1 ring-menu-border">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 圖片來自任意 CDN
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full items-center justify-center text-center text-xs font-medium text-menu-muted"
                      aria-hidden
                    >
                      無圖
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                    <h2 className="font-menu-display text-lg font-bold text-menu-ink">
                      {item.name}
                    </h2>
                    <p className="shrink-0 text-base font-bold text-menu-cta">
                      {moneyTwd.format(Number(item.price))}
                    </p>
                  </div>
                  {item.category ? (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-menu-primary">
                      {item.category}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-menu-muted">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p
          className="menu-reveal mt-10 text-center"
          style={{ animationDelay: "0.35s" }}
        >
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center justify-center rounded-2xl border-2 border-menu-primary bg-transparent px-5 py-3 text-sm font-semibold text-menu-primary outline-none transition-all duration-300 hover:bg-menu-surface motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md focus-visible:ring-2 focus-visible:ring-menu-cta focus-visible:ring-offset-2 focus-visible:ring-offset-menu-bg motion-safe:active:scale-[0.98]"
          >
            回首頁
          </Link>
        </p>
      </main>
    </div>
  );
}
