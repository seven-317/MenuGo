"use client";

import { useCallback, useEffect, useState } from "react";

import { getStoredOrderIds } from "@/lib/scan/order-history-storage";

const moneyTwd = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  minimumFractionDigits: 0,
});

function formatCreatedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-TW", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function customerStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "新訂單 · 待店家接單";
    case "confirmed":
      return "製作中";
    case "completed":
      return "已完成";
    default:
      return status;
  }
}

type ScanOrderHistoryProps = {
  tableId: string;
  qrToken: string;
  scanSig: string;
  enabled: boolean;
};

type HistoryOrder = {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  items: { name: string; quantity: number; line_total: number }[];
};

export function ScanOrderHistory({
  tableId,
  qrToken,
  scanSig,
  enabled,
}: ScanOrderHistoryProps) {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const ids = getStoredOrderIds(tableId);
    if (ids.length === 0) {
      setOrders([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qr_token: qrToken,
          sig: scanSig,
          order_ids: ids,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        orders?: HistoryOrder[];
      };

      if (!res.ok) {
        setError(body.error ?? `無法載入紀錄（${res.status}）`);
        setOrders([]);
        return;
      }

      setOrders(body.orders ?? []);
    } catch {
      setError("網路錯誤");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [tableId, qrToken, scanSig]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    const t = window.setInterval(() => void refresh(), 20_000);
    return () => {
      window.clearTimeout(id);
      window.clearInterval(t);
    };
  }, [enabled, refresh]);

  const storageEmpty = getStoredOrderIds(tableId).length === 0;

  return (
    <section className="menu-reveal rounded-3xl border border-menu-border bg-menu-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-menu-display text-lg font-bold text-menu-ink">
          歷史點餐紀錄
        </h2>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-xl border border-menu-border bg-menu-bg px-3 py-1.5 text-xs font-semibold text-menu-ink transition-colors hover:bg-menu-surface disabled:opacity-50"
        >
          {loading ? "更新中…" : "重新整理"}
        </button>
      </div>
      <p className="mt-2 text-xs text-menu-muted">
        僅顯示此手機／瀏覽器曾在此桌送出的訂單。換裝置或清除網站資料後將看不到舊紀錄。
      </p>

      {error ? (
        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      {storageEmpty ? (
        <p className="mt-6 rounded-2xl border border-dashed border-menu-border bg-menu-bg px-4 py-10 text-center text-sm text-menu-muted">
          尚無紀錄。完成點餐後，訂單會自動出現在這裡。
        </p>
      ) : orders.length === 0 && !loading ? (
        <p className="mt-6 text-center text-sm text-menu-muted">
          無法讀取訂單，請按「重新整理」或稍後再試。
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-2xl border border-menu-border bg-menu-bg px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-mono text-[0.65rem] font-medium text-menu-muted">
                  {o.id}
                </p>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-menu-primary ring-1 ring-menu-border">
                  {customerStatusLabel(o.status)}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-menu-ink">
                {moneyTwd.format(o.total_price)}{" "}
                <span className="text-xs font-normal text-menu-muted">
                  · {formatCreatedAt(o.created_at)}
                </span>
              </p>
              <ul className="mt-2 space-y-1 border-t border-menu-border/80 pt-2 text-sm text-menu-muted">
                {o.items.map((line, i) => (
                  <li
                    key={`${o.id}-${i}`}
                    className="flex justify-between gap-2"
                  >
                    <span>
                      {line.name}{" "}
                      <span className="text-menu-muted/90">× {line.quantity}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-menu-ink">
                      {moneyTwd.format(line.line_total)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
