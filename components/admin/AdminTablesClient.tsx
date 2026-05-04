"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type AdminTableRow = {
  id: string;
  restaurant_id: string;
  table_number: string;
};

type RestaurantOption = { id: string; name: string };

type AdminTablesClientProps = {
  restaurants: RestaurantOption[];
  tables: AdminTableRow[];
  userEmail: string | undefined;
};

export function AdminTablesClient({
  restaurants,
  tables: initialTables,
  userEmail,
}: AdminTablesClientProps) {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState(restaurants[0]?.id ?? "");
  const [tables, setTables] = useState(initialTables);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState("");

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  const nameById = useMemo(
    () => Object.fromEntries(restaurants.map((r) => [r.id, r.name])),
    [restaurants],
  );

  const filtered = useMemo(
    () => tables.filter((t) => t.restaurant_id === restaurantId),
    [tables, restaurantId],
  );

  const refresh = () => {
    router.refresh();
  };

  const startEdit = (row: AdminTableRow) => {
    setEditingId(row.id);
    setEditNumber(row.table_number);
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNumber("");
  };

  const saveEdit = async (id: string) => {
    const trimmed = editNumber.trim();
    if (!trimmed) {
      setMessage("桌號不可為空");
      return;
    }
    setBusyId(id);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("tables")
      .update({ table_number: trimmed })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, table_number: trimmed } : t)),
    );
    cancelEdit();
    refresh();
  };

  const addTable = async () => {
    const trimmed = newTableNumber.trim();
    if (!trimmed || !restaurantId) {
      setMessage("請選擇餐廳並輸入桌號");
      return;
    }
    setBusyId("__add__");
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("tables")
      .insert({
        restaurant_id: restaurantId,
        table_number: trimmed,
      })
      .select("id, restaurant_id, table_number, qr_token")
      .single();
    setBusyId(null);
    if (error || !data) {
      setMessage(error?.message ?? "新增失敗");
      return;
    }
    setNewTableNumber("");
    refresh();
  };

  const deleteTable = async (row: AdminTableRow) => {
    if (!window.confirm(`刪除桌「${row.table_number}」？若有相關訂單則無法刪除。`)) {
      return;
    }
    setBusyId(row.id);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("tables").delete().eq("id", row.id);
    setBusyId(null);
    if (error) {
      setMessage(
        error.message.includes("foreign key") || error.code === "23503"
          ? "無法刪除：此餐桌仍有訂單紀錄。"
          : error.message,
      );
      return;
    }
    setTables((prev) => prev.filter((t) => t.id !== row.id));
    cancelEdit();
    refresh();
  };

  if (!restaurantId) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-menu-muted">
            {userEmail ? `已登入：${userEmail}` : "已登入"}
          </p>
          <h1 className="font-menu-display text-2xl font-bold text-menu-ink sm:text-3xl">
            管理餐桌
          </h1>
          <p className="mt-1 text-sm text-menu-muted">
            新增、編輯桌號。客人入座時請至「入座 QR」產生限時掃碼（可自訂用餐／點餐時間）。
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
            href="/admin/menus"
            className="rounded-xl border border-menu-border bg-menu-card px-4 py-2 text-sm font-medium text-menu-ink transition-colors hover:bg-menu-surface"
          >
            管理餐點
          </Link>
          <Link
            href="/admin/qr"
            className="rounded-xl border border-menu-primary/40 bg-menu-primary/10 px-4 py-2 text-sm font-semibold text-menu-primary transition-colors hover:bg-menu-primary/20"
          >
            入座 QR
          </Link>
          <Link
            href="/admin/orders"
            className="rounded-xl border border-menu-border bg-menu-card px-4 py-2 text-sm font-medium text-menu-ink transition-colors hover:bg-menu-surface"
          >
            後廚接單
          </Link>
          <AdminSignOutButton />
          <Link
            href="/"
            className="rounded-xl border border-menu-primary/40 bg-menu-primary/10 px-4 py-2 text-sm font-semibold text-menu-primary transition-colors hover:bg-menu-primary/20"
          >
            回首頁
          </Link>
        </div>
      </div>

      {message ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {message}
        </p>
      ) : null}

      {restaurants.length > 1 ? (
        <label className="mb-6 block text-sm font-medium text-menu-ink">
          餐廳
          <select
            value={restaurantId}
            onChange={(e) => {
              setRestaurantId(e.target.value);
              cancelEdit();
            }}
            className="mt-1.5 w-full max-w-xs rounded-xl border border-menu-border bg-menu-card px-3 py-2 text-sm font-medium text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta sm:w-auto"
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mb-8 rounded-3xl border border-menu-border bg-menu-card p-5 shadow-sm sm:p-6">
        <h2 className="font-menu-display text-lg font-semibold text-menu-ink">
          新增餐桌
        </h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-sm font-medium text-menu-ink">
            桌號
            <input
              type="text"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              placeholder="例如：A2、3"
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-4 py-2.5 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            />
          </label>
          <button
            type="button"
            disabled={busyId === "__add__"}
            onClick={() => void addTable()}
            className="rounded-xl bg-menu-cta px-5 py-2.5 text-sm font-semibold text-white hover:bg-menu-cta-hover disabled:opacity-50"
          >
            {busyId === "__add__" ? "新增中…" : "新增"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-menu-border bg-menu-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-menu-border bg-menu-bg/80 text-xs uppercase tracking-wide text-menu-muted">
            <tr>
              {restaurants.length > 1 ? <th className="px-4 py-3">餐廳</th> : null}
              <th className="px-4 py-3">桌號</th>
              <th className="px-4 py-3">入座 QR</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-menu-border">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={restaurants.length > 1 ? 4 : 3}
                  className="px-4 py-8 text-center text-menu-muted"
                >
                  此餐廳尚無餐桌，請於上方新增。
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="bg-menu-card">
                  {restaurants.length > 1 ? (
                    <td className="px-4 py-3 text-menu-muted">
                      {nameById[row.restaurant_id] ?? "—"}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 font-medium text-menu-ink">
                    {editingId === row.id ? (
                      <input
                        type="text"
                        value={editNumber}
                        onChange={(e) => setEditNumber(e.target.value)}
                        className="w-full min-w-[5rem] rounded-lg border border-menu-border bg-menu-bg px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
                      />
                    ) : (
                      row.table_number
                    )}
                  </td>
                  <td className="px-4 py-3 text-menu-muted">
                    請至「入座 QR」產生
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {editingId === row.id ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void saveEdit(row.id)}
                            className="rounded-lg bg-menu-cta px-2.5 py-1 text-xs font-semibold text-white hover:bg-menu-cta-hover disabled:opacity-50"
                          >
                            儲存
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-lg border border-menu-border px-2.5 py-1 text-xs font-medium text-menu-ink hover:bg-menu-surface"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={busyId !== null}
                            onClick={() => startEdit(row)}
                            className="rounded-lg border border-menu-border px-2.5 py-1 text-xs font-medium text-menu-ink hover:bg-menu-surface disabled:opacity-50"
                          >
                            改桌號
                          </button>
                          <button
                            type="button"
                            disabled={busyId !== null}
                            onClick={() => void deleteTable(row)}
                            className="rounded-lg border border-red-200 bg-red-50/80 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                          >
                            刪除
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
