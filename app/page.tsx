import Link from "next/link";

const DEMO_SCAN = {
  token: "menugo_scan_demo_a1",
  sig: "XjmNN3yrMjJVDMb-Hnjee41VuGKnWUTXwtcmsdpxH0Q",
} as const;

const demoScanHref =
  `/scan/${DEMO_SCAN.token}?sig=` + encodeURIComponent(DEMO_SCAN.sig);

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

function IconScan({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 4.5v4.5m0 6v4.5M4.5 3.75h4.5m6 0h4.5m-15 7.5h.01m5.99 0h.01m-6 7.5h.01m5.99 0h.01M19.5 3.75v4.5m0 6v4.5m-15-15h4.5m6 0h4.5"
      />
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5 14.25 3h4.5L12 10.5h6l-8.25 8.25L9 12l-5.25 1.5Z"
      />
    </svg>
  );
}

function IconCloud({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5h8.308a4.5 4.5 0 0 0 0-9 1.371 0 0 0 .013-1.5 4.5 4.5 0 0 0-8.786-1.286A4.49 4.49 0 0 0 2.25 15Z"
      />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  );
}

const navFocus =
  "rounded-xl px-3 py-2.5 text-sm font-medium text-menu-muted outline-none transition-colors duration-200 hover:bg-white/80 hover:text-menu-ink focus-visible:ring-2 focus-visible:ring-menu-cta focus-visible:ring-offset-2 focus-visible:ring-offset-menu-bg cursor-pointer";

const btnPrimary =
  "inline-flex h-12 min-h-[44px] cursor-pointer items-center justify-center rounded-2xl bg-menu-cta px-6 text-sm font-semibold text-white shadow-md outline-none transition-all duration-300 hover:-translate-y-0.5 hover:bg-menu-cta-hover hover:shadow-lg focus-visible:ring-2 focus-visible:ring-menu-cta focus-visible:ring-offset-2 focus-visible:ring-offset-menu-bg motion-safe:active:scale-[0.98]";

const btnSecondary =
  "inline-flex h-12 min-h-[44px] cursor-pointer items-center justify-center rounded-2xl border-2 border-menu-primary bg-menu-card px-6 text-sm font-semibold text-menu-primary outline-none transition-all duration-300 hover:-translate-y-0.5 hover:border-menu-primary hover:bg-menu-surface hover:shadow-md focus-visible:ring-2 focus-visible:ring-menu-primary focus-visible:ring-offset-2 focus-visible:ring-offset-menu-bg motion-safe:active:scale-[0.98]";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-col bg-menu-bg text-menu-ink">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="menu-blob absolute -right-24 -top-24 h-72 w-72 rounded-full bg-menu-primary/20 blur-3xl motion-reduce:blur-none" />
        <div className="menu-blob-alt absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-menu-cta/25 blur-3xl motion-reduce:blur-none" />
      </div>

      <header className="sticky top-0 z-50 px-3 pt-4 sm:px-6 sm:pt-5">
        <div className="menu-reveal mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl border border-menu-border bg-white/85 px-3 shadow-lg shadow-stone-900/8 backdrop-blur-md transition-shadow duration-300 hover:shadow-xl sm:h-16 sm:px-5">
          <Link
            href="/"
            className="flex cursor-pointer items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-menu-cta focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-menu-primary text-white shadow-md">
              <QrIcon className="h-5 w-5" />
            </span>
            <span className="font-menu-display text-lg font-bold tracking-tight text-menu-ink sm:text-xl">
              MenuGo
            </span>
          </Link>
          <nav
            className="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1"
            aria-label="主要導覽"
          >
            <Link href={demoScanHref} className={`${navFocus} text-menu-primary`}>
              示範掃碼
            </Link>
            <Link href="/admin" className={navFocus}>
              店家後台
            </Link>
            <a href="#features" className={navFocus}>
              功能
            </a>
            <a href="#flow" className={navFocus}>
              流程
            </a>
            <a href="#stack" className={`${navFocus} hidden sm:inline`}>
              技術
            </a>
          </nav>
        </div>
      </header>

      <main className="relative flex-1">
        <section className="relative px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14" id="top">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
            <div className="space-y-0 lg:col-span-7">
              <p
                className="menu-reveal mb-5 inline-flex items-center gap-2 rounded-full border border-menu-border bg-menu-card px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-menu-primary shadow-sm"
                style={{ animationDelay: "0.05s" }}
              >
                課程專題 · QR 無紙化點餐
              </p>
              <h1
                className="menu-reveal font-menu-display text-4xl font-bold leading-[1.1] tracking-tight text-menu-ink sm:text-5xl lg:text-6xl"
                style={{ animationDelay: "0.12s" }}
              >
                掃碼點餐，
                <span className="text-menu-primary"> 少跑一次桌邊</span>
              </h1>
              <p
                className="menu-reveal mt-6 max-w-xl text-base leading-relaxed text-menu-muted sm:text-lg"
                style={{ animationDelay: "0.2s" }}
              >
                顧客用手機看菜單、一鍵送單；店家即時掌握新訂單。適合小型餐飲與課堂實作，聚焦清楚的前後台與資料流。
              </p>
              <div
                className="menu-reveal mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
                style={{ animationDelay: "0.28s" }}
              >
                <Link href={demoScanHref} className={btnPrimary}>
                  示範掃碼點餐 · A1 桌
                </Link>
                <a href="#flow" className={btnSecondary}>
                  查看使用流程
                </a>
              </div>
            </div>

            <div
              className="menu-reveal relative lg:col-span-5"
              style={{ animationDelay: "0.35s" }}
            >
              <div className="group relative mx-auto aspect-square max-w-md transition-transform duration-500 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.01] lg:max-w-none">
                <div className="absolute inset-4 rounded-3xl bg-gradient-to-br from-menu-primary to-menu-primary/80 shadow-2xl motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-105" />
                <div className="relative flex h-full flex-col justify-between rounded-3xl border-2 border-menu-border bg-menu-card p-6 shadow-xl sm:p-8">
                  <div>
                    <p className="text-xs font-semibold text-menu-primary">
                      今日推薦
                    </p>
                    <p className="mt-1 font-menu-display text-2xl font-bold text-menu-ink">
                      示範餐廳
                    </p>
                    <p className="mt-2 text-sm text-menu-muted">桌號 A1 · 現點現做</p>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {["滷肉飯", "排骨飯", "味噌湯"].map((name) => (
                      <li
                        key={name}
                        className="flex items-center justify-between rounded-xl bg-menu-bg px-4 py-3 text-sm font-medium"
                      >
                        <span>{name}</span>
                        <span className="text-menu-cta">＋</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={demoScanHref}
                    className={`mt-6 w-full ${btnPrimary} justify-center`}
                  >
                    進入菜單
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="border-t border-menu-border bg-menu-card py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2
              className="menu-reveal font-menu-display text-3xl font-bold text-menu-ink sm:text-4xl"
              style={{ animationDelay: "0.04s" }}
            >
              核心功能
            </h2>
            <p
              className="menu-reveal mt-3 max-w-2xl text-base leading-relaxed text-menu-muted"
              style={{ animationDelay: "0.1s" }}
            >
              從掃碼到出單，拆成可維運的模組與權限邊界。
            </p>
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "匿名掃碼點餐",
                  desc: "免註冊，掃描桌號 QR 即可瀏覽菜單並送出訂單。",
                  Icon: IconScan,
                },
                {
                  title: "即時接單",
                  desc: "Realtime 監聽新訂單，後台列表即時刷新狀態。",
                  Icon: IconBolt,
                },
                {
                  title: "菜單雲端管理",
                  desc: "PostgreSQL 儲存品項，RLS 區分公開讀取與店家維護。",
                  Icon: IconCloud,
                },
                {
                  title: "桌號與安全",
                  desc: "每桌 qr_token；可搭配 HMAC 降低網址被亂試的機率。",
                  Icon: IconShield,
                },
              ].map(({ title, desc, Icon }, i) => (
                <li
                  key={title}
                  className="menu-reveal group rounded-3xl border border-menu-border bg-menu-bg p-6 transition-all duration-300 motion-safe:hover:-translate-y-1 hover:shadow-lg"
                  style={{ animationDelay: `${0.16 + i * 0.07}s` }}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-menu-primary/10 text-menu-primary transition-colors duration-200 group-hover:bg-menu-primary group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-menu-display text-lg font-bold text-menu-ink">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-menu-muted">
                    {desc}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="flow"
          className="border-t border-menu-border py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2
              className="menu-reveal font-menu-display text-3xl font-bold text-menu-ink sm:text-4xl"
              style={{ animationDelay: "0.04s" }}
            >
              使用方式
            </h2>
            <p
              className="menu-reveal mt-3 max-w-2xl text-menu-muted"
              style={{ animationDelay: "0.1s" }}
            >
              上線後顧客只會拿到店家印製的 QR；開發時可改用示範連結與種子資料。
            </p>
            <ol className="mt-12 grid gap-6 lg:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "掃描 QR",
                  desc: "開啟掃碼頁，確認餐廳名稱與桌號正確。",
                },
                {
                  step: "02",
                  title: "選擇餐點",
                  desc: "瀏覽菜單後由前端呼叫 API 建立訂單與明細。",
                },
                {
                  step: "03",
                  title: "店家接單",
                  desc: "後台即時收到新單，更新狀態並備餐。",
                },
              ].map((item, i) => (
                <li
                  key={item.step}
                  className="menu-reveal relative overflow-hidden rounded-3xl border-2 border-menu-border bg-menu-card p-8 shadow-sm transition-all duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:border-menu-primary/40 motion-safe:hover:shadow-lg"
                  style={{ animationDelay: `${0.16 + i * 0.08}s` }}
                >
                  <span className="font-menu-display text-5xl font-bold tabular-nums text-menu-primary/25">
                    {item.step}
                  </span>
                  <h3 className="mt-2 font-menu-display text-xl font-bold text-menu-ink">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-menu-muted">
                    {item.desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="stack"
          className="border-t border-menu-border bg-menu-card py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2
              className="menu-reveal font-menu-display text-3xl font-bold text-menu-ink sm:text-4xl"
              style={{ animationDelay: "0.04s" }}
            >
              技術堆疊
            </h2>
            <p
              className="menu-reveal mt-3 text-menu-muted"
              style={{ animationDelay: "0.1s" }}
            >
              Next.js App Router、Tailwind、Supabase（PostgreSQL + Realtime）。詳見 README。
            </p>
            <div className="mt-10 flex flex-wrap gap-2">
              {[
                "Next.js App Router",
                "Tailwind CSS v4",
                "Supabase · PostgreSQL",
                "Supabase Realtime",
                "TypeScript",
              ].map((tag, i) => (
                <span
                  key={tag}
                  className="menu-reveal rounded-xl border border-menu-border bg-menu-bg px-4 py-2 text-sm font-semibold text-menu-ink transition-all duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-menu-primary/35 motion-safe:hover:shadow-md"
                  style={{ animationDelay: `${0.16 + i * 0.05}s` }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <p
              className="menu-reveal mt-10 text-sm text-menu-muted"
              style={{ animationDelay: "0.42s" }}
            >
              路由範例：
              <code className="ml-2 rounded-lg bg-menu-bg px-2 py-1 font-mono text-xs text-menu-ink">
                /scan/&lt;token&gt;
              </code>
              <span className="mx-1">·</span>
              <code className="rounded-lg bg-menu-bg px-2 py-1 font-mono text-xs text-menu-ink">
                /api/order
              </code>
              <span className="mx-1">·</span>
              <code className="rounded-lg bg-menu-bg px-2 py-1 font-mono text-xs text-menu-ink">
                /api/qrcode
              </code>
            </p>
            <p className="menu-reveal mt-5" style={{ animationDelay: "0.48s" }}>
              <Link
                href={demoScanHref}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-menu-primary underline-offset-4 transition-colors hover:text-menu-cta hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-cta focus-visible:ring-offset-2 focus-visible:ring-offset-menu-card"
              >
                開啟示範掃碼頁（含 HMAC）→
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-menu-border bg-menu-ink py-10 text-stone-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm leading-relaxed text-stone-300">
            MenuGo · 學校課程專題，公開僅供繳交與參考。
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href={demoScanHref}
              className="cursor-pointer text-sm font-medium text-stone-200 underline-offset-4 transition-colors hover:text-menu-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-cta focus-visible:ring-offset-2 focus-visible:ring-offset-menu-ink"
            >
              示範掃碼
            </Link>
            <a
              href="#top"
              className="cursor-pointer text-sm font-medium text-stone-200 underline-offset-4 transition-colors hover:text-menu-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-cta focus-visible:ring-offset-2 focus-visible:ring-offset-menu-ink"
            >
              回到頂部
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
