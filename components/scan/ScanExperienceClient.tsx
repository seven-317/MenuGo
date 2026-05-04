"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { appendStoredOrderId } from "@/lib/scan/order-history-storage";

import {
  ScanMenuClient,
  type ScanMenuItemSerializable,
} from "@/components/scan/ScanMenuClient";
import { ScanOrderHistory } from "@/components/scan/ScanOrderHistory";

export type ScanExperienceClientProps = {
  restaurantId: string;
  tableId: string;
  restaurantName: string;
  tableNumber: string;
  qrToken: string;
  scanSig: string;
  items: ScanMenuItemSerializable[];
};

type TabId = "menu" | "info";

const tabBtn =
  "flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-all focus-visible:ring-2 focus-visible:ring-menu-cta focus-visible:ring-offset-2 focus-visible:ring-offset-menu-bg";

export function ScanExperienceClient({
  restaurantId,
  tableId,
  restaurantName,
  tableNumber,
  qrToken,
  scanSig,
  items,
}: ScanExperienceClientProps) {
  const [tab, setTab] = useState<TabId>("menu");

  const handleOrderPlaced = useCallback(
    (orderId: string) => {
      appendStoredOrderId(tableId, orderId);
    },
    [tableId],
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
              restaurantId={restaurantId}
              tableId={tableId}
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
              tableId={tableId}
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
