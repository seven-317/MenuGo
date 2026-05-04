import type { Metadata } from "next";
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

/** 與目前 `qr_token`（hex）及未來可能格式相容；過寬／過窄可自行調整 */
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
    title: token ? `桌邊點餐 · MenuGo` : "掃碼點餐 · MenuGo",
    description: "MenuGo QR Code 線上點餐",
  };
}

/**
 * 顧客掃描：`https://menugo.com/scan/<qr_token>?sig=<HMAC>`（sig 在設定 SCAN_HMAC_SECRET 時必填）
 */
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
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-2xl flex-col gap-1 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            MenuGo
          </p>
          <h1 className="text-xl font-semibold">{restaurant.name}</h1>
          <p className="text-sm text-zinc-600">
            桌號 <span className="font-semibold">{table.table_number}</span>
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500">
            目前沒有可點餐的品項。
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 菜單圖可能為任意 CDN，避免逐網域設定 remotePatterns
                    <img
                      src={item.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                      無圖
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-medium text-zinc-900">{item.name}</h2>
                    <p className="shrink-0 text-sm font-semibold text-zinc-900">
                      {moneyTwd.format(Number(item.price))}
                    </p>
                  </div>
                  {item.category ? (
                    <p className="mt-0.5 text-xs text-zinc-500">{item.category}</p>
                  ) : null}
                  {item.description ? (
                    <p className="mt-1 text-sm leading-snug text-zinc-600">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
