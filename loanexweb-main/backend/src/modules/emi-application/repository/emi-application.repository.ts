import {
  EmiApplicationStatus,
  VerificationStatus,
} from '@prisma/client';
import { prisma } from '../../../config/database';

const ACTIVE_STATUSES: EmiApplicationStatus[] = [
  EmiApplicationStatus.PENDING,
  EmiApplicationStatus.UNDER_REVIEW,
  EmiApplicationStatus.APPROVED,
  EmiApplicationStatus.OFFER_ACCEPTED,
  EmiApplicationStatus.DOWN_PAYMENT_PENDING,
  EmiApplicationStatus.DOWN_PAYMENT_COMPLETED,
  EmiApplicationStatus.ORDER_CONFIRMED,
  EmiApplicationStatus.ACTIVE_EMI,
];

export class EmiApplicationRepository {
  findUserById(userId: string) {
    return prisma.users.findUnique({ where: { id: userId } });
  }

  findCustomerVerification(userId: string) {
    return prisma.customerVerification.findUnique({ where: { userId } });
  }

  findLatestAadhaar(userId: string) {
    return prisma.aadhaarVerification.findFirst({
      where: { userId, verificationStatus: 'VERIFIED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  findLatestPan(userId: string) {
    return prisma.panVerification.findFirst({
      where: { userId, status: 'VERIFIED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  findLatestBank(userId: string) {
    return prisma.bankVerification.findFirst({
      where: { userId, status: 'VERIFIED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  findActiveByUserId(userId: string) {
    return prisma.emi_applications.findFirst({
      where: {
        userId,
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByUserId(userId: string) {
    return prisma.emi_applications.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return prisma.emi_applications.findUnique({
      where: { id },
    });
  }

  findByIdForUser(id: string, userId: string) {
    return prisma.emi_applications.findFirst({
      where: { id, userId },
    });
  }

  findDefaultShippingAddress(userId: string) {
    return prisma.userAddress.findFirst({
      where: { userId, addressType: 'SHIPPING' },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  findProductBrand(productId: string) {
    return prisma.products.findUnique({
      where: { id: productId },
      select: { brand: true },
    });
  }

  create(data: {
    applicationNumber: string;
    userId: string;
    productId: string;
    productName?: string | null;
    sellingPrice: number;
    requestedAmount: number;
    requestedDownPayment: number;
    requestedTenure: number;
    estimatedMonthlyEmi: number;
  }) {
    return prisma.emi_applications.create({
      data: {
        applicationNumber: data.id,
        userId: data.userId,
        productId: data.productId,
        productName: data.productName ?? null,
        sellingPrice: data.sellingPrice,
        requestedAmount: data.loanAmount,
        requestedDownPayment: data.downPayment,
        requestedTenure: data12,
        estimatedMonthlyEmi: data.monthlyEmi,
        status: EmiApplicationStatus.PENDING,
      },
    });
  }

  markCustomerPendingReview(userId: string) {
    return prisma.customerVerification.update({
      where: { userId },
      data: {
        verificationStatus: VerificationStatus.PENDING_REVIEW,
      },
    });
  }

  listForAdmin(status?: EmiApplicationStatus) {
    return prisma.emi_applications.findMany({
      where: status ? { status } : undefined,
      orderBy: { submittedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            uuid: true,
            fullName: true,
            mobile: true,
            email: true,
          },
        },
      },
    });
  }

  countApplicationsToday(prefix: string) {
    return prisma.emi_applications.count({
      where: {
        applicationNumber: { startsWith: prefix },
      },
    });
  }

  acceptOffer(id: string) {
    return prisma.emi_applications.update({
      where: { id },
      data: {
        status: EmiApplicationStatus.OFFER_ACCEPTED,
        offerAcceptedAt: new Date(),
      },
    });
  }

  declineOffer(id: string) {
    return prisma.emi_applications.update({
      where: { id },
      data: {
        status: EmiApplicationStatus.DECLINED_BY_CUSTOMER,
        offerDeclinedAt: new Date(),
      },
    });
  }

  approveForTesting(id: string, data: {
    approvedAmount: number;
    approvedTenure: number;
    approvedDownPayment: number;
    monthlyEmi: number;
    interestRate: number;
    processingFee: number;
    adminRemarks: string;
  }) {
    return prisma.emi_applications.update({
      where: { id },
      data: {
        status: EmiApplicationStatus.APPROVED,
        approvedAmount: data.loanAmount,
        approvedTenure: data12,
        approvedDownPayment: data.downPayment,
        monthlyEmi: data.monthlyEmi,
        interestRate: data.monthlyEmi,
        processingFee: data.monthlyEmi,
        adminRemarks: data.adminNotes,
        rejectionReason: null,
        reviewedAt: new Date(),
        offerAcceptedAt: null,
        offerDeclinedAt: null,
      },
    });
  }
}

export const emiApplicationRepository = new EmiApplicationRepository();
