import Link from "next/link";

function QrIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm8-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm11 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight text-zinc-900 dark:text-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <QrIcon className="h-5 w-5" />
            </span>
            MenuGo
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <a
              href="#features"
              className="rounded-lg px-3 py-2 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              功能
            </a>
            <a
              href="#flow"
              className="rounded-lg px-3 py-2 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              使用方式
            </a>
            <a
              href="#stack"
              className="rounded-lg px-3 py-2 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              技術
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-zinc-200/80 dark:border-zinc-800">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.18),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              課程專題 · 無紙化點餐
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
              掃碼點餐，
              <span className="text-emerald-600 dark:text-emerald-400">
                少跑一次桌邊
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              MenuGo 讓顧客用手機看菜單、送訂單；店家在後台即時看到新單，減少重複確認與手寫單據，適合小型餐飲場景的練習實作。
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="#flow"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                顧客怎麼用
              </a>
              <a
                href="#stack"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                開發者總覽
              </a>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="border-b border-zinc-200/80 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900/40 sm:py-20"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">
              核心功能
            </h2>
            <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
              從掃碼到出單，把「點餐」拆成清楚的前後台與資料流。
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "匿名掃碼點餐",
                  desc: "無需註冊，掃描桌號 QR 即可瀏覽菜單並送出訂單。",
                },
                {
                  title: "即時接單",
                  desc: "透過 Supabase Realtime 監聽新訂單，後台列表即時更新。",
                },
                {
                  title: "菜單雲端管理",
                  desc: "菜單與價格存在 PostgreSQL，並以 RLS 區分顧客讀取與店家維護。",
                },
                {
                  title: "桌號與安全",
                  desc: "每桌專屬 qr_token；可選 HMAC 簽章降低網址被亂試的風險。",
                },
              ].map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60"
                >
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {item.desc}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="flow"
          className="border-b border-zinc-200/80 py-16 dark:border-zinc-800 sm:py-20"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">
              使用方式
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              實際上線時，顧客只會拿到店家印出的 QR；本機開發需自行準備合法 token
              與環境。
            </p>
            <ol className="mt-10 grid gap-6 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "掃描 QR",
                  desc: "開啟掃碼頁（例如 /scan/[token]），確認為正確餐廳與桌號。",
                },
                {
                  step: "02",
                  title: "選擇餐點",
                  desc: "瀏覽菜單、加入購物概念後，由前端呼叫 API 建立訂單與明細。",
                },
                {
                  step: "03",
                  title: "店家接單",
                  desc: "後台即時收到新單，可將狀態更新為已接單並備餐。",
                },
              ].map((item) => (
                <li
                  key={item.step}
                  className="relative rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900/60"
                >
                  <span className="text-3xl font-bold tabular-nums text-emerald-600/90 dark:text-emerald-400/90">
                    {item.step}
                  </span>
                  <h3 className="mt-3 font-semibold text-zinc-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {item.desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="stack" className="bg-white py-16 dark:bg-zinc-900/40 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">
              技術堆疊
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              專案資料夾內含 API、掃碼頁與 SQL 範例；詳見 README。
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                "Next.js App Router",
                "Tailwind CSS v4",
                "Supabase（PostgreSQL）",
                "Supabase Realtime",
                "TypeScript",
              ].map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-500">
              路由範例：
              <code className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                /scan/&lt;token&gt;
              </code>
              、
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                /api/order
              </code>
              、
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                /api/qrcode
              </code>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white py-8 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 text-center text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left">
          <span>MenuGo · 學校課程專題，公開僅供繳交與參考。</span>
          <Link
            href="/"
            className="text-zinc-600 underline-offset-4 hover:text-emerald-600 hover:underline dark:text-zinc-400 dark:hover:text-emerald-400"
          >
            回到頂部
          </Link>
        </div>
      </footer>
    </div>
  );
}
