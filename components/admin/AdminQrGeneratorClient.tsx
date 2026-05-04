"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";

export type QrTableOption = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  table_number: string;
  qr_token: string;
  scanUrl: string;
};

type AdminQrGeneratorClientProps = {
  tables: QrTableOption[];
  userEmail: string | undefined;
};

const QR_SIZE = 280;

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

  const qrImageSrc = selected
    ? `/api/qrcode?url=${encodeURIComponent(selected.scanUrl)}&size=${QR_SIZE}`
    : "";

  const handleCopyUrl = async () => {
    if (!selected?.scanUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(selected.scanUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("請手動複製", selected.scanUrl);
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
            桌邊點餐 QR
          </h1>
          <p className="mt-1 text-sm text-menu-muted">
            列印或顯示於桌面，供顧客掃描進入該桌點餐頁。
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
              onChange={(e) => setSelectedTableId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-3 py-2.5 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            >
              {filteredTables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.table_number} 桌 · {t.restaurant_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selected ? (
          <div className="mt-8 flex flex-col items-center gap-6 border-t border-menu-border pt-8 sm:flex-row sm:items-start sm:justify-center">
            <div className="rounded-2xl border border-menu-border bg-white p-4 shadow-inner">
              <Image
                src={qrImageSrc}
                alt={`桌 ${selected.table_number} 點餐 QR`}
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
              <p className="break-all rounded-xl bg-menu-bg px-3 py-2 font-mono text-xs text-menu-muted">
                {selected.scanUrl}
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
                  download={`MenuGo-桌${selected.table_number}-點餐QR.png`}
                  className="inline-flex items-center justify-center rounded-xl border border-menu-border bg-menu-card px-4 py-2.5 text-sm font-semibold text-menu-ink hover:bg-menu-surface"
                >
                  下載 PNG
                </a>
                <a
                  href={selected.scanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-menu-primary/40 bg-menu-primary/10 px-4 py-2.5 text-sm font-semibold text-menu-primary hover:bg-menu-primary/20"
                >
                  預覽點餐頁
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
