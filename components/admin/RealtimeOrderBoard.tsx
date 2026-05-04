"use client";

import { useCallback, useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";

/** 與 public.orders 對齊的即時 payload（欄位以 Supabase Realtime 為準） */
type OrderRow = {
  id: string;
  table_id: string;
  restaurant_id: string;
  status: string;
  total_price: string | number;
  created_at: string;
};

export type OrderListItem = {
  id: string;
  table_number: string;
  status: string;
  total_price: number;
  created_at: string;
};

type RealtimeOrderBoardProps = {
  /** 目前後台檢視的餐廳 ID（用於初始載入與 Realtime filter） */
  restaurantId: string;
};

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

/**
 * MenuGo 餐廳後台：即時接單列表（Supabase Realtime `orders` INSERT）
 *
 * 使用前提（Supabase Dashboard）：
 * - Database → Replication → 對 `public.orders` 開啟 Realtime
 * - 管理員已透過 Supabase Auth 登入（RLS 僅允許 owner 讀取自家訂單）
 *
 * 用法範例：
 * ```tsx
 * <RealtimeOrderBoard restaurantId={restaurant.id} />
 * ```
 */
export function RealtimeOrderBoard({ restaurantId }: RealtimeOrderBoardProps) {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const mergeTableNumbers = useCallback(
    async (
      supabase: ReturnType<typeof createSupabaseBrowserClient>,
      rows: Pick<OrderRow, "id" | "table_id" | "status" | "total_price" | "created_at">[],
    ): Promise<OrderListItem[]> => {
      const tableIds = [...new Set(rows.map((r) => r.table_id))];
      let tableMap: Record<string, string> = {};

      if (tableIds.length > 0) {
        const { data: tables, error } = await supabase
          .from("tables")
          .select("id, table_number")
          .in("id", tableIds);

        if (error) {
          throw new Error(error.message);
        }
        tableMap = Object.fromEntries(
          (tables ?? []).map((t) => [t.id, t.table_number]),
        );
      }

      return rows.map((o) => ({
        id: o.id,
        table_number: tableMap[o.table_id] ?? "—",
        status: o.status,
        total_price: Number(o.total_price),
        created_at: o.created_at,
      }));
    },
    [],
  );

  const loadOrders = useCallback(async () => {
    setLoadError(null);
    const supabase = createSupabaseBrowserClient();

    const { data: orderRows, error: ordersError } = await supabase
      .from("orders")
      .select("id, table_id, status, total_price, created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (ordersError) {
      setLoadError(ordersError.message);
      return;
    }

    try {
      const merged = await mergeTableNumbers(
        supabase,
        orderRows ?? [],
      );
      setOrders(merged);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "載入桌號失敗");
    }
  }, [mergeTableNumbers, restaurantId]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`orders-insert:${restaurantId}`)
      .on<OrderRow>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload: RealtimePostgresInsertPayload<OrderRow>) => {
          const row = payload.new;
          let tableNumber = "—";
          const { data: tableRow } = await supabase
            .from("tables")
            .select("table_number")
            .eq("id", row.table_id)
            .maybeSingle();
          if (tableRow?.table_number) {
            tableNumber = tableRow.table_number;
          }

          setOrders((prev) => {
            if (prev.some((o) => o.id === row.id)) {
              return prev;
            }
            const next: OrderListItem = {
              id: row.id,
              table_number: tableNumber,
              status: row.status,
              total_price: Number(row.total_price),
              created_at: row.created_at,
            };
            return [next, ...prev];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const handleAccept = async (orderId: string) => {
    setAcceptingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/accept`, {
        method: "POST",
        credentials: "same-origin",
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        setLoadError(body.error ?? `接單失敗（${res.status}）`);
        return;
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "confirmed" } : o,
        ),
      );
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">即時訂單</h2>
        <button
          type="button"
          onClick={() => void loadOrders()}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          重新整理
        </button>
      </div>

      {loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
          目前沒有訂單。新訂單進線後會自動出現在這裡。
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const isPending = order.status === "pending";
            const busy = acceptingId === order.id;

            return (
              <li
                key={order.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      桌號
                    </span>
                    <span className="text-xl font-semibold text-zinc-900">
                      {order.table_number}
                    </span>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                        isPending
                          ? "bg-amber-100 text-amber-900"
                          : "bg-emerald-100 text-emerald-900"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600">
                    金額{" "}
                    <span className="font-semibold text-zinc-900">
                      {moneyTwd.format(order.total_price)}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    成立時間 {formatCreatedAt(order.created_at)}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2 sm:flex-col">
                  <button
                    type="button"
                    disabled={!isPending || busy}
                    onClick={() => void handleAccept(order.id)}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-zinc-300"
                  >
                    {busy ? "處理中…" : "接單"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
