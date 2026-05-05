#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// 與 Next 慣例相反：種子／SQL 相關腳本以 .env 為準（同鍵時覆寫 .env.local）
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env"), override: true });

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function getSupabaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  if (!url) die("缺少 NEXT_PUBLIC_SUPABASE_URL。");
  if (/^postgres(ql)?:/i.test(url)) {
    die(
      "NEXT_PUBLIC_SUPABASE_URL 必須是 Supabase 的 HTTPS API 網址（Dashboard → Settings → API 的 Project URL），\n" +
        "例如 https://xxxxx.supabase.co。\n\n" +
        "若你貼的是 postgresql://...pooler.supabase.com...，那是資料庫連線，請放到環境變數 DATABASE_URL，\n" +
        "不要取代 NEXT_PUBLIC_SUPABASE_URL。\n\n" +
        "若 .env 裡有空的 DATABASE_URL=，會蓋掉 .env.local 的值，請刪除空行或把完整連線字串寫進 .env。",
    );
  }
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
  if (host.endsWith(suffix)) {
    return host.slice(0, -suffix.length);
  }
  const fromEnv = process.env.SUPABASE_PROJECT_REF?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  die(
    "無法從 NEXT_PUBLIC_SUPABASE_URL 取得專案 ref（須為 *.<ref>.supabase.co）。\n\n" +
      "請擇一：\n" +
      "• 將 API 網址改回 https://<ref>.supabase.co；或\n" +
      "• 在 .env 設定 SUPABASE_PROJECT_REF=<ref>，並設定 DATABASE_URL（pooler 的 postgresql://...）；或\n" +
      "• 只使用 DATABASE_URL 跑 migration 時，仍須保留正確的 NEXT_PUBLIC_SUPABASE_URL 供 Supabase JS 使用。\n\n" +
      "切勿將 postgresql://...pooler... 設成 NEXT_PUBLIC_SUPABASE_URL。",
  );
}

function resolvePostgresUrl(supabaseUrl) {
  const explicit =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim();
  if (explicit) {
    return explicit;
  }

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

function explainPgConnectFailure(err, databaseUrl) {
  let host = null;
  try {
    host = new URL(
      databaseUrl.replace(/^postgres(ql)?:/i, "http:"),
    ).hostname;
  } catch {
    /* ignore */
  }
  const lines = [
    `無法連上 PostgreSQL：${[err.code, err.message].filter(Boolean).join(" ")}`,
    "",
    "可嘗試：",
    "• 確認 Supabase 專案未暫停、網路／VPN／DNS 正常。",
    "• 若為 ENOTFOUND：用密碼自動組出的主機 db.<專案>.supabase.co 在部分網路只有 IPv6 或解析失敗。",
    "  請到 Supabase → Project Settings → Database → Connection string 複製 URI，",
    "  在 .env 設定 DATABASE_URL=...（建議 Session pooler 或 Transaction pooler，通常有 IPv4）。",
  ];
  if (host) {
    lines.push(`  本次連線主機：${host}`);
  }
  lines.push(
    "• 密碼錯誤請對照後台 Database password，並保留 URI 附帶的 query（如 sslmode）。",
  );
  return lines.join("\n");
}

async function createPgClientConnected(databaseUrl) {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: pgSsl(databaseUrl),
  });
  try {
    await client.connect();
  } catch (err) {
    await client.end().catch(() => {});
    die(explainPgConnectFailure(err, databaseUrl));
  }
  return client;
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
  const client = await createPgClientConnected(databaseUrl);
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function ensureSchemaAndRpc(pgUrl) {
  const probe = await createPgClientConnected(pgUrl);
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
    "sql/migrate_table_sessions.sql",
    path.join(root, "sql", "migrate_table_sessions.sql"),
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
  const demoName = "示範餐廳";
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

    const { error: sessDelErr } = await supabase
      .from("table_sessions")
      .delete()
      .eq("restaurant_id", restaurantId);
    if (sessDelErr) {
      throw new Error(`清除示範入座節次失敗：${sessDelErr.message}`);
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

  const { data: tableRow, error: tblErr } = await supabase
    .from("tables")
    .insert({
      restaurant_id: rest.id,
      table_number: "A1",
    })
    .select("id")
    .single();

  if (tblErr || !tableRow) {
    throw new Error(`建立桌次失敗：${tblErr?.message ?? "無資料"}`);
  }

  const { error: sessErr } = await supabase.from("table_sessions").insert({
    table_id: tableRow.id,
    restaurant_id: rest.id,
    qr_token: qrToken,
    dining_duration_minutes: 120,
    order_window_minutes: 90,
  });
  if (sessErr) throw new Error(`建立示範入座節次失敗：${sessErr.message}`);

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
        "\n還沒建資料表，請擇一：\n\n" +
          "• 在 .env 設定 DATABASE_URL=postgresql://...（Session pooler 連線字串）；或\n" +
          "• 設定 SUPABASE_DB_PASSWORD=postgres 密碼（將組出 db.<ref>.supabase.co，僅 IPv6 網路可能連不上）。\n\n" +
          "注意：.env 若有空的 DATABASE_URL= 會蓋掉 .env.local 裡的值。\n" +
          "密碼含 # 請整串加引號：DATABASE_URL=\"postgresql://...\"\n",
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
