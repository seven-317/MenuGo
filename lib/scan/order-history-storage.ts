const KEY_PREFIX = "menugo:orders:";

export function orderHistoryStorageKey(tableId: string): string {
  return `${KEY_PREFIX}${tableId}`;
}

export function getStoredOrderIds(tableId: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(orderHistoryStorageKey(tableId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function appendStoredOrderId(tableId: string, orderId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const prev = getStoredOrderIds(tableId);
  const next = [orderId, ...prev.filter((id) => id !== orderId)].slice(0, 50);
  localStorage.setItem(orderHistoryStorageKey(tableId), JSON.stringify(next));
}
