#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function getSupabaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  if (!url) die("缺少 NEXT_PUBLIC_SUPABASE_URL。");
  return url;
}

function getServiceRoleKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    die("缺少 NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY（Supabase → Settings → API → service_role）。");
  }
  return key;
}

function supabaseProjectRef(supabaseUrl) {
  let host;
  try {
    host = new URL(supabaseUrl).hostname;
  } catch {
    die("NEXT_PUBLIC_SUPABASE_URL 不是合法網址。");
  }
  const suffix = ".supabase.co";
  if (!host.endsWith(suffix)) {
    die(
      "目前僅支援預設 Supabase 網址（*.supabase.co）。若是自訂網域請改設完整的 DATABASE_URL。",
    );
  }
  return host.slice(0, -suffix.length);
}

function resolvePostgresUrl(supabaseUrl) {
  const explicit = process.env.DATABASE_URL?.trim();
  if (explicit) return explicit;

  const pw =
    process.env.SUPABASE_DB_PASSWORD?.trim() ||
    process.env.DATABASE_PASSWORD?.trim();
  if (!pw) return null;

  const ref = supabaseProjectRef(supabaseUrl);
  const user = encodeURIComponent("postgres");
  const pass = encodeURIComponent(pw);
  return `postgresql://${user}:${pass}@db.${ref}.supabase.co:5432/postgres`;
}

function pgSsl(databaseUrl) {
  return databaseUrl.includes("localhost")
    ? undefined
    : { rejectUnauthorized: false };
}

async function schemaExists(client) {
  const { rows } = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'restaurants'
    ) AS ok
  `);
  return Boolean(rows[0]?.ok);
}

async function runSqlFilePg(databaseUrl, label, filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  console.log(`→ ${label}`);
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: pgSsl(databaseUrl),
  });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function ensureSchemaAndRpc(pgUrl) {
  const probe = new pg.Client({
    connectionString: pgUrl,
    ssl: pgSsl(pgUrl),
  });
  await probe.connect();
  let exists;
  try {
    exists = await schemaExists(probe);
  } finally {
    await probe.end();
  }

  if (!exists) {
    console.log("→ 偵測到尚未建表，執行 sql/schema.sql …");
    await runSqlFilePg(
      pgUrl,
      "sql/schema.sql",
      path.join(root, "sql", "schema.sql"),
    );
  } else {
    console.log("→ 資料表已存在，跳過 schema.sql");
  }

  await runSqlFilePg(
    pgUrl,
    "sql/migrate_tables_rls_rpc.sql",
    path.join(root, "sql", "migrate_tables_rls_rpc.sql"),
  );

  await runSqlFilePg(
    pgUrl,
    "sql/rpc_create_customer_order.sql",
    path.join(root, "sql", "rpc_create_customer_order.sql"),
  );
}

async function resolveOwnerId(supabase) {
  const idOpt = process.env.DEMO_OWNER_ID?.trim();
  if (idOpt) return idOpt;

  const emailOpt = process.env.DEMO_OWNER_EMAIL?.trim();
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) {
    die(`無法讀取 Auth 使用者：${error.message}`);
  }
  const users = data?.users ?? [];
  if (users.length === 0) {
    die("專案裡還沒有任何 Auth 使用者。請到 Supabase → Authentication 先註冊一個帳號，再執行 npm run setup。");
  }

  if (emailOpt) {
    const u = users.find(
      (x) => x.email?.toLowerCase() === emailOpt.toLowerCase(),
    );
    if (!u) die(`找不到信箱 ${emailOpt} 的帳號，請改 DEMO_OWNER_EMAIL 或先註冊。`);
    return u.id;
  }

  const first = users[0];
  console.log(
    `→ 未設定 DEMO_OWNER，使用 Auth 第一位使用者當店長：${first.email ?? "(無信箱)"} / ${first.id}`,
  );
  return first.id;
}

async function tablesReachable(supabase) {
  const { error } = await supabase.from("restaurants").select("id").limit(1);
  return !error;
}

async function seedDemo(supabase, ownerId) {
  const demoName = "示範餐廳 MenuGo Demo";
  const qrToken = "menugo_scan_demo_a1";

  const { data: existingRestaurants } = await supabase
    .from("restaurants")
    .select("id")
    .eq("name", demoName);

  const demoRestaurantIds = (existingRestaurants ?? []).map((r) => r.id);

  for (const restaurantId of demoRestaurantIds) {
    const { data: orderRows, error: orderListErr } = await supabase
      .from("orders")
      .select("id")
      .eq("restaurant_id", restaurantId);
    if (orderListErr) {
      throw new Error(`讀取示範訂單失敗：${orderListErr.message}`);
    }

    const orderIds = (orderRows ?? []).map((o) => o.id);
    if (orderIds.length > 0) {
      const { error: oiErr } = await supabase
        .from("order_items")
        .delete()
        .in("order_id", orderIds);
      if (oiErr) {
        throw new Error(`清除示範訂單明細失敗：${oiErr.message}`);
      }
    }

    const { error: ordDelErr } = await supabase
      .from("orders")
      .delete()
      .eq("restaurant_id", restaurantId);
    if (ordDelErr) {
      throw new Error(`清除示範訂單失敗：${ordDelErr.message}`);
    }

    const { error: tblDelErr } = await supabase
      .from("tables")
      .delete()
      .eq("restaurant_id", restaurantId);
    if (tblDelErr) {
      throw new Error(`清除示範桌次失敗：${tblDelErr.message}`);
    }

    const { error: menuDelErr } = await supabase
      .from("menus")
      .delete()
      .eq("restaurant_id", restaurantId);
    if (menuDelErr) {
      throw new Error(`清除示範菜單失敗：${menuDelErr.message}`);
    }
  }

  const { error: delErr } = await supabase
    .from("restaurants")
    .delete()
    .eq("name", demoName);
  if (delErr) throw new Error(`清除舊示範餐廳失敗：${delErr.message}`);

  const { data: rest, error: insRest } = await supabase
    .from("restaurants")
    .insert({ name: demoName, owner_id: ownerId })
    .select("id")
    .single();

  if (insRest || !rest) {
    throw new Error(`建立餐廳失敗：${insRest?.message ?? "無資料"}`);
  }

  const { error: tblErr } = await supabase.from("tables").insert({
    restaurant_id: rest.id,
    table_number: "A1",
    qr_token: qrToken,
  });
  if (tblErr) throw new Error(`建立桌次失敗：${tblErr.message}`);

  const menuRows = [
    {
      restaurant_id: rest.id,
      name: "滷肉飯",
      price: 65,
      category: "主食",
      status: "available",
      description: "示範用：肥肉與醬汁",
    },
    {
      restaurant_id: rest.id,
      name: "排骨飯",
      price: 95,
      category: "主食",
      status: "available",
      description: "示範用：酥炸排骨",
    },
    {
      restaurant_id: rest.id,
      name: "荷包蛋",
      price: 15,
      category: "小菜",
      status: "available",
      description: "單點加蛋",
    },
    {
      restaurant_id: rest.id,
      name: "味噌湯",
      price: 35,
      category: "湯品",
      status: "available",
      description: "每日現煮",
    },
    {
      restaurant_id: rest.id,
      name: "停售品項（測試）",
      price: 999,
      category: "其他",
      status: "sold_out",
      description: "不應出現在顧客掃碼頁",
    },
  ];

  const { error: menuErr } = await supabase.from("menus").insert(menuRows);
  if (menuErr) throw new Error(`建立菜單失敗：${menuErr.message}`);
}

function scanUrlHint() {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}/scan/menugo_scan_demo_a1`;
}

async function main() {
  const url = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();
  const pgUrl = resolvePostgresUrl(url);

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (pgUrl) {
    await ensureSchemaAndRpc(pgUrl);
  } else {
    const ok = await tablesReachable(supabase);
    if (!ok) {
      die(
        "\n還沒建資料表，請在 .env.local 加一行（Supabase 後台 → Database → 資料庫密碼）：\n\n" +
          "  SUPABASE_DB_PASSWORD=你的密碼\n\n" +
          "存檔後再執行：npm run setup\n\n" +
          "（這個密碼是建立專案時設的 postgres 密碼，不是 anon / service_role JWT。）\n",
      );
    }
    console.log(
      "→ 未設定 SUPABASE_DB_PASSWORD，略過執行 schema／RPC 檔（假設你已經在後台跑過 SQL）。",
    );
  }

  const ownerId = await resolveOwnerId(supabase);
  console.log("→ 寫入示範餐廳／桌次／菜單…");
  await seedDemo(supabase, ownerId);

  console.log("\n完成。");
  console.log("掃碼（沒開 SCAN_HMAC_SECRET 時）：", scanUrlHint());
  if (process.env.SCAN_HMAC_SECRET?.trim()) {
    console.log("有 SCAN_HMAC_SECRET 時網址要加 ?sig=（lib/scan/hmac.ts）。");
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
