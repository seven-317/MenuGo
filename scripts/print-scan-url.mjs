#!/usr/bin/env node
import { createHmac } from "node:crypto";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });

const token = (process.argv[2] || "menugo_scan_demo_a1").trim();
const secret = process.env.SCAN_HMAC_SECRET?.trim();
const base = (
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
).replace(/\/$/, "");

if (!secret) {
  console.log(`${base}/scan/${token}`);
  console.log("\n（未設定 SCAN_HMAC_SECRET，不需 ?sig=）");
  process.exit(0);
}

const sig = createHmac("sha256", secret)
  .update(token, "utf8")
  .digest("base64url");
console.log(`${base}/scan/${token}?sig=${encodeURIComponent(sig)}`);
console.log(
  "\n※ ?sig= 必須是上面這串，不要把 SCAN_HMAC_SECRET 原樣當成 sig。",
);
