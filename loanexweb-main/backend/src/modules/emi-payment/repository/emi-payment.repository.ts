import {
  EmiPaymentStatus,
  PaymentStatus,
  PaymentType,
  type EmiApplication,
  type EmiSchedule,
  type LoanAccount,
  type PaymentTransaction,
  type User,
} from '@prisma/client';
import { prisma } from '../../../config/database';

export type EmiScheduleWithLoan = EmiSchedule & {
  loanAccount: LoanAccount & {
    application: EmiApplication;
    user?: Pick<User, 'id' | 'fullName' | 'email' | 'mobile'> | null;
  };
  paymentTransaction?: PaymentTransaction | null;
};

export class EmiPaymentRepository {
  findScheduleByIdForUser(emiId: string, userId: string) {
    return prisma.emi_schedules.findFirst({
      where: {
        id: emiId,
        loanAccount: { userId },
      },
      include: {
        loanAccount: {
          include: {
            application: true,
            user: { select: { id: true, fullName: true, email: true, mobile: true } },
            schedule: { orderBy: { emiNumber: 'asc' } },
          },
        },
        paymentTransaction: true,
      },
    });
  }

  findScheduleById(emiId: string) {
    return prisma.emi_schedules.findUnique({
      where: { id: emiId },
      include: {
        loanAccount: {
          include: {
            application: true,
            user: { select: { id: true, fullName: true, email: true, mobile: true } },
            schedule: { orderBy: { emiNumber: 'asc' } },
          },
        },
        paymentTransaction: true,
      },
    });
  }

  findSuccessByEmiId(emiScheduleId: string) {
    return prisma.paymentTransaction.findFirst({
      where: {
        emiScheduleId,
        paymentType: PaymentType.EMI,
        paymentStatus: PaymentStatus.SUCCESS,
      },
    });
  }

  findByRazorpayOrderId(razorpayOrderId: string) {
    return prisma.paymentTransaction.findUnique({
      where: { razorpayOrderId },
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

  createEmiTransaction(input: {
    applicationId: string;
    userId: string;
    emiScheduleId: string;
    razorpayOrderId: string;
    amount: number;
  }) {
    return prisma.paymentTransaction.upsert({
      where: { emiScheduleId: input.emiScheduleId },
      create: {
        applicationId: input.applicationId,
        userId: input.userId,
        emiScheduleId: input.emiScheduleId,
        razorpayOrderId: input.razorpayOrderId,
        amount: input.amount,
        paymentStatus: PaymentStatus.PENDING,
        paymentType: PaymentType.EMI,
      },
      update: {
        razorpayOrderId: input.razorpayOrderId,
        amount: input.amount,
        paymentStatus: PaymentStatus.PENDING,
        razorpayPaymentId: null,
        razorpaySignature: null,
      },
    });
  }

  listEmiPaymentsForLoan(loanAccountId: string) {
    return prisma.paymentTransaction.findMany({
      where: {
        paymentType: PaymentType.EMI,
        emiSchedule: { loanAccountId },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        emiSchedule: true,
      },
    });
  }

  async completeEmiPayment(input: {
    paymentId: string;
    emiScheduleId: string;
    loanAccountId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    paidAmount: number;
    receiptPath?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.paymentTransaction.update({
        where: { id: input.paymentId },
        data: {
          paymentStatus: PaymentStatus.SUCCESS,
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
          receiptPath: input.receiptPath ?? undefined,
        },
      });

      await tx.emiSchedule.update({
        where: { id: input.emiScheduleId },
        data: {
          paymentStatus: EmiPaymentStatus.PAID,
          paidAmount: input.paidAmount,
          paidAt: new Date(),
          transactionId: input.razorpayPaymentId,
        },
      });

      const freshSchedule = await tx.emiSchedule.findMany({
        where: { loanAccountId: input.loanAccountId },
        orderBy: { emiNumber: 'asc' },
      });
      const remaining = freshSchedule.filter((row) => row.paymentStatus !== EmiPaymentStatus.PAID);
      const paidRows = freshSchedule.filter((row) => row.paymentStatus === EmiPaymentStatus.PAID);
      const outstandingAmount = remaining.reduce((sum, row) => sum + Number(row.emiAmount), 0);
      const paidAmount = paidRows.reduce(
        (sum, row) => sum + Number(row.paidAmount ?? row.emiAmount),
        0,
      );
      const nextDue = remaining[0]?.dueDate ?? null;

      await tx.loanAccount.update({
        where: { id: input.loanAccountId },
        data: {
          outstandingAmount,
          paidAmount,
          nextEmiDueDate: nextDue,
          lastPaymentDate: new Date(),
        },
      });

      return {
        payment,
        unpaidCount: remaining.length,
        outstandingAmount,
        paidAmount,
        nextEmiDueDate: nextDue,
      };
    });
  }

  markFailed(paymentId: string) {
    return prisma.paymentTransaction.update({
      where: { id: paymentId },
      data: { paymentStatus: PaymentStatus.FAILED },
    });
  }

  updateReceiptPath(paymentId: string, receiptPath: string) {
    return prisma.paymentTransaction.update({
      where: { id: paymentId },
      data: { receiptPath },
    });
  }
}

export const emiPaymentRepository = new EmiPaymentRepository();
export { PaymentStatus, PaymentType, EmiPaymentStatus };
