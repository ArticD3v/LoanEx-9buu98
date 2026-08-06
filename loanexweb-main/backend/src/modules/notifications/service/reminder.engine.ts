import { EmiPaymentStatus, NotificationPriority, NotificationType } from '@prisma/client';
import { prisma } from '../../../config/database';
import { notificationRepository } from '../repository/notification.repository';
import { notificationService } from './notification.service';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Reminder engine — scans EMI schedule for due-tomorrow and overdue instalments.
 * Designed to run on an interval; swap for a real job queue later.
 */
export async function runEmiReminderPass(asOf: Date = new Date()): Promise<{
  dueTomorrow: number;
  overdue: number;
}> {
  const today = startOfDay(asOf);
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);

  const dueTomorrowRows = await prisma.emi_schedules.findMany({
    where: {
      status: { in: [EmiPaymentStatus.PENDING, EmiPaymentStatus.OVERDUE] },
      due_date: { gte: tomorrow, lt: dayAfter },
      loanAccount: { loanStatus: 'ACTIVE' },
    },
    include: { loanAccount: true },
  });

  const overdueRows = await prisma.emi_schedules.findMany({
    where: {
      status: { in: [EmiPaymentStatus.PENDING, EmiPaymentStatus.OVERDUE] },
      due_date: { lt: today },
      loanAccount: { loanStatus: 'ACTIVE' },
    },
    include: { loanAccount: true },
  });

  let dueTomorrow = 0;
  let overdue = 0;

  for (const row of dueTomorrowRows) {
    const reminderKey = `EMI_DUE:${row.id}:${tomorrow.toISOString().slice(0, 10)}`;
    const existing = await notificationRepository.findReminderDuplicate(
      row.loanAccount.userId,
      reminderKey,
    );
    if (existing) continue;

    await notificationService.dispatch({
      userId: row.loanAccount.userId,
      type: NotificationType.EMI_DUE_REMINDER,
      title: 'EMI due tomorrow',
      message: `EMI #${row.emiNumber} of ₹${Number(row.emiAmount).toFixed(2)} is due tomorrow.`,
      priority: NotificationPriority.MEDIUM,
      metadata: {
        reminderKey,
        emiId: row.id,
        emiNumber: row.emiNumber,
        loanAccountNumber: row.loanAccount.loanAccountNumber,
      },
      channels: ['inapp', 'email', 'sms'],
    });
    dueTomorrow += 1;
  }

  for (const row of overdueRows) {
    const reminderKey = `EMI_OVERDUE:${row.id}:${today.toISOString().slice(0, 10)}`;
    const existing = await notificationRepository.findReminderDuplicate(
      row.loanAccount.userId,
      reminderKey,
    );
    if (existing) continue;

    await notificationService.dispatch({
      userId: row.loanAccount.userId,
      type: NotificationType.EMI_OVERDUE,
      title: 'EMI overdue',
      message: `EMI #${row.emiNumber} is overdue. Please pay to avoid late fees.`,
      priority: NotificationPriority.HIGH,
      metadata: {
        reminderKey,
        emiId: row.id,
        emiNumber: row.emiNumber,
        loanAccountNumber: row.loanAccount.loanAccountNumber,
      },
      channels: ['inapp', 'email', 'sms'],
    });
    overdue += 1;
  }

  return { dueTomorrow, overdue };
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startNotificationReminderEngine(intervalMs = 60 * 60 * 1000): void {
  if (timer) return;

  const tick = () => {
    void runEmiReminderPass()
      .then((result) => {
        if (result.dueTomorrow || result.overdue) {
          console.info(
            `[Reminders] dueTomorrow=${result.dueTomorrow} overdue=${result.overdue}`,
          );
        }
      })
      .catch((error) => console.error('[Reminders] pass failed', error));
  };

  tick();
  timer = setInterval(tick, intervalMs);
}

export function stopNotificationReminderEngine(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
