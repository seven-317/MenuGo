/**
 * 固定數字格式，避免 `toLocaleString` 在 Node 與瀏覽器輸出微差造成 hydration 錯誤。
 * 以 ISO 字串在「傳入端」解讀（掃碼頁於伺服器組字，再當 props 給 Client Component）。
 */
export function formatSessionDeadlineLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const min = d.getMinutes();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${y}/${mo}/${day} ${pad(h)}:${pad(min)}`;
}
