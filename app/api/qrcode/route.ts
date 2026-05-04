import QRCode from "qrcode";
import { NextResponse } from "next/server";

/** `qrcode` 依賴 Node Buffer，請勿改為 Edge Runtime */
export const runtime = "nodejs";

const MAX_URL_LENGTH = 2048;
const MIN_SIZE = 120;
const MAX_SIZE = 1024;
const DEFAULT_SIZE = 320;

function clampSize(n: number): number {
  if (!Number.isFinite(n)) {
    return DEFAULT_SIZE;
  }
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.floor(n)));
}

/**
 * 只允許 http(s)，防止 javascript: 等偽協議；此處不發出 HTTP 請求，僅嵌入 QR 內容。
 */
export function parseQrTargetUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
    throw new Error("url 長度無效或過長");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("url 格式無效");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("僅支援 http 或 https");
  }

  return parsed.toString();
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

async function pngResponse(target: string, width: number) {
  const buffer = await QRCode.toBuffer(target, {
    type: "png",
    width,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#000000ff", light: "#ffffffff" },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
    },
  });
}

/**
 * GET /api/qrcode?url=<encodeURIComponent(完整網址)>&size=320
 * 回傳 PNG 圖片。
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url");
  if (raw == null || raw === "") {
    return jsonError(400, "缺少 url 查詢參數");
  }

  let target: string;
  try {
    target = parseQrTargetUrl(decodeURIComponent(raw));
  } catch (e) {
    const message = e instanceof Error ? e.message : "url 無效";
    return jsonError(400, message);
  }

  const sizeParam = searchParams.get("size");
  const width = clampSize(
    sizeParam != null && sizeParam !== "" ? Number(sizeParam) : DEFAULT_SIZE,
  );

  try {
    return await pngResponse(target, width);
  } catch {
    return jsonError(500, "產生 QR Code 失敗");
  }
}

type PostBody = {
  url?: unknown;
  size?: unknown;
};

/**
 * POST /api/qrcode
 * Body: { "url": "https://...", "size": 320 }
 * 回傳 PNG 圖片（適合較長網址，避免 query 長度限制）。
 */
export async function POST(request: Request) {
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return jsonError(400, "無法解析 JSON");
  }

  if (typeof body.url !== "string") {
    return jsonError(400, "需要 JSON 欄位 url（字串）");
  }

  let target: string;
  try {
    target = parseQrTargetUrl(body.url);
  } catch (e) {
    const message = e instanceof Error ? e.message : "url 無效";
    return jsonError(400, message);
  }

  const width =
    typeof body.size === "number" && Number.isFinite(body.size)
      ? clampSize(body.size)
      : DEFAULT_SIZE;

  try {
    return await pngResponse(target, width);
  } catch {
    return jsonError(500, "產生 QR Code 失敗");
  }
}
