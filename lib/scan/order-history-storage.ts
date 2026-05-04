const KEY_PREFIX = "menugo:orders:";

export function orderHistoryStorageKey(sessionId: string): string {
  return `${KEY_PREFIX}${sessionId}`;
}

export function getStoredOrderIds(sessionId: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(orderHistoryStorageKey(sessionId));
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

export function appendStoredOrderId(
  sessionId: string,
  orderId: string,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const prev = getStoredOrderIds(sessionId);
  const next = [orderId, ...prev.filter((id) => id !== orderId)].slice(0, 50);
  localStorage.setItem(orderHistoryStorageKey(sessionId), JSON.stringify(next));
}
