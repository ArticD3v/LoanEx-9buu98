import {
  AutopayMandateStatus,
  AutopayPaymentMethod,
  LoanStatus,
  type AutopayMandate,
  type LoanAccount,
} from '@prisma/client';
import { prisma } from '../../../config/database';

export type MandateWithLoan = AutopayMandate & {
  loanAccount: LoanAccount & {
    application?: { applicationNumber: string; productName: string | null } | null;
  };
};

export class AutopayRepository {
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

  findLoanById(loanId: string) {
    return prisma.loanAccount.findUnique({
      where: { id: loanId },
      include: {
        application: true,
        autopayMandates: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  findCurrentMandate(loanAccountId: string) {
    return prisma.autopayMandate.findFirst({
      where: {
        loanAccountId,
        status: { in: [AutopayMandateStatus.PENDING, AutopayMandateStatus.ACTIVE, AutopayMandateStatus.PAUSED] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        loanAccount: { include: { application: true } },
      },
    });
  }

  findActiveOrPendingForLoan(loanAccountId: string) {
    return prisma.autopayMandate.findFirst({
      where: {
        loanAccountId,
        status: { in: [AutopayMandateStatus.PENDING, AutopayMandateStatus.ACTIVE] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listHistoryForUser(userId: string) {
    return prisma.autopayMandate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        loanAccount: { include: { application: true } },
      },
    });
  }

  listForAdmin(status?: AutopayMandateStatus) {
    return prisma.autopayMandate.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        loanAccount: { include: { application: true } },
        user: { select: { id: true, fullName: true, mobile: true, email: true } },
      },
    });
  }

  createMandate(data: {
    userId: string;
    loanAccountId: string;
    provider: AutopayMandate['provider'];
    mandateId: string;
    mandateReference: string;
    paymentMethod: AutopayPaymentMethod;
    bankName?: string | null;
    upiId?: string | null;
    maximumDebitAmount: number;
    frequency: string;
    nextDebitDate?: Date | null;
    status: AutopayMandateStatus;
    providerPayload?: object;
  }) {
    return prisma.autopayMandate.create({
      data: {
        userId: data.userId,
        loanAccountId: data.loanAccountId,
        provider: data.provider,
        mandateId: data.mandateId,
        mandateReference: data.mandateReference,
        paymentMethod: data.paymentMethod,
        bankName: data.bankName ?? null,
        upiId: data.upiId ?? null,
        maximumDebitAmount: data.maximumDebitAmount,
        frequency: data.frequency,
        nextDebitDate: data.nextDebitDate ?? null,
        status: data.status,
        providerPayload: data.providerPayload ?? undefined,
      },
      include: {
        loanAccount: { include: { application: true } },
      },
    });
  }

  updateMandateStatus(
    id: string,
    data: {
      status: AutopayMandateStatus;
      failureReason?: string | null;
      providerPayload?: object;
      nextDebitDate?: Date | null;
    },
  ) {
    return prisma.autopayMandate.update({
      where: { id },
      data: {
        status: data.status,
        failureReason: data.failureReason ?? undefined,
        providerPayload: data.providerPayload ?? undefined,
        nextDebitDate: data.nextDebitDate === undefined ? undefined : data.nextDebitDate,
      },
      include: {
        loanAccount: { include: { application: true } },
      },
    });
  }

  setLoanAutopayEnabled(loanAccountId: string, enabled: boolean) {
    return prisma.loanAccount.update({
      where: { id: loanAccountId },
      data: { autopayEnabled: enabled },
    });
  }

  async cancelOpenMandatesForLoan(loanAccountId: string) {
    return prisma.autopayMandate.updateMany({
      where: {
        loanAccountId,
        status: {
          in: [
            AutopayMandateStatus.PENDING,
            AutopayMandateStatus.ACTIVE,
            AutopayMandateStatus.PAUSED,
          ],
        },
      },
      data: { status: AutopayMandateStatus.CANCELLED },
    });
  }
}

export const autopayRepository = new AutopayRepository();
export { AutopayMandateStatus, AutopayPaymentMethod, LoanStatus };
