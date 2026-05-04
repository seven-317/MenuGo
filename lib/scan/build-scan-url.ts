import { getScanHmacSecret, signScanToken } from "@/lib/scan/hmac";

export function getAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/\/$/, "");
    return host.startsWith("http") ? host : `https://${host}`;
  }
  return "http://localhost:3000";
}

export function buildScanUrl(origin: string, qrToken: string): string {
  const base = origin.replace(/\/$/, "");
  const enc = encodeURIComponent(qrToken);
  const secret = getScanHmacSecret();
  if (secret) {
    const sig = signScanToken(qrToken, secret);
    return `${base}/scan/${enc}?sig=${encodeURIComponent(sig)}`;
  }
  return `${base}/scan/${enc}`;
}
