import { NextResponse } from "next/server";

import { buildScanUrl, getAppOrigin } from "@/lib/scan/build-scan-url";

const TOKEN_RE = /^[a-zA-Z0-9_-]{16,128}$/;

export async function POST(request: Request) {
  let body: { qr_token?: unknown };
  try {
    body = (await request.json()) as { qr_token?: unknown };
  } catch {
    return NextResponse.json({ error: "無法解析 JSON" }, { status: 400 });
  }

  const token =
    typeof body.qr_token === "string" ? body.qr_token.trim() : "";
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "qr_token 無效" }, { status: 400 });
  }

  const url = buildScanUrl(getAppOrigin(), token);
  return NextResponse.json({ url });
}

export function GET() {
  return NextResponse.json({ error: "僅支援 POST" }, { status: 405 });
}
