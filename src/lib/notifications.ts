import type { NotificationDto } from "@/types/finops";
export function unreadNotifications(items: NotificationDto[], reads: Record<string, boolean>): NotificationDto[] {
  return items.filter((item) => !reads[item.id]);
}
export function markNotificationsRead(items: NotificationDto[], reads: Record<string, boolean>): Record<string, boolean> {
  return { ...reads, ...Object.fromEntries(items.map((item) => [item.id, true])) };
}