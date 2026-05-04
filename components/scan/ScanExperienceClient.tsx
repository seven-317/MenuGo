"use client";

import { useCallback, useEffect, useState } from "react";

import { appendStoredOrderId } from "@/lib/scan/order-history-storage";

import {
  ScanMenuClient,
  type ScanMenuItemSerializable,
} from "@/components/scan/ScanMenuClient";
import { ScanOrderHistory } from "@/components/scan/ScanOrderHistory";

export type ScanExperienceClientProps = {
  restaurantId: string;
  tableSessionId: string;
  restaurantName: string;
  tableNumber: string;
  qrToken: string;
  scanSig: string;
  orderUntilIso: string;
  sessionUntilIso: string;
  orderUntilLabel: string;
  sessionUntilLabel: string;
  items: ScanMenuItemSerializable[];
};

type TabId = "menu" | "info";

const tabBtn =
  "flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-all focus-visible:ring-2 focus-visible:ring-menu-cta focus-visible:ring-offset-2 focus-visible:ring-offset-menu-bg";

function formatRemaining(ms: number): string {
  if (ms <= 0) {
    return "已結束";
  }
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h > 0) {
    return `${h} 小時 ${mm} 分`;
  }
  if (m > 0) {
    return `${m} 分 ${s} 秒`;
  }
  return `${s} 秒`;
}

function ScanSessionNotice({
  orderUntilIso,
  sessionUntilIso,
  orderUntilLabel,
  sessionUntilLabel,
}: {
  orderUntilIso: string;
  sessionUntilIso: string;
  orderUntilLabel: string;
  sessionUntilLabel: string;
}) {
  const [tick, setTick] = useState<number | null>(null);

  useEffect(() => {
    setTick(Date.now());
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const orderEnd = new Date(orderUntilIso).getTime();
  const sessionEnd = new Date(sessionUntilIso).getTime();
  const hasClock = tick != null;
  const canOrder = hasClock && tick < orderEnd;
  const sessionLive = hasClock && tick < sessionEnd;

  return (
    <div className="menu-reveal mt-5 rounded-2xl border border-menu-border bg-menu-card/90 px-4 py-3 text-sm leading-relaxed shadow-sm">
      <p className="font-medium text-menu-ink">本次入座 · 限時 QR</p>
      <ul className="mt-2 space-y-1 text-menu-muted">
        <li>
          可點餐至{" "}
          <span className="font-semibold text-menu-ink">{orderUntilLabel}</span>
          {hasClock ? (
            canOrder ? (
              <span className="ms-2 text-menu-primary">
                （餘 {formatRemaining(orderEnd - tick)}）
              </span>
            ) : (
              <span className="ms-2 font-medium text-amber-800">
                （已截止點餐）
              </span>
            )
          ) : null}
        </li>
        <li>
          本 QR 有效至{" "}
          <span className="font-semibold text-menu-ink">
            {sessionUntilLabel}
          </span>
          {hasClock ? (
            sessionLive ? (
              <span className="ms-2 text-menu-muted">
                （餘 {formatRemaining(sessionEnd - tick)}）
              </span>
            ) : (
              <span className="ms-2 font-medium text-red-800">（已失效）</span>
            )
          ) : null}
        </li>
      </ul>
      {hasClock && !canOrder && sessionLive ? (
        <p className="mt-2 text-xs text-amber-900">
          點餐時間已結束，您仍可在此頁查看本場次資訊與訂單紀錄。
        </p>
      ) : null}
    </div>
  );
}

export function ScanExperienceClient({
  restaurantId,
  tableSessionId,
  restaurantName,
  tableNumber,
  qrToken,
  scanSig,
  orderUntilIso,
  sessionUntilIso,
  orderUntilLabel,
  sessionUntilLabel,
  items,
}: ScanExperienceClientProps) {
  const [tab, setTab] = useState<TabId>("menu");

  const handleOrderPlaced = useCallback(
    (orderId: string) => {
      appendStoredOrderId(tableSessionId, orderId);
    },
    [tableSessionId],
  );

  return (
    <div>
      <div
        className="menu-reveal flex gap-1 rounded-2xl border border-menu-border bg-menu-bg/90 p-1 shadow-inner"
        style={{ animationDelay: "0.06s" }}
        role="tablist"
        aria-label="掃碼頁主要區塊"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "menu"}
          className={`${tabBtn} ${
            tab === "menu"
              ? "bg-menu-card text-menu-ink shadow-sm"
              : "text-menu-muted hover:text-menu-ink"
          }`}
          onClick={() => setTab("menu")}
        >
          點餐
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "info"}
          className={`${tabBtn} ${
            tab === "info"
              ? "bg-menu-card text-menu-ink shadow-sm"
              : "text-menu-muted hover:text-menu-ink"
          }`}
          onClick={() => setTab("info")}
        >
          資訊
        </button>
      </div>

      <ScanSessionNotice
        orderUntilIso={orderUntilIso}
        sessionUntilIso={sessionUntilIso}
        orderUntilLabel={orderUntilLabel}
        sessionUntilLabel={sessionUntilLabel}
      />

      <div
        className={`mt-6 ${tab === "menu" && items.length > 0 ? "pb-40 sm:pb-10" : ""}`}
        role="tabpanel"
        hidden={tab !== "menu"}
        aria-hidden={tab !== "menu"}
      >
        {tab === "menu" ? (
          items.length === 0 ? (
            <p className="rounded-3xl border-2 border-dashed border-menu-border bg-menu-card px-6 py-14 text-center text-sm leading-relaxed text-menu-muted">
              目前沒有可點餐的品項。
            </p>
          ) : (
            <ScanMenuClient
              tableSessionId={tableSessionId}
              orderUntilIso={orderUntilIso}
              items={items}
              onOrderPlaced={handleOrderPlaced}
            />
          )
        ) : null}
      </div>

      <div
        className="mt-6 space-y-6"
        role="tabpanel"
        hidden={tab !== "info"}
        aria-hidden={tab !== "info"}
      >
        {tab === "info" ? (
          <>
            <section className="menu-reveal rounded-3xl border border-menu-border bg-menu-card p-5 shadow-sm">
              <h2 className="font-menu-display text-lg font-bold text-menu-ink">
                關於 {restaurantName}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-menu-muted">
                本頁為線上點餐與訂單狀態查詢。實際供餐與結帳方式請依現場店員說明；如有過敏或特殊需求請主動告知店家。
              </p>
              <p className="mt-3 text-sm text-menu-ink">
                目前桌次{" "}
                <span className="font-semibold text-menu-primary">
                  {tableNumber}
                </span>
              </p>
            </section>

            <ScanOrderHistory
              tableSessionId={tableSessionId}
              qrToken={qrToken}
              scanSig={scanSig}
              enabled={tab === "info"}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
