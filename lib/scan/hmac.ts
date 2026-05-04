import { createHmac, timingSafeEqual } from "node:crypto";

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
