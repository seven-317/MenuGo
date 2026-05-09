"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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

type OpenSessionRow = {
  id: string;
  table_id: string;
  restaurant_id: string;
  qr_token: string;
  started_at: string;
  dining_duration_minutes: number;
  order_window_minutes: number;
};

function sessionEndIso(startedAtIso: string, minutes: number): string {
  const d = new Date(startedAtIso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

async function fetchScanUrl(qrToken: string): Promise<{
  url: string | null;
  error: string | null;
}> {
  const buildRes = await fetch("/api/scan/build-scan-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qr_token: qrToken }),
  });
  const buildBody = (await buildRes.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!buildRes.ok || !buildBody.url) {
    return { url: null, error: buildBody.error ?? "無法組掃碼網址" };
  }
  return { url: buildBody.url, error: null };
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
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [copied, setCopied] = useState(false);

  const [openSessions, setOpenSessions] = useState<OpenSessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

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

  const tableById = useMemo(
    () => Object.fromEntries(tables.map((t) => [t.id, t])),
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

  const displayedOpenSessions = useMemo(
    () => openSessions.filter((s) => s.restaurant_id === restaurantId),
    [openSessions, restaurantId],
  );

  const loadOpenSessions = useCallback(async () => {
    if (restaurantIds.length === 0) {
      setOpenSessions([]);
      setSessionsLoading(false);
      return;
    }
    setSessionsLoading(true);
    setSessionsError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("table_sessions")
      .select(
        "id, table_id, restaurant_id, qr_token, started_at, dining_duration_minutes, order_window_minutes",
      )
      .in("restaurant_id", restaurantIds)
      .is("revoked_at", null)
      .order("started_at", { ascending: false });

    setSessionsLoading(false);
    if (error) {
      setSessionsError(error.message);
      setOpenSessions([]);
      return;
    }
    setOpenSessions((data ?? []) as OpenSessionRow[]);
  }, [restaurantIds]);

  useEffect(() => {
    void loadOpenSessions();
  }, [loadOpenSessions]);

  const qrImageSrc = active
    ? `/api/qrcode?url=${encodeURIComponent(active.scanUrl)}&size=${QR_SIZE}`
    : "";

  const applyActiveFromSessionData = async (data: {
    qr_token: string;
    started_at: string;
    dining_duration_minutes: number;
    order_window_minutes: number;
  }) => {
    const { url, error: urlErr } = await fetchScanUrl(data.qr_token);
    if (!url) {
      setMessageSuccess(false);
      setMessage(urlErr ?? "無法組掃碼網址");
      return;
    }
    const startedAt =
      typeof data.started_at === "string"
        ? data.started_at
        : new Date().toISOString();
    setActive({
      scanUrl: url,
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

  const generateSession = async () => {
    if (!selected) {
      return;
    }
    if (orderMinutes > diningMinutes) {
      setMessageSuccess(false);
      setMessage("點餐時間不可長於總用餐時間");
      return;
    }
    setMessageSuccess(false);
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

    const { url, error: urlErr } = await fetchScanUrl(data.qr_token);
    if (!url) {
      setMessage(urlErr ?? "無法組掃碼網址");
      return;
    }

    const startedAt =
      typeof data.started_at === "string"
        ? data.started_at
        : new Date().toISOString();

    setActive({
      scanUrl: url,
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
    await loadOpenSessions();
  };

  const revokeSession = async (row: OpenSessionRow) => {
    setMessage(null);
    setMessageSuccess(false);
    setRevokingId(row.id);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("table_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", row.id);
    setRevokingId(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (active?.qrToken === row.qr_token) {
      setActive(null);
    }
    await loadOpenSessions();
    setMessageSuccess(true);
    setMessage("已關閉此入座節次，掃碼連結已失效。");
  };

  const regenerateSession = async (row: OpenSessionRow) => {
    setMessage(null);
    setMessageSuccess(false);
    setRegeneratingId(row.id);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("table_sessions")
      .insert({
        table_id: row.table_id,
        restaurant_id: row.restaurant_id,
        dining_duration_minutes: row.dining_duration_minutes,
        order_window_minutes: row.order_window_minutes,
      })
      .select(
        "id, qr_token, started_at, dining_duration_minutes, order_window_minutes",
      )
      .single();
    setRegeneratingId(null);
    if (error || !data) {
      setMessage(error?.message ?? "重新產生失敗");
      return;
    }
    await loadOpenSessions();
    if (selectedTableId === row.table_id) {
      await applyActiveFromSessionData(data);
    }
    setMessageSuccess(true);
    setMessage("已重新產生 QR，舊連結已失效；請使用新連結或下方列表操作。");
  };

  const copySessionLink = async (row: OpenSessionRow) => {
    const { url, error: urlErr } = await fetchScanUrl(row.qr_token);
    if (!url) {
      setMessageSuccess(false);
      setMessage(urlErr ?? "無法組掃碼網址");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSessionId(row.id);
      window.setTimeout(() => setCopiedSessionId(null), 2000);
    } catch {
      window.prompt("請手動複製", url);
    }
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
            小時、點餐 90 分鐘）。同桌新開一場會自動作廢舊場次 QR。下方可管理進行中的節次。
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
          <p
            className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
              messageSuccess
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
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

      <div className="mt-8 rounded-3xl border border-menu-border bg-menu-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-menu-display text-lg font-bold text-menu-ink">
            進行中的入座節次
          </h2>
          <button
            type="button"
            onClick={() => void loadOpenSessions()}
            className="text-sm font-medium text-menu-primary underline-offset-2 hover:underline"
          >
            重新整理列表
          </button>
        </div>
        <p className="mt-1 text-sm text-menu-muted">
          關閉節次後掃碼即失效。重新產生會開新 QR 並自動作廢該桌舊節次（沿用原用餐／點餐分鐘數）。
        </p>

        {sessionsError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            無法載入節次：{sessionsError}
          </p>
        ) : null}

        {sessionsLoading ? (
          <p className="mt-6 text-sm text-menu-muted">載入中…</p>
        ) : displayedOpenSessions.length === 0 ? (
          <p className="mt-6 text-sm text-menu-muted">
            目前所選餐廳沒有進行中的入座 QR。
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {displayedOpenSessions.map((row) => {
              const tbl = tableById[row.table_id];
              const tableLabel = tbl?.table_number ?? "—";
              const restName =
                restaurantNames[row.restaurant_id] ?? tbl?.restaurant_name ?? "—";
              const started =
                typeof row.started_at === "string"
                  ? row.started_at
                  : new Date().toISOString();
              const orderUntil = sessionEndIso(
                started,
                Number(row.order_window_minutes),
              );
              const sessionUntil = sessionEndIso(
                started,
                Number(row.dining_duration_minutes),
              );
              const busyRow =
                revokingId === row.id || regeneratingId === row.id;
              return (
                <li
                  key={row.id}
                  className="rounded-2xl border border-menu-border bg-menu-bg/50 px-4 py-4"
                >
                  <div className="min-w-0 space-y-2 text-sm">
                    <p className="font-semibold text-menu-ink">
                      {restName} · {tableLabel} 桌
                    </p>
                    <p className="text-xs text-menu-muted">
                      開始：{new Date(started).toLocaleString("zh-TW")}
                      <br />
                      點餐截止：{new Date(orderUntil).toLocaleString("zh-TW")}{" "}
                      · 用餐截止：
                      {new Date(sessionUntil).toLocaleString("zh-TW")}
                      <br />
                      用餐 {row.dining_duration_minutes} 分／點餐{" "}
                      {row.order_window_minutes} 分
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={busyRow}
                        onClick={() => void copySessionLink(row)}
                        className="rounded-lg border border-menu-border bg-menu-card px-3 py-1.5 text-xs font-semibold text-menu-ink hover:bg-menu-surface disabled:opacity-50"
                      >
                        {copiedSessionId === row.id ? "已複製連結" : "複製掃碼連結"}
                      </button>
                      <button
                        type="button"
                        disabled={busyRow}
                        onClick={() => void regenerateSession(row)}
                        className="rounded-lg border border-menu-primary/40 bg-menu-primary/10 px-3 py-1.5 text-xs font-semibold text-menu-primary hover:bg-menu-primary/20 disabled:opacity-50"
                      >
                        {regeneratingId === row.id
                          ? "產生中…"
                          : "重新產生 QR"}
                      </button>
                      <button
                        type="button"
                        disabled={busyRow}
                        onClick={() => void revokeSession(row)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-100 disabled:opacity-50"
                      >
                        {revokingId === row.id ? "關閉中…" : "關閉節次"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
