"use client";

import { useMemo, useState } from "react";

export type ScanMenuItemSerializable = {
  id: string;
  name: string;
  price: number;
  category: string | null;
  description: string | null;
  image_url: string | null;
};

type ScanMenuClientProps = {
  restaurantId: string;
  tableId: string;
  items: ScanMenuItemSerializable[];
  onOrderPlaced?: (orderId: string) => void;
};

const moneyTwd = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  minimumFractionDigits: 0,
});

export function ScanMenuClient({
  restaurantId,
  tableId,
  items,
  onOrderPlaced,
}: ScanMenuClientProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const itemById = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i])),
    [items],
  );

  const cartLines = useMemo(() => {
    return Object.entries(quantities)
      .filter(([, q]) => q > 0)
      .map(([id, quantity]) => {
        const row = itemById[id];
        if (!row) {
          return null;
        }
        return { ...row, quantity };
      })
      .filter(Boolean) as (ScanMenuItemSerializable & { quantity: number })[];
  }, [quantities, itemById]);

  const subtotal = useMemo(
    () => cartLines.reduce((s, l) => s + l.price * l.quantity, 0),
    [cartLines],
  );

  const bump = (menuId: string, delta: number) => {
    setError(null);
    setSuccessOrderId(null);
    setQuantities((prev) => {
      const next = { ...prev };
      const cur = next[menuId] ?? 0;
      const v = cur + delta;
      if (v <= 0) {
        delete next[menuId];
      } else {
        next[menuId] = v;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccessOrderId(null);
    const cart = cartLines.map((l) => ({
      menu_id: l.id,
      quantity: l.quantity,
    }));
    if (cart.length === 0) {
      setError("請至少選擇一項餐點");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          table_id: tableId,
          cart,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        order_id?: string;
      };

      if (!res.ok) {
        setError(body.error ?? `送單失敗（${res.status}）`);
        return;
      }

      if (body.order_id) {
        setSuccessOrderId(body.order_id);
        setQuantities({});
        onOrderPlaced?.(body.order_id);
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <ul className="space-y-4">
        {items.map((item, index) => {
          const q = quantities[item.id] ?? 0;

          return (
            <li
              key={item.id}
              className="menu-reveal flex gap-4 rounded-3xl border border-menu-border bg-menu-card p-4 shadow-sm transition-all duration-300 motion-safe:hover:-translate-y-0.5 hover:shadow-md"
              style={{
                animationDelay: `${0.1 + Math.min(index, 10) * 0.055}s`,
              }}
            >
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-menu-bg ring-1 ring-menu-border">
                {item.image_url ? (
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
              <div className="flex min-w-0 flex-1 flex-col py-0.5">
                <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                  <h2 className="font-menu-display text-lg font-bold text-menu-ink">
                    {item.name}
                  </h2>
                  <p className="shrink-0 text-base font-bold text-menu-cta">
                    {moneyTwd.format(item.price)}
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

                <div className="mt-3 flex items-center gap-2 self-end sm:self-start">
                  <button
                    type="button"
                    aria-label={`減少 ${item.name}`}
                    disabled={q === 0 || submitting}
                    onClick={() => bump(item.id, -1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-menu-border bg-menu-bg text-lg font-semibold text-menu-ink transition-colors hover:bg-menu-surface disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] text-center text-sm font-bold tabular-nums text-menu-ink">
                    {q}
                  </span>
                  <button
                    type="button"
                    aria-label={`增加 ${item.name}`}
                    disabled={submitting}
                    onClick={() => bump(item.id, 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-menu-cta text-lg font-semibold text-white shadow-sm transition-all hover:bg-menu-cta-hover disabled:opacity-60"
                  >
                    +
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pointer-events-auto sm:static sm:z-0 sm:mt-8 sm:p-0">
        <div className="pointer-events-auto mx-auto max-w-2xl rounded-3xl border border-menu-border bg-menu-card/95 p-4 shadow-2xl shadow-stone-900/15 backdrop-blur-md sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
          {error ? (
            <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              {error}
            </p>
          ) : null}
          {successOrderId ? (
            <p className="mb-3 rounded-2xl border border-menu-primary/30 bg-menu-primary/10 px-3 py-2 text-sm text-menu-ink">
              訂單已送出。編號{" "}
              <span className="font-mono text-xs font-semibold">
                {successOrderId}
              </span>
              — 請等候店家確認。
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-menu-muted">
              已選 {cartLines.length} 項 · 小計{" "}
              <span className="font-semibold text-menu-ink">
                {moneyTwd.format(subtotal)}
              </span>
            </div>
            <button
              type="button"
              disabled={submitting || cartLines.length === 0}
              onClick={() => void handleSubmit()}
              className="inline-flex h-12 min-h-[44px] w-full cursor-pointer items-center justify-center rounded-2xl bg-menu-cta px-6 text-sm font-semibold text-white shadow-md outline-none transition-all duration-300 hover:bg-menu-cta-hover hover:shadow-lg disabled:cursor-not-allowed disabled:bg-menu-muted/40 disabled:shadow-none sm:w-auto"
            >
              {submitting ? "送出中…" : "送出訂單"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
