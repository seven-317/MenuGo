"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type AdminMenuRow = {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  category: string | null;
  status: string;
  description: string | null;
  image_url: string | null;
};

type RestaurantOption = { id: string; name: string };

type AdminMenusClientProps = {
  restaurants: RestaurantOption[];
  menus: AdminMenuRow[];
  userEmail: string | undefined;
};

const moneyTwd = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  minimumFractionDigits: 0,
});

const MENU_STATUSES = [
  { value: "available", label: "上架（顧客可點）" },
  { value: "sold_out", label: "停售（掃碼頁不顯示）" },
] as const;

export function AdminMenusClient({
  restaurants,
  menus: initialMenus,
  userEmail,
}: AdminMenusClientProps) {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState(restaurants[0]?.id ?? "");
  const [menus, setMenus] = useState(initialMenus);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    price: "",
    category: "",
    status: "available",
    description: "",
    image_url: "",
  });
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    category: "",
    status: "available" as string,
    description: "",
    image_url: "",
  });

  useEffect(() => {
    setMenus(initialMenus);
  }, [initialMenus]);

  const nameById = useMemo(
    () => Object.fromEntries(restaurants.map((r) => [r.id, r.name])),
    [restaurants],
  );

  const filtered = useMemo(
    () => menus.filter((m) => m.restaurant_id === restaurantId),
    [menus, restaurantId],
  );

  const refresh = () => router.refresh();

  const startEdit = (row: AdminMenuRow) => {
    setEditingId(row.id);
    setDraft({
      name: row.name,
      price: String(row.price),
      category: row.category ?? "",
      status: row.status,
      description: row.description ?? "",
      image_url: row.image_url ?? "",
    });
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    const name = draft.name.trim();
    if (!name) {
      setMessage("品名不可為空");
      return;
    }
    const priceNum = Number(draft.price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setMessage("請輸入有效的價格");
      return;
    }
    setBusyId(id);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("menus")
      .update({
        name,
        price: priceNum,
        category: draft.category.trim() || null,
        status: draft.status,
        description: draft.description.trim() || null,
        image_url: draft.image_url.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMenus((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              name,
              price: priceNum,
              category: draft.category.trim() || null,
              status: draft.status,
              description: draft.description.trim() || null,
              image_url: draft.image_url.trim() || null,
            }
          : m,
      ),
    );
    cancelEdit();
    refresh();
  };

  const addMenu = async () => {
    const name = newItem.name.trim();
    if (!name || !restaurantId) {
      setMessage("請選擇餐廳並輸入品名");
      return;
    }
    const priceNum = Number(newItem.price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setMessage("請輸入有效的價格");
      return;
    }
    setBusyId("__add__");
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("menus")
      .insert({
        restaurant_id: restaurantId,
        name,
        price: priceNum,
        category: newItem.category.trim() || null,
        status: newItem.status,
        description: newItem.description.trim() || null,
        image_url: newItem.image_url.trim() || null,
      })
      .select(
        "id, restaurant_id, name, price, category, status, description, image_url",
      )
      .single();
    setBusyId(null);
    if (error || !data) {
      setMessage(error?.message ?? "新增失敗");
      return;
    }
    setMenus((prev) => [
      ...prev,
      { ...(data as AdminMenuRow), price: Number(data.price) },
    ]);
    setNewItem({
      name: "",
      price: "",
      category: "",
      status: "available",
      description: "",
      image_url: "",
    });
    refresh();
  };

  const deleteMenu = async (row: AdminMenuRow) => {
    if (!window.confirm(`刪除餐點「${row.name}」？若有訂單引用則無法刪除。`)) {
      return;
    }
    setBusyId(row.id);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("menus").delete().eq("id", row.id);
    setBusyId(null);
    if (error) {
      setMessage(
        error.message.includes("foreign key") || error.code === "23503"
          ? "無法刪除：此品項仍出現在某些訂單中。"
          : error.message,
      );
      return;
    }
    setMenus((prev) => prev.filter((m) => m.id !== row.id));
    cancelEdit();
    refresh();
  };

  if (!restaurantId) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-menu-muted">
            {userEmail ? `已登入：${userEmail}` : "已登入"}
          </p>
          <h1 className="font-menu-display text-2xl font-bold text-menu-ink sm:text-3xl">
            管理餐點
          </h1>
          <p className="mt-1 text-sm text-menu-muted">
            維護菜單價格、分類與上下架；停售品項不會出現在顧客掃碼頁。
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
            href="/admin/qr"
            className="rounded-xl border border-menu-primary/40 bg-menu-primary/10 px-4 py-2 text-sm font-semibold text-menu-primary transition-colors hover:bg-menu-primary/20"
          >
            點餐 QR
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
          新增餐點
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-menu-ink sm:col-span-2">
            品名
            <input
              type="text"
              value={newItem.name}
              onChange={(e) =>
                setNewItem((s) => ({ ...s, name: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-4 py-2.5 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            />
          </label>
          <label className="block text-sm font-medium text-menu-ink">
            價格（TWD）
            <input
              type="number"
              min={0}
              step={1}
              value={newItem.price}
              onChange={(e) =>
                setNewItem((s) => ({ ...s, price: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-4 py-2.5 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            />
          </label>
          <label className="block text-sm font-medium text-menu-ink">
            分類
            <input
              type="text"
              value={newItem.category}
              onChange={(e) =>
                setNewItem((s) => ({ ...s, category: e.target.value }))
              }
              placeholder="例如：主食"
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-4 py-2.5 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            />
          </label>
          <label className="block text-sm font-medium text-menu-ink">
            狀態
            <select
              value={newItem.status}
              onChange={(e) =>
                setNewItem((s) => ({ ...s, status: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-4 py-2.5 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            >
              {MENU_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-menu-ink sm:col-span-2">
            圖片網址（選填）
            <input
              type="url"
              value={newItem.image_url}
              onChange={(e) =>
                setNewItem((s) => ({ ...s, image_url: e.target.value }))
              }
              placeholder="https://…"
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-4 py-2.5 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            />
          </label>
          <label className="block text-sm font-medium text-menu-ink sm:col-span-2">
            描述（選填）
            <textarea
              value={newItem.description}
              onChange={(e) =>
                setNewItem((s) => ({ ...s, description: e.target.value }))
              }
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-menu-border bg-menu-bg px-4 py-2.5 text-menu-ink outline-none focus-visible:ring-2 focus-visible:ring-menu-cta"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busyId === "__add__"}
          onClick={() => void addMenu()}
          className="mt-4 rounded-xl bg-menu-cta px-5 py-2.5 text-sm font-semibold text-white hover:bg-menu-cta-hover disabled:opacity-50"
        >
          {busyId === "__add__" ? "新增中…" : "新增餐點"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-menu-border bg-menu-card shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-menu-border bg-menu-bg/80 text-xs uppercase tracking-wide text-menu-muted">
            <tr>
              {restaurants.length > 1 ? <th className="px-3 py-3">餐廳</th> : null}
              <th className="px-3 py-3">品名</th>
              <th className="px-3 py-3">價格</th>
              <th className="px-3 py-3">分類</th>
              <th className="px-3 py-3">狀態</th>
              <th className="px-3 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-menu-border">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={restaurants.length > 1 ? 6 : 5}
                  className="px-4 py-8 text-center text-menu-muted"
                >
                  此餐廳尚無餐點，請於上方新增。
                </td>
              </tr>
            ) : (
              filtered.map((row) =>
                editingId === row.id ? (
                  <tr key={row.id} className="bg-menu-primary/5">
                    {restaurants.length > 1 ? (
                      <td className="px-3 py-3 text-menu-muted">
                        {nameById[row.restaurant_id] ?? "—"}
                      </td>
                    ) : null}
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, name: e.target.value }))
                        }
                        className="w-full rounded-lg border border-menu-border bg-menu-bg px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={draft.price}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, price: e.target.value }))
                        }
                        className="w-24 rounded-lg border border-menu-border bg-menu-bg px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <input
                        type="text"
                        value={draft.category}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, category: e.target.value }))
                        }
                        className="w-full min-w-[5rem] rounded-lg border border-menu-border bg-menu-bg px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, status: e.target.value }))
                        }
                        className="w-full min-w-[7rem] rounded-lg border border-menu-border bg-menu-bg px-2 py-1.5 text-xs"
                      >
                        {MENU_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col items-end gap-2">
                        <textarea
                          value={draft.description}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              description: e.target.value,
                            }))
                          }
                          rows={2}
                          placeholder="描述"
                          className="w-full max-w-[14rem] rounded-lg border border-menu-border bg-menu-bg px-2 py-1.5 text-xs"
                        />
                        <input
                          type="url"
                          value={draft.image_url}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              image_url: e.target.value,
                            }))
                          }
                          placeholder="圖片 URL"
                          className="w-full max-w-[14rem] rounded-lg border border-menu-border bg-menu-bg px-2 py-1.5 text-xs"
                        />
                        <div className="flex gap-1">
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
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} className="bg-menu-card">
                    {restaurants.length > 1 ? (
                      <td className="px-3 py-3 text-menu-muted">
                        {nameById[row.restaurant_id] ?? "—"}
                      </td>
                    ) : null}
                    <td className="px-3 py-3 font-medium text-menu-ink">
                      {row.name}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-menu-ink">
                      {moneyTwd.format(row.price)}
                    </td>
                    <td className="px-3 py-3 text-menu-muted">
                      {row.category ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          row.status === "available"
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900"
                            : row.status === "sold_out"
                              ? "rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800"
                              : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
                        }
                      >
                        {row.status === "available"
                          ? "上架"
                          : row.status === "sold_out"
                            ? "停售"
                            : row.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => startEdit(row)}
                          className="rounded-lg border border-menu-border px-2.5 py-1 text-xs font-medium text-menu-ink hover:bg-menu-surface disabled:opacity-50"
                        >
                          編輯
                        </button>
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => void deleteMenu(row)}
                          className="rounded-lg border border-red-200 bg-red-50/80 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
