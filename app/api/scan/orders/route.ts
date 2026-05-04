import { NextResponse } from "next/server";

import {
  getScanHmacSecret,
  verifyScanTokenSignature,
} from "@/lib/scan/hmac";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const QR_TOKEN_RE = /^[a-zA-Z0-9_-]{16,128}$/;

const MAX_IDS = 40;

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

type LookupBody = {
  qr_token?: unknown;
  sig?: unknown;
  order_ids?: unknown;
};

export async function POST(request: Request) {
  let body: LookupBody;
  try {
    body = (await request.json()) as LookupBody;
  } catch {
    return jsonError(400, "無法解析 JSON");
  }

  const qrToken =
    typeof body.qr_token === "string" ? body.qr_token.trim() : "";
  if (!QR_TOKEN_RE.test(qrToken)) {
    return jsonError(400, "qr_token 無效");
  }

  const hmacSecret = getScanHmacSecret();
  const sigRaw = typeof body.sig === "string" ? body.sig : "";
  const sigDecoded =
    sigRaw !== "" ? decodeURIComponent(sigRaw.trim()) : undefined;

  if (!verifyScanTokenSignature(qrToken, sigDecoded, hmacSecret)) {
    return jsonError(403, "簽章驗證失敗");
  }

  if (!Array.isArray(body.order_ids) || body.order_ids.length === 0) {
    return jsonError(400, "order_ids 必須為非空陣列");
  }

  const orderIds = body.order_ids
    .filter((x): x is string => typeof x === "string")
    .map((id) => id.trim())
    .filter((id) => UUID_RE.test(id));

  const uniqueIds = [...new Set(orderIds)].slice(0, MAX_IDS);

  if (uniqueIds.length === 0) {
    return NextResponse.json({ orders: [] });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "伺服器設定錯誤";
    return jsonError(500, msg);
  }

  const { data: table, error: tableError } = await supabaseAdmin
    .from("tables")
    .select("id")
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (tableError || table == null) {
    return jsonError(404, "找不到桌次");
  }

  const { data: orderRows, error: ordersError } = await supabaseAdmin
    .from("orders")
    .select("id, status, total_price, created_at, table_id")
    .in("id", uniqueIds)
    .eq("table_id", table.id);

  if (ordersError) {
    return jsonError(502, ordersError.message ?? "查詢訂單失敗");
  }

  const orderList = orderRows ?? [];
  const orderIdSet = new Set(orderList.map((o) => o.id));

  let linesByOrder: Record<
    string,
    { quantity: number; notes: string | null; menus: unknown }[]
  > = {};

  if (orderList.length > 0) {
    const { data: allLines, error: linesError } = await supabaseAdmin
      .from("order_items")
      .select("order_id, quantity, notes, menus(name, price)")
      .in(
        "order_id",
        orderList.map((o) => o.id),
      );

    if (linesError) {
      return jsonError(502, linesError.message ?? "查詢明細失敗");
    }

    linesByOrder = {};
    for (const row of allLines ?? []) {
      const oid = row.order_id as string;
      if (!linesByOrder[oid]) {
        linesByOrder[oid] = [];
      }
      linesByOrder[oid].push({
        quantity: Number(row.quantity),
        notes: row.notes ?? null,
        menus: row.menus,
      });
    }
  }

  const ordersOut = orderList.map((o) => {
    const lines = linesByOrder[o.id] ?? [];
    const items = lines.map((row) => {
      const embed = row.menus as
        | { name: string; price: string | number }
        | { name: string; price: string | number }[]
        | null;
      const menu = Array.isArray(embed) ? embed[0] : embed;
      const price = menu ? Number(menu.price) : 0;
      const qty = row.quantity;
      return {
        name: menu?.name ?? "品項",
        quantity: qty,
        line_total: price * qty,
      };
    });

    return {
      id: o.id,
      status: o.status,
      total_price: Number(o.total_price),
      created_at: o.created_at,
      items,
    };
  });

  const byId = Object.fromEntries(ordersOut.map((x) => [x.id, x]));
  const ordered = uniqueIds
    .filter((id) => orderIdSet.has(id))
    .map((id) => byId[id])
    .filter(Boolean);

  return NextResponse.json({ orders: ordered });
}

export function GET() {
  return jsonError(405, "僅支援 POST");
}
