#!/usr/bin/env node

/**
 * MenuGo 資料庫一鍵設定
 *
 * 需要（寫在 .env.local 或 .env）：
 * - DATABASE_URL：Supabase → Project Settings → Database → Connection string → URI（含 postgres 密碼）
 * - DEMO_OWNER_EMAIL 或 DEMO_OWNER_ID：示範餐廳擁有者（auth.users）
 *
 * 用法：
 *   npm run setup              # 更新 RPC + 寫入示範餐廳／桌／菜單（需已手動跑過 schema）
 *   npm run setup:migrate      # 在「空資料庫」上執行 sql/schema.sql + rpc + 種子（若表已存在會失敗）
 */

import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const migrate = process.argv.includes("--migrate");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

async function resolveOwnerId(client) {
  const explicit = process.env.DEMO_OWNER_ID?.trim();
  if (explicit) {
    return explicit;
  }
  const email = process.env.DEMO_OWNER_EMAIL?.trim();
  if (!email) {
    die(
      "請在 .env 設定 DEMO_OWNER_ID（uuid）或 DEMO_OWNER_EMAIL（與 Supabase Auth 註冊信箱相同）",
    );
  }
  const { rows } = await client.query(
    "SELECT id FROM auth.users WHERE email = $1 LIMIT 1",
    [email],
  );
  if (!rows[0]) {
    die(
      `找不到 auth.users 中 email=${email} 的帳號。請先到 Authentication → Users 註冊，或改用 DEMO_OWNER_ID。`,
    );
  }
  return rows[0].id;
}

async function assertSchemaExists(client) {
  const { rows } = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'restaurants'
    ) AS ok
  `);
  if (!rows[0]?.ok) {
    die(
      "尚未建立資料表。請執行 npm run setup:migrate（僅限空 DB），或手動在 Supabase 執行 sql/schema.sql。",
    );
  }
}

async function runSqlFile(client, label, filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  console.log(`→ ${label}`);
  await client.query(sql);
}

async function seedDemo(client, ownerId) {
  const demoName = "示範餐廳 MenuGo Demo";
  const qrToken = "menugo_scan_demo_a1";

  await client.query("BEGIN");
  try {
    await client.query(`DELETE FROM public.restaurants WHERE name = $1`, [
      demoName,
    ]);

    const { rows: rRows } = await client.query(
      `INSERT INTO public.restaurants (name, owner_id) VALUES ($1, $2) RETURNING id`,
      [demoName, ownerId],
    );
    const restaurantId = rRows[0].id;

    await client.query(
      `INSERT INTO public."tables" (restaurant_id, table_number, qr_token) VALUES ($1, $2, $3)`,
      [restaurantId, "A1", qrToken],
    );

    const menus = [
      ["滷肉飯", 65, "主食", "available", "示範用：肥肉與醬汁"],
      ["排骨飯", 95, "主食", "available", "示範用：酥炸排骨"],
      ["荷包蛋", 15, "小菜", "available", "單點加蛋"],
      ["味噌湯", 35, "湯品", "available", "每日現煮"],
      ["停售品項（測試）", 999, "其他", "sold_out", "不應出現在顧客掃碼頁"],
    ];

    for (const [name, price, category, status, description] of menus) {
      await client.query(
        `INSERT INTO public.menus (restaurant_id, name, price, category, status, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [restaurantId, name, price, category, status, description],
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

function scanUrlHint() {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}/scan/menugo_scan_demo_a1`;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    die(
      "缺少 DATABASE_URL。\n" +
        "到 Supabase → Project Settings → Database → Connection string，\n" +
        "選 URI，把完整字串（含密碼）寫進 .env.local。",
    );
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost")
      ? undefined
      : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    if (migrate) {
      await runSqlFile(
        client,
        "sql/schema.sql（首次建庫；若表已存在會報錯）",
        path.join(root, "sql", "schema.sql"),
      );
      await runSqlFile(
        client,
        "sql/rpc_create_customer_order.sql",
        path.join(root, "sql", "rpc_create_customer_order.sql"),
      );
    } else {
      await assertSchemaExists(client);
      await runSqlFile(
        client,
        "sql/rpc_create_customer_order.sql（可重複執行）",
        path.join(root, "sql", "rpc_create_customer_order.sql"),
      );
    }

    const ownerId = await resolveOwnerId(client);
    console.log("→ 寫入示範餐廳／桌次／菜單…");
    await seedDemo(client, ownerId);

    console.log("\n完成。");
    console.log("掃碼測試網址（未設 SCAN_HMAC_SECRET 時）：", scanUrlHint());
    console.log(
      "若已設 SCAN_HMAC_SECRET，請用 signScanToken 產生 ?sig= 一併加到網址。",
    );
    console.log(
      "即時接單請在 Supabase Replication 開啟 public.orders 的 Realtime。",
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
