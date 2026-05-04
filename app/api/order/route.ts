import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

type CartItemPayload = {
  menu_id?: unknown;
  quantity?: unknown;
  notes?: unknown;
};

type CreateOrderBody = {
  table_session_id?: unknown;
  cart?: unknown;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function validateCart(raw: unknown): CartItemPayload[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("cart 必須為至少一筆品項的陣列");
  }

  return raw.map((item, index) => {
    if (item === null || typeof item !== "object") {
      throw new Error(`cart[${index}] 必須為物件`);
    }
    const row = item as CartItemPayload;
    if (typeof row.menu_id !== "string" || !isUuid(row.menu_id)) {
      throw new Error(`cart[${index}].menu_id 必須為有效的 UUID`);
    }
    if (typeof row.quantity !== "number" || !Number.isInteger(row.quantity)) {
      throw new Error(`cart[${index}].quantity 必須為整數`);
    }
    if (row.quantity <= 0) {
      throw new Error(`cart[${index}].quantity 必須大於 0`);
    }
    if (
      row.notes !== undefined &&
      row.notes !== null &&
      typeof row.notes !== "string"
    ) {
      throw new Error(`cart[${index}].notes 必須為字串或省略`);
    }
    return row;
  });
}

export async function POST(request: Request) {
  let body: CreateOrderBody;

  try {
    body = (await request.json()) as CreateOrderBody;
  } catch {
    return jsonError(400, "無法解析 JSON 內容");
  }

  const tableSessionId =
    typeof body.table_session_id === "string"
      ? body.table_session_id.trim()
      : "";

  if (!tableSessionId || !isUuid(tableSessionId)) {
    return jsonError(400, "table_session_id 為必填且須為有效的 UUID");
  }

  let cartPayload: { menu_id: string; quantity: number; notes?: string }[];

  try {
    const validated = validateCart(body.cart);
    cartPayload = validated.map((row) => ({
      menu_id: row.menu_id as string,
      quantity: row.quantity as number,
      ...(typeof row.notes === "string" && row.notes.length > 0
        ? { notes: row.notes }
        : {}),
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : "cart 驗證失敗";
    return jsonError(400, message);
  }

  let supabase;

  try {
    supabase = await createSupabaseRouteHandlerClient();
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Supabase 設定錯誤";
    return jsonError(500, message);
  }

  const { data, error } = await supabase.rpc("create_customer_order", {
    p_table_session_id: tableSessionId,
    p_items: cartPayload,
  });

  if (error) {
    const msg = error.message ?? "建立訂單失敗";
    const code = error.code;

    if (
      code === "P0001" ||
      /cart must|table session|session expired|ordering window|menu not found|invalid menu_id|invalid quantity|quantity must/i.test(
        msg,
      )
    ) {
      return jsonError(400, msg);
    }

    return jsonError(502, msg);
  }

  if (!data || typeof data !== "string") {
    return jsonError(502, "建立訂單成功但未回傳訂單 ID");
  }

  return NextResponse.json({ order_id: data });
}

export function GET() {
  return jsonError(405, "僅支援 POST");
}
