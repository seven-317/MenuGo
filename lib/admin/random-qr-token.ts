/** 32 字元 hex，與 DB `encode(gen_random_bytes(16), 'hex')` 長度一致。 */
export function randomQrToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
