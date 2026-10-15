import { daysLeft, statusLabel, statusOf, URGENT_DAYS, type Category, type DateType, type Location, type PantryItem } from "@/lib/pantry-data";

// Notifications are DERIVED from live pantry state: there is no backend, no storage and no
// read/unread state by design. Items change as dates pass, so a stored "read" flag would go stale.
// The inclusion rule matches `isUrgent` (missing/invalid date, or days <= URGENT_DAYS) but takes
// an explicit `now`, so the derivation is deterministic and unit-testable.

export type NotificationKind = "expired" | "today" | "soon" | "invalid";
export type NotificationGroupKey = "expired" | "soon" | "invalid";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  itemId: string;
  name: string;
  /** Whole days until expiry (negative when overdue); null when the date is missing/invalid. */
  days: number | null;
  dateType: DateType;
  category: Category;
  location: Location;
  /** Ready-to-render detail, e.g. "lewat tanggal pakai 2 hari". */
  detail: string;
  /** `${name} · ${detail}` */
  text: string;
}

const KIND_ORDER: Record<NotificationKind, number> = { expired: 0, today: 1, soon: 2, invalid: 3 };

function kindOf(days: number | null): NotificationKind {
  const s = statusOf(days);
  if (s === "past") return "expired";
  if (s === "today") return "today";
  if (s === "invalid") return "invalid";
  // "soon", plus "ok" in the unlikely case URGENT_DAYS ever exceeds statusOf's cutoff.
  return "soon";
}

function detailOf(kind: NotificationKind, days: number | null, dateType: DateType): string {
  if (kind === "invalid" || days === null) return statusLabel(null, dateType);
  if (kind === "expired") {
    const label = statusLabel(days, dateType);
    return `${label.charAt(0).toLowerCase()}${label.slice(1)} ${-days} hari`;
  }
  const lead = dateType === "best_before" ? "baik sebelum" : "kedaluwarsa";
  if (kind === "today") return `${lead} hari ini`;
  return days === 1 ? `${lead} besok` : `${lead} ${days} hari lagi`;
}

export function deriveNotifications(items: PantryItem[], now: Date = new Date()): AppNotification[] {
  const out: AppNotification[] = [];
  for (const item of items) {
    const days = daysLeft(item.expiresOn, now);
    if (days !== null && days > URGENT_DAYS) continue;
    const kind = kindOf(days);
    const detail = detailOf(kind, days, item.dateType);
    out.push({
      id: `notif:${item.id}`,
      kind,
      itemId: item.id,
      name: item.name,
      days,
      dateType: item.dateType,
      category: item.category,
      location: item.location,
      detail,
      text: `${item.name} · ${detail}`,
    });
  }
  return out.sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      (a.days ?? 0) - (b.days ?? 0) ||
      a.name.localeCompare(b.name, "id") ||
      a.itemId.localeCompare(b.itemId),
  );
}

export const NOTIFICATION_GROUP_LABELS: Record<NotificationGroupKey, string> = {
  expired: "Sudah kedaluwarsa",
  soon: "Segera kedaluwarsa",
  invalid: "Perlu dicek tanggalnya",
};

export function groupNotifications(
  list: AppNotification[],
): { key: NotificationGroupKey; label: string; items: AppNotification[] }[] {
  const keyOf = (n: AppNotification): NotificationGroupKey =>
    n.kind === "expired" ? "expired" : n.kind === "invalid" ? "invalid" : "soon";
  return (["expired", "soon", "invalid"] as const)
    .map((key) => ({ key, label: NOTIFICATION_GROUP_LABELS[key], items: list.filter((n) => keyOf(n) === key) }))
    .filter((g) => g.items.length > 0);
}
