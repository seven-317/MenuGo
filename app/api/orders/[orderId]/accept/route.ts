import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;

  if (!orderId || !UUID_RE.test(orderId)) {
    return jsonError(400, "orderId 必須為有效的 UUID");
  }

  let supabase;
  try {
    supabase = await createSupabaseRouteHandlerClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Supabase 設定錯誤";
    return jsonError(500, message);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError(401, "請先登入餐廳管理帳號");
  }

  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("id")
    .maybeSingle();

  if (error) {
    return jsonError(502, error.message ?? "更新訂單失敗");
  }

  if (!data) {
    return jsonError(
      404,
      "找不到訂單或無權限（僅該餐廳擁有者可接單）",
    );
  }

  return NextResponse.json({ ok: true, order_id: data.id });
}
