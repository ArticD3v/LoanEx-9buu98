import {
  EmiPaymentStatus,
  LoanStatus,
  PaymentStatus,
  PaymentType,
  Prisma,
  type EmiApplication,
  type EmiSchedule,
  type LoanAccount,
  type PaymentTransaction,
} from '@prisma/client';
import { prisma } from '../../../config/database';

export type HistoryPayment = PaymentTransaction & {
  emiSchedule: (EmiSchedule & {
    loanAccount: LoanAccount & { application: EmiApplication };
  }) | null;
};

export type HistoryFilters = {
  userId: string;
  status?: PaymentStatus;
  paymentType?: PaymentType;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
};

export class EmiHistoryRepository {
  findActiveLoanForUser(userId: string) {
    return prisma.loanAccount.findFirst({
      where: { userId, loanStatus: LoanStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
      include: {
        application: true,
        schedule: { orderBy: { emiNumber: 'asc' } },
      },
    });
  }

  findLatestLoanForUser(userId: string) {
    return prisma.loanAccount.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        application: true,
        schedule: { orderBy: { emiNumber: 'asc' } },
      },
    });
  }

  async listPayments(filters: HistoryFilters): Promise<HistoryPayment[]> {
    const where: Prisma.PaymentTransactionWhereInput = {
      userId: filters.userId,
      paymentType: filters.paymentType ?? PaymentType.EMI,
      paymentStatus: filters.status
        ? filters.status
        : {
            in: [
              PaymentStatus.SUCCESS,
              PaymentStatus.FAILED,
              PaymentStatus.PENDING,
              PaymentStatus.REFUNDED,
            ],
          },
    };

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    if (filters.search?.trim()) {
      const q = filters.search.trim();
      const emiNumber = Number(q.replace(/^#/, ''));
      where.OR = [
        { razorpayPaymentId: { contains: q, mode: 'insensitive' } },
        { razorpayOrderId: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } },
        ...(Number.isFinite(emiNumber)
          ? [{ emiSchedule: { emiNumber } }]
          : []),
      ];
    }

    return prisma.paymentTransaction.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        emiSchedule: {
          include: {
            loanAccount: { include: { application: true } },
          },
        },
      },
    });
  }

  findPaymentByIdForUser(paymentId: string, userId: string) {
    return prisma.paymentTransaction.findFirst({
      where: { id: paymentId, userId },
      include: {
        emiSchedule: {
          include: {
            loanAccount: {
              include: {
                application: true,
                schedule: { orderBy: { emiNumber: 'asc' } },
              },
            },
          },
        },
      },
    });
  }
}

export const emiHistoryRepository = new EmiHistoryRepository();
export { PaymentStatus, PaymentType, EmiPaymentStatus, LoanStatus };
