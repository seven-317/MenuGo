import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ScanExperienceClient } from "@/components/scan/ScanExperienceClient";
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

  const { data: tableRows, error: tableError } = await supabase.rpc(
    "get_table_for_scan",
    { p_qr_token: token },
  );

  if (tableError) {
    notFound();
  }

  const tableRow = Array.isArray(tableRows)
    ? tableRows[0]
    : tableRows;

  if (
    tableRow == null ||
    typeof tableRow !== "object" ||
    !("id" in tableRow)
  ) {
    notFound();
  }

  const table = tableRow as {
    id: string;
    restaurant_id: string;
    table_number: string;
  };

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
  const menuForClient = items.map((m) => ({
    id: m.id,
    name: m.name,
    price: Number(m.price),
    category: m.category,
    description: m.description,
    image_url: m.image_url,
  }));

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
          <p className="text-sm text-menu-muted">線上瀏覽菜單</p>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <ScanExperienceClient
          restaurantId={restaurant.id}
          tableId={table.id}
          restaurantName={restaurant.name}
          tableNumber={table.table_number}
          qrToken={token}
          scanSig={sigDecoded ?? ""}
          items={menuForClient}
        />
      </main>
    </div>
  );
}
