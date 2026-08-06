import { NotificationData, notifications as seedNotifications } from './mockData';

let items: NotificationData[] = seedNotifications.map((n) => ({ ...n }));
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getNotifications(): NotificationData[] {
  return items;
}

export function getUnreadCount(): number {
  return items.filter((n) => !n.read).length;
}

export function subscribeNotifications(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function markNotificationRead(id: string): void {
  let changed = false;
  items = items.map((n) => {
    if (n.id !== id || n.read) return n;
    changed = true;
    return { ...n, read: true };
  });
  if (changed) notify();
}

export function markAllNotificationsRead(): void {
  if (!items.some((n) => !n.read)) return;
  items = items.map((n) => (n.read ? n : { ...n, read: true }));
  notify();
}
