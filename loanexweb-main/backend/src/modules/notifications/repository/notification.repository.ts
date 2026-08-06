import {
  NotificationCategory,
  NotificationPriority,
  NotificationType,
  Prisma,
  type Notification,
} from '@prisma/client';
import { prisma } from '../../../config/database';

export type NotificationListFilters = {
  userId: string;
  category?: NotificationCategory;
  type?: NotificationType;
  unreadOnly?: boolean;
  includeArchived?: boolean;
};

export class NotificationRepository {
  create(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    category: NotificationCategory;
    priority: NotificationPriority;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        category: data.category,
        priority: data.priority,
        metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  findByIdForUser(id: string, userId: string) {
    return prisma.notification.findFirst({
      where: { id, userId, archived: false },
    });
  }

  findById(id: string) {
    return prisma.notification.findUnique({ where: { id } });
  }

  list(filters: NotificationListFilters) {
    return prisma.notification.findMany({
      where: {
        userId: filters.userId,
        archived: filters.includeArchived ? undefined : false,
        isRead: filters.unreadOnly ? false : undefined,
        category: filters.category,
        type: filters.type,
      },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    });
  }

  countUnread(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false, archived: false },
    });
  }

  markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false, archived: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  softDelete(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { archived: true },
    });
  }

  hardDelete(id: string) {
    return prisma.notification.delete({ where: { id } });
  }

  listForAdmin(limit = 100) {
    return prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true, mobile: true } },
      },
    });
  }

  findReminderDuplicate(userId: string, reminderKey: string) {
    return prisma.notification.findFirst({
      where: {
        userId,
        type: { in: [NotificationType.EMI_DUE_REMINDER, NotificationType.EMI_OVERDUE] },
        metadata: {
          path: ['reminderKey'],
          equals: reminderKey,
        },
      },
    });
  }
}

export const notificationRepository = new NotificationRepository();
export type { Notification };
export { NotificationCategory, NotificationPriority, NotificationType };
