import {
  BankAccountType,
  BankVerificationStatus,
  VerificationStatus,
} from '@prisma/client';
import { prisma } from '../../../config/database';

export class BankVerificationRepository {
  findUserById(userId: string) {
    return prisma.users.findUnique({ where: { id: userId } });
  }

  findCustomerVerification(userId: string) {
    return prisma.customerVerification.findUnique({ where: { userId } });
  }

  findLatestByUserId(userId: string) {
    return prisma.bankVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findVerifiedByHash(accountNumberHash: string, excludeUserId?: string) {
    return prisma.bankVerification.findFirst({
      where: {
        accountNumberHash,
        status: BankVerificationStatus.VERIFIED,
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
    });
  }

  create(data: {
    userId: string;
    accountHolderName: string;
    bankName: string;
    accountNumberMasked: string;
    accountNumberHash: string;
    ifscCode: string;
    accountType: BankAccountType;
    status: BankVerificationStatus;
    verifiedAt?: Date | null;
  }) {
    return prisma.bankVerification.create({
      data: {
        userId: data.userId,
        accountHolderName: data.accountHolderName,
        bankName: data.bankName,
        accountNumberMasked: data.accountNumberMasked,
        accountNumberHash: data.accountNumberHash,
        ifscCode: data.ifscCode,
        accountType: data.accountType,
        status: data.status,
        verifiedAt: data.verifiedAt ?? null,
      },
    });
  }

  markUserBankVerified(userId: string) {
    return prisma.users.update({
      where: { id: userId },
      data: { bankVerified: true },
    });
  }

  upsertCustomerBankVerified(userId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.customerVerification.findUnique({ where: { userId } });

      if (!existing) {
        return tx.customerVerification.create({
          data: {
            userId,
            mobileVerified: true,
            aadhaarVerified: true,
            panVerified: true,
            bankVerified: true,
            verificationStatus: VerificationStatus.COMPLETED,
          },
        });
      }

      const flags = {
        mobileVerified: existing.mobileVerified,
        aadhaarVerified: existing.aadhaarVerified,
        panVerified: existing.panVerified,
        bankVerified: true,
      };

      const completed = Object.values(flags).filter(Boolean).length;
      const verificationStatus =
        completed === 4
          ? VerificationStatus.COMPLETED
          : completed === 0
            ? VerificationStatus.NOT_STARTED
            : VerificationStatus.IN_PROGRESS;

      return tx.customerVerification.update({
        where: { userId },
        data: {
          bankVerified: true,
          verificationStatus,
        },
      });
    });
  }
}

export const bankVerificationRepository = new BankVerificationRepository();
