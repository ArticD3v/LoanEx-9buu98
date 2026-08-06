import { PanVerificationStatus, VerificationStatus } from '@prisma/client';
import { prisma } from '../../../config/database';

export class PanVerificationRepository {
  findUserById(userId: string) {
    return prisma.users.findUnique({ where: { id: userId } });
  }

  findCustomerVerification(userId: string) {
    return prisma.customerVerification.findUnique({ where: { userId } });
  }

  findLatestByUserId(userId: string) {
    return prisma.panVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findVerifiedByHash(panHash: string, excludeUserId?: string) {
    return prisma.panVerification.findFirst({
      where: {
        panHash,
        status: PanVerificationStatus.VERIFIED,
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
    });
  }

  create(data: {
    userId: string;
    panNumberMasked: string;
    panHash: string;
    fullName: string;
    dateOfBirth: Date;
    status: PanVerificationStatus;
    verifiedAt?: Date | null;
  }) {
    return prisma.panVerification.create({
      data: {
        userId: data.userId,
        panNumberMasked: data.panNumberMasked,
        panHash: data.panHash,
        fullName: data.fullName,
        dateOfBirth: data.dateOfBirth,
        status: data.status,
        verifiedAt: data.verifiedAt ?? null,
      },
    });
  }

  markUserPanVerified(userId: string) {
    return prisma.users.update({
      where: { id: userId },
      data: { panVerified: true },
    });
  }

  upsertCustomerPanVerified(userId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.customerVerification.findUnique({ where: { userId } });

      if (!existing) {
        return tx.customerVerification.create({
          data: {
            userId,
            mobileVerified: true,
            aadhaarVerified: true,
            panVerified: true,
            verificationStatus: VerificationStatus.IN_PROGRESS,
          },
        });
      }

      const flags = {
        mobileVerified: existing.mobileVerified,
        aadhaarVerified: existing.aadhaarVerified,
        panVerified: true,
        bankVerified: existing.bankVerified,
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
          panVerified: true,
          verificationStatus,
        },
      });
    });
  }
}

export const panVerificationRepository = new PanVerificationRepository();
