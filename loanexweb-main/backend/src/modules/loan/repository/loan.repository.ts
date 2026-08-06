import {
  EmiPaymentStatus,
  LoanStatus,
  type EmiApplication,
  type EmiSchedule,
  type LoanAccount,
  type Order,
  type User,
} from '@prisma/client';
import { prisma } from '../../../config/database';

export type LoanWithRelations = LoanAccount & {
  application: EmiApplication & { order?: Order | null };
  user?: Pick<User, 'id' | 'fullName' | 'mobile' | 'email'> | null;
  schedule: EmiSchedule[];
};

export class LoanRepository {
  findById(loanId: string) {
    return prisma.loanAccount.findUnique({
      where: { id: loanId },
      include: {
        application: { include: { order: true } },
        user: { select: { id: true, fullName: true, mobile: true, email: true } },
        schedule: { orderBy: { emiNumber: 'asc' } },
      },
    });
  }

  findByUserId(userId: string) {
    return prisma.loanAccount.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        application: { include: { order: true } },
        schedule: { orderBy: { emiNumber: 'asc' } },
      },
    });
  }

  findActiveByUserId(userId: string) {
    return prisma.loanAccount.findFirst({
      where: { userId, loanStatus: LoanStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
      include: {
        application: { include: { order: true } },
        schedule: { orderBy: { emiNumber: 'asc' } },
      },
    });
  }

  findByApplicationId(applicationId: string) {
    return prisma.loanAccount.findUnique({
      where: { applicationId },
      include: {
        application: { include: { order: true } },
        schedule: { orderBy: { emiNumber: 'asc' } },
      },
    });
  }

  listForAdmin(status?: LoanStatus) {
    return prisma.loanAccount.findMany({
      where: status ? { loanStatus: status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        application: { include: { order: true } },
        user: { select: { id: true, fullName: true, mobile: true, email: true } },
        schedule: { orderBy: { emiNumber: 'asc' } },
      },
    });
  }

  countLoansToday(prefix: string) {
    return prisma.loanAccount.count({
      where: { loanAccountNumber: { startsWith: prefix } },
    });
  }

  async createWithSchedule(input: {
    loanAccountNumber: string;
    applicationId: string;
    userId: string;
    productId: string;
    loanAmount: number;
    interestRate: number;
    processingFee: number;
    loanTenure: number;
    emiAmount: number;
    totalInterest: number;
    totalPayable: number;
    outstandingAmount: number;
    loanStartDate: Date;
    loanEndDate: Date;
    nextEmiDueDate?: Date | null;
    schedule: Array<{
      emiNumber: number;
      dueDate: Date;
      principalAmount: number;
      interestAmount: number;
      emiAmount: number;
      remainingBalance: number;
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.loanAccount.findUnique({
        where: { applicationId: input.applicationId },
        include: {
          application: { include: { order: true } },
          schedule: { orderBy: { emiNumber: 'asc' } },
        },
      });
      if (existing) return existing;

      const loan = await tx.loanAccount.create({
        data: {
          loanAccountNumber: input.loanAccountNumber,
          applicationId: input.applicationId,
          userId: input.userId,
          productId: input.productId,
          loanAmount: input.loanAmount,
          interestRate: input.monthlyEmi,
          processingFee: input.monthlyEmi,
          loanTenure: input.loanTenure,
          emiAmount: input.emiAmount,
          totalInterest: input.totalInterest,
          totalPayable: input.totalPayable,
          outstandingAmount: input.outstandingAmount,
          paidAmount: 0,
          nextEmiDueDate: input.nextEmiDueDate ?? input.schedule[0]?.dueDate ?? null,
          loanStatus: LoanStatus.ACTIVE,
          loanStartDate: input.loanStartDate,
          loanEndDate: input.loanEndDate,
          schedule: {
            create: input.schedule.map((row) => ({
              emiNumber: row.emiNumber,
              dueDate: row.dueDate,
              principalAmount: row.principalAmount,
              interestAmount: row.interestAmount,
              emiAmount: row.emiAmount,
              remainingBalance: row.remainingBalance,
              paymentStatus: EmiPaymentStatus.PENDING,
            })),
          },
        },
        include: {
          application: { include: { order: true } },
          schedule: { orderBy: { emiNumber: 'asc' } },
        },
      });

      return loan;
    });
  }

  async updateStatus(loanId: string, loanStatus: LoanStatus) {
    return prisma.loanAccount.update({
      where: { id: loanId },
      data: { loanStatus },
      include: {
        application: { include: { order: true } },
        user: { select: { id: true, fullName: true, mobile: true, email: true } },
        schedule: { orderBy: { emiNumber: 'asc' } },
      },
    });
  }

  async markOverdue(loanAccountId: string, asOf: Date = new Date()) {
    return prisma.emi_schedules.updateMany({
      where: {
        loanAccountId,
        paymentStatus: EmiPaymentStatus.PENDING,
        dueDate: { lt: asOf },
      },
      data: { paymentStatus: EmiPaymentStatus.OVERDUE },
    });
  }
}

export const loanRepository = new LoanRepository();
export { LoanStatus, EmiPaymentStatus };
