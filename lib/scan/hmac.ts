import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * QR 掃碼簽章：在伺服器端以 HMAC-SHA256(secret, token) 產生不可偽造、也不可從 URL 反推 secret 的 `sig`。
 * - 產生 QR 時（後台／Edge Function）：`signScanToken(qr_token, SCAN_HMAC_SECRET)`
 * - 完整 URL：`/scan/${token}?sig=${encodeURIComponent(signScanToken(...))}`
 *
 * 若未設定 `SCAN_HMAC_SECRET`，掃碼頁只驗證資料庫是否存在該 token（開發方便；正式環境務必設定）。
 */

export function getScanHmacSecret(): string | null {
  const s = process.env.SCAN_HMAC_SECRET;
  if (s == null || s.trim() === "") {
    return null;
  }
  return s;
}

export function signScanToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token, "utf8").digest("base64url");
}

/**
 * @param sigFromQuery - 來自 URL query `sig`（已解碼後的字串）
 */
export function verifyScanTokenSignature(
  token: string,
  sigFromQuery: string | undefined,
  secret: string | null,
): boolean {
  if (secret == null) {
    return true;
  }
  if (sigFromQuery == null || sigFromQuery === "") {
    return false;
  }
  const expected = signScanToken(token, secret);
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sigFromQuery, "utf8");
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
