"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type QrTableOption = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  table_number: string;
};

type AdminQrGeneratorClientProps = {
  tables: QrTableOption[];
  userEmail: string | undefined;
};

const QR_SIZE = 280;

const DEFAULT_DINING_MIN = 120;
const DEFAULT_ORDER_MIN = 90;

type ActiveSession = {
  scanUrl: string;
  qrToken: string;
  orderUntilIso: string;
  sessionUntilIso: string;
};

function sessionEndIso(startedAtIso: string, minutes: number): string {
  const d = new Date(startedAtIso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export function AdminQrGeneratorClient({
  tables,
  userEmail,
}: AdminQrGeneratorClientProps) {
  const [restaurantId, setRestaurantId] = useState(
    tables[0]?.restaurant_id ?? "",
  );
  const [selectedTableId, setSelectedTableId] = useState(
    tables[0]?.id ?? "",
  );
  const [diningMinutes, setDiningMinutes] = useState(DEFAULT_DINING_MIN);
  const [orderMinutes, setOrderMinutes] = useState(DEFAULT_ORDER_MIN);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [copied, setCopied] = useState(false);

  const restaurantIds = useMemo(
    () => [...new Set(tables.map((t) => t.restaurant_id))],
    [tables],
  );

  const restaurantNames = useMemo(
    () =>
      Object.fromEntries(
        tables.map((t) => [t.restaurant_id, t.restaurant_name]),
      ),
    [tables],
  );

  const filteredTables = useMemo(
    () => tables.filter((t) => t.restaurant_id === restaurantId),
    [tables, restaurantId],
  );

  const selected = useMemo(
    () => tables.find((t) => t.id === selectedTableId) ?? null,
    [tables, selectedTableId],
  );

  const qrImageSrc = active
    ? `/api/qrcode?url=${encodeURIComponent(active.scanUrl)}&size=${QR_SIZE}`
    : "";

  const generateSession = async () => {
    if (!selected) {
      return;
    }
    if (orderMinutes > diningMinutes) {
      setMessage("點餐時間不可長於總用餐時間");
      return;
    }
    setMessage(null);
    setBusy(true);
    setActive(null);
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("table_sessions")
      .insert({
        table_id: selectedTableId,
        restaurant_id: selected.restaurant_id,
        dining_duration_minutes: diningMinutes,
        order_window_minutes: orderMinutes,
      })
      .select(
        "id, qr_token, started_at, dining_duration_minutes, order_window_minutes",
      )
      .single();

    setBusy(false);

    if (error || !data) {
      setMessage(error?.message ?? "建立入座節次失敗");
      return;
    }

    const buildRes = await fetch("/api/scan/build-scan-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr_token: data.qr_token }),
    });
    const buildBody = (await buildRes.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (!buildRes.ok || !buildBody.url) {
      setMessage(buildBody.error ?? "無法組掃碼網址");
      return;
    }

    const startedAt =
      typeof data.started_at === "string"
        ? data.started_at
        : new Date().toISOString();

    setActive({
      scanUrl: buildBody.url,
      qrToken: data.qr_token,
      orderUntilIso: sessionEndIso(
        startedAt,
        Number(data.order_window_minutes),
      ),
      sessionUntilIso: sessionEndIso(
        startedAt,
        Number(data.dining_duration_minutes),
      ),
    });
  };

  const handleCopyUrl = async () => {
    if (!active?.scanUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(active.scanUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("請手動複製", active.scanUrl);
    }
  };

  if (tables.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <AdminSignOutButton />
          <Link
            href="/admin"
            className="rounded-xl border border-menu-border bg-menu-card px-4 py-2 text-sm font-medium text-menu-ink transition-colors hover:bg-menu-surface"
          >
            返回主選單
          </Link>
        </div>
        <p className="text-menu-muted">
          尚無任何桌次，請先到「管理餐桌」新增桌位。
        </p>
        <Link
          href="/admin/tables"
          className="mt-4 inline-block rounded-xl border border-menu-primary/40 bg-menu-primary/10 px-4 py-2 text-sm font-semibold text-menu-primary transition-colors hover:bg-menu-primary/20"
        >
          前往管理餐桌
        </Link>
        {userEmail ? (
          <p className="mt-2 text-sm text-menu-muted">已登入：{userEmail}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-menu-muted">
            {userEmail ? `已登入：${userEmail}` : "已登入"}
          </p>
          <h1 className="font-menu-display text-2xl font-bold text-menu-ink sm:text-3xl">
            入座 QR（限時）
          </h1>
          <p className="mt-1 text-sm text-menu-muted">
            客人入座時產生新 QR：超過「用餐時間」後掃碼失效；「點餐時間」內才可送單（預設用餐 2
            小時、點餐 90 分鐘）。同桌新開一場會自動作廢舊場次 QR。
          </p>
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
            href="/admin/orders"
            className="rounded-xl border border-menu-primary/40 bg-menu-primary/10 px-4 py-2 text-sm font-semibold text-menu-primary transition-colors hover:bg-menu-primary/20"
          >
            後廚接單
          </Link>
          <AdminSignOutButton />
        </div>
      </div>

      <div className="rounded-3xl border border-menu-border bg-menu-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end">
          {restaurantIds.length > 1 ? (
            <label className="block flex-1 min-w-[10rem] text-sm font-medium text-menu-ink">
              餐廳
              <select
                value={restaurantId}
                onChange={(e) => {
                  const next = e.target.value;
                  setRestaurantId(next);
                  const first = tables.find((t) => t.restaurant_id === next);
                  setSelectedTableId(first?.id ?? "");
                  setActive(null);
                }}
                className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-3 py-2.5 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
              >
                {restaurantIds.map((rid) => (
                  <option key={rid} value={rid}>
                    {restaurantNames[rid] ?? rid}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block flex-1 min-w-[10rem] text-sm font-medium text-menu-ink">
            餐桌
            <select
              value={selectedTableId}
              onChange={(e) => {
                setSelectedTableId(e.target.value);
                setActive(null);
              }}
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-3 py-2.5 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            >
              {filteredTables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.table_number} 桌 · {t.restaurant_name}
                </option>
              ))}
            </select>
          </label>

          <label className="block flex-1 min-w-[8rem] text-sm font-medium text-menu-ink">
            用餐時間（分）
            <input
              type="number"
              min={1}
              max={1440}
              value={diningMinutes}
              onChange={(e) =>
                setDiningMinutes(Number(e.target.value) || DEFAULT_DINING_MIN)
              }
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-3 py-2.5 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            />
          </label>

          <label className="block flex-1 min-w-[8rem] text-sm font-medium text-menu-ink">
            點餐時間（分）
            <input
              type="number"
              min={1}
              max={1440}
              value={orderMinutes}
              onChange={(e) =>
                setOrderMinutes(Number(e.target.value) || DEFAULT_ORDER_MIN)
              }
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-3 py-2.5 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            />
          </label>

          <button
            type="button"
            disabled={busy || !selectedTableId}
            onClick={() => void generateSession()}
            className="rounded-xl bg-menu-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-menu-cta-hover disabled:opacity-50"
          >
            {busy ? "產生中…" : "產生入座 QR"}
          </button>
        </div>

        {message ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {message}
          </p>
        ) : null}

        {selected && active ? (
          <div className="mt-8 flex flex-col items-center gap-6 border-t border-menu-border pt-8 sm:flex-row sm:items-start sm:justify-center">
            <div className="rounded-2xl border border-menu-border bg-white p-4 shadow-inner">
              <Image
                src={qrImageSrc}
                alt={`桌 ${selected.table_number} 入座 QR`}
                width={QR_SIZE}
                height={QR_SIZE}
                className="h-auto w-full max-w-[280px]"
                unoptimized
              />
            </div>
            <div className="w-full max-w-md space-y-3 text-sm">
              <p className="font-menu-display text-lg font-semibold text-menu-ink">
                {selected.restaurant_name} · 桌 {selected.table_number}
              </p>
              <p className="text-xs leading-relaxed text-menu-muted">
                可點餐至：{new Date(active.orderUntilIso).toLocaleString("zh-TW")}
                <br />
                QR 失效：{new Date(active.sessionUntilIso).toLocaleString("zh-TW")}
              </p>
              <p className="break-all rounded-xl bg-menu-bg px-3 py-2 font-mono text-xs text-menu-muted">
                {active.scanUrl}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyUrl()}
                  className="rounded-xl bg-menu-cta px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-menu-cta-hover"
                >
                  {copied ? "已複製" : "複製網址"}
                </button>
                <a
                  href={qrImageSrc}
                  download={`MenuGo-${selected.table_number}-入座QR.png`}
                  className="inline-flex items-center justify-center rounded-xl border border-menu-border bg-menu-card px-4 py-2.5 text-sm font-semibold text-menu-ink hover:bg-menu-surface"
                >
                  下載 PNG
                </a>
                <a
                  href={active.scanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-menu-primary/40 bg-menu-primary/10 px-4 py-2.5 text-sm font-semibold text-menu-primary hover:bg-menu-primary/20"
                >
                  預覽點餐頁
                </a>
              </div>
            </div>
          </div>
        ) : selected ? (
          <p className="mt-6 border-t border-menu-border pt-6 text-center text-sm text-menu-muted">
            請按「產生入座 QR」以取得本桌限時掃碼。
          </p>
        ) : null}
      </div>
    </div>
  );
}
