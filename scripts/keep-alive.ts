import { createClient } from "@supabase/supabase-js";

// 從環境變數獲取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("缺少必要的環境變數");
  process.exit(1);
}

// 建立 Supabase 用戶端
const supabase = createClient(supabaseUrl, supabaseKey);

async function keepAlive() {
  console.log(`[${new Date().toISOString()}] 開始執行保活任務`);
  
  let successCount = 0;
  const operations = [];
  
  // 方法 1: 使用 Supabase Storage API 健康檢查
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Storage API 檢查錯誤:", error);
      operations.push({ method: "Storage API check", success: false, error: error.message });
    } else {
      console.log(`[${new Date().toISOString()}] Storage API 檢查成功，Buckets 數量: ${data?.length || 0}`);
      operations.push({ method: "Storage API check", success: true });
      successCount++;
    }
  } catch (error) {
    console.error("Storage API 異常:", error);
    operations.push({ method: "Storage API check", success: false, error: String(error) });
  }
  
  // 方法 2: 建立一個臨時的查詢來保活
  try {
    // 嘗試查詢一個不存在的表，這足以保持連線活躍
    const { data, error } = await supabase
      .from(`_keep_alive_test_${Date.now()}`)
      .select('*')
      .limit(1);
    
    // 預期會報錯（表不存在），但這足以保持連線活躍
    if (error && error.code === '42P01') {
      console.log(`[${new Date().toISOString()}] 保活查詢執行成功（預期的表不存在錯誤）`);
      operations.push({ method: "Keep-alive query", success: true });
      successCount++;
    } else if (error) {
      console.error("保活查詢錯誤:", error);
      operations.push({ method: "Keep-alive query", success: false, error: error.message });
    } else {
      console.log(`[${new Date().toISOString()}] 保活查詢意外成功`);
      operations.push({ method: "Keep-alive query", success: true });
      successCount++;
    }
  } catch (error) {
    console.error("保活查詢異常:", error);
    operations.push({ method: "Keep-alive query", success: false, error: String(error) });
  }
  
  // 方法 3: Auth API 健康檢查
  try {
    const { error } = await supabase.auth.getUser();
    
    if (error && error.message !== 'Auth session missing!') {
      console.error("Auth API 檢查錯誤:", error);
      operations.push({ method: "Auth API check", success: false, error: error.message });
    } else {
      console.log(`[${new Date().toISOString()}] Auth API 檢查成功`);
      operations.push({ method: "Auth API check", success: true });
      successCount++;
    }
  } catch (error) {
    console.error("Auth API 異常:", error);
    operations.push({ method: "Auth API check", success: false, error: String(error) });
  }
  
  // 總結
  console.log(`[${new Date().toISOString()}] 保活任務執行完成`);
  console.log(`成功操作數: ${successCount}/${operations.length}`);
  console.log("操作詳情:", JSON.stringify(operations, null, 2));
  
  // 只要有一個操作成功就認為保活成功
  if (successCount === 0) {
    console.error("所有保活操作都失敗了");
    process.exit(1);
  }
}

// 執行保活任務
keepAlive()
  .then(() => {
    console.log("保活腳本執行成功");
    process.exit(0);
  })
  .catch((error) => {
    console.error("保活腳本執行失敗:", error);
    process.exit(1);
  });