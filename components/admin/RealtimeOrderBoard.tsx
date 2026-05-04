"use client";

import { useCallback, useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";

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

type OrderLineDetail = {
  quantity: number;
  notes: string | null;
  menuName: string;
  lineTotal: number;
};

type RealtimeOrderBoardProps = {
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

function statusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-900";
    case "confirmed":
      return "bg-sky-100 text-sky-900";
    case "completed":
      return "bg-zinc-200 text-zinc-800";
    default:
      return "bg-violet-100 text-violet-900";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "待接單";
    case "confirmed":
      return "製作中";
    case "completed":
      return "已完成";
    default:
      return status;
  }
}

export function RealtimeOrderBoard({ restaurantId }: RealtimeOrderBoardProps) {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [linesByOrder, setLinesByOrder] = useState<
    Record<string, OrderLineDetail[]>
  >({});
  const [loadingLinesId, setLoadingLinesId] = useState<string | null>(null);

  const mergeTableNumbers = useCallback(
    async (
      supabase: ReturnType<typeof createSupabaseBrowserClient>,
      rows: Pick<
        OrderRow,
        "id" | "table_id" | "status" | "total_price" | "created_at"
      >[],
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
      .limit(150);

    if (ordersError) {
      setLoadError(ordersError.message);
      return;
    }

    try {
      const merged = await mergeTableNumbers(supabase, orderRows ?? []);
      setOrders(merged);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "載入桌號失敗");
    }
  }, [mergeTableNumbers, restaurantId]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadOrders();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadOrders]);

  // Realtime 未開或連線異常時仍會自動同步（免手動整頁重整）
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadOrders();
      }
    }, 15000);
    return () => window.clearInterval(interval);
  }, [loadOrders]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const syncRealtimeAuth = async (accessToken: string | undefined) => {
      await supabase.realtime.setAuth(accessToken ?? null);
    };

    const start = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) {
        return;
      }
      await syncRealtimeAuth(session?.access_token);
      if (cancelled) {
        return;
      }

      const ch = supabase
        .channel(`orders-board:${restaurantId}`)
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
        .on<OrderRow>(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            const row = payload.new as OrderRow;
            if (!row?.id) {
              return;
            }
            setOrders((prev) => {
              const ix = prev.findIndex((o) => o.id === row.id);
              if (ix === -1) {
                return prev;
              }
              const copy = [...prev];
              copy[ix] = {
                ...copy[ix],
                status: row.status,
                total_price: Number(row.total_price),
              };
              return copy;
            });
          },
        )
        .subscribe();

      if (cancelled) {
        void supabase.removeChannel(ch);
        return;
      }
      channel = ch;
    };

    void start();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await syncRealtimeAuth(session?.access_token);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [restaurantId]);

  const loadOrderLines = useCallback(
    async (orderId: string) => {
      if (linesByOrder[orderId]) {
        return;
      }
      setLoadingLinesId(orderId);
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("order_items")
        .select("quantity, notes, menus(name, price)")
        .eq("order_id", orderId);

      if (error) {
        setLoadError(error.message);
        setLoadingLinesId(null);
        return;
      }

      const parsed: OrderLineDetail[] = (data ?? []).map((row) => {
        const embed = row.menus as
          | { name: string; price: string | number }
          | { name: string; price: string | number }[]
          | null;

        const menu = Array.isArray(embed) ? embed[0] : embed;
        const price = menu ? Number(menu.price) : 0;
        const name = menu?.name ?? "（品項）";
        const qty = Number(row.quantity);

        return {
          quantity: qty,
          notes: row.notes ?? null,
          menuName: name,
          lineTotal: price * qty,
        };
      });

      setLinesByOrder((prev) => ({ ...prev, [orderId]: parsed }));
      setLoadingLinesId(null);
    },
    [linesByOrder],
  );

  const toggleExpanded = (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    void loadOrderLines(orderId);
  };

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

  const handleComplete = async (orderId: string) => {
    setCompletingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/complete`, {
        method: "POST",
        credentials: "same-origin",
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        setLoadError(body.error ?? `完成訂單失敗（${res.status}）`);
        return;
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "completed" } : o,
        ),
      );
    } finally {
      setCompletingId(null);
    }
  };

  const known = new Set(["pending", "confirmed", "completed"]);
  const newOrders = orders.filter(
    (o) => o.status === "pending" || !known.has(o.status),
  );
  const making = orders.filter((o) => o.status === "confirmed");
  const done = orders.filter((o) => o.status === "completed");

  const renderCard = (order: OrderListItem, zone: "new" | "making" | "done") => {
    const isPending = order.status === "pending";
    const isConfirmed = order.status === "confirmed";
    const busyAccept = acceptingId === order.id;
    const busyComplete = completingId === order.id;

    return (
      <li
        key={`${zone}-${order.id}`}
        className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
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
              className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(order.status)}`}
            >
              {statusLabel(order.status)}
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
          <button
            type="button"
            onClick={() => toggleExpanded(order.id)}
            className="mt-2 text-left text-xs font-semibold text-zinc-700 underline-offset-2 hover:underline"
          >
            {expandedId === order.id ? "隱藏明細" : "查看明細"}
          </button>
          {expandedId === order.id ? (
            <div className="mt-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm">
              {loadingLinesId === order.id ? (
                <p className="text-zinc-500">載入明細…</p>
              ) : (linesByOrder[order.id] ?? []).length === 0 ? (
                <p className="text-zinc-500">無明細</p>
              ) : (
                <ul className="space-y-1.5">
                  {(linesByOrder[order.id] ?? []).map((line, i) => (
                    <li
                      key={`${order.id}-line-${i}`}
                      className="flex flex-wrap justify-between gap-2 text-zinc-800"
                    >
                      <span>
                        {line.menuName}{" "}
                        <span className="text-zinc-500">× {line.quantity}</span>
                        {line.notes ? (
                          <span className="block text-xs text-zinc-500">
                            備註：{line.notes}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {moneyTwd.format(line.lineTotal)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        {zone !== "done" ? (
          <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
            {zone === "new" && isPending ? (
              <button
                type="button"
                disabled={busyAccept}
                onClick={() => void handleAccept(order.id)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {busyAccept ? "處理中…" : "接單"}
              </button>
            ) : null}
            {zone === "new" && !isPending && !isConfirmed ? (
              <p className="text-xs text-zinc-500">請於後台檢查非預期狀態</p>
            ) : null}
            {zone === "making" && isConfirmed ? (
              <button
                type="button"
                disabled={busyComplete}
                onClick={() => void handleComplete(order.id)}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {busyComplete ? "處理中…" : "完成訂單"}
              </button>
            ) : null}
          </div>
        ) : null}
      </li>
    );
  };

  const column = (
    title: string,
    subtitle: string,
    list: OrderListItem[],
    zone: "new" | "making" | "done",
  ) => (
    <section className="flex min-h-0 flex-col gap-3">
      <div>
        <h3 className="text-base font-bold text-zinc-900">{title}</h3>
        <p className="text-xs text-zinc-500">{subtitle}</p>
      </div>
      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-xs text-zinc-500 sm:text-sm">
          無
        </p>
      ) : (
        <ul className="max-h-[70vh] space-y-3 overflow-y-auto pr-1 sm:max-h-none">
          {list.map((o) => renderCard(o, zone))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">訂單看板</h2>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {column(
          "新訂單",
          "待接單",
          newOrders,
          "new",
        )}
        {column("製作中", "備餐中", making, "making")}
        {column("已完成", "出餐", done, "done")}
      </div>
    </div>
  );
}
