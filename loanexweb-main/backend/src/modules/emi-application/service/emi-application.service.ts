import { EmiApplicationStatus, VerificationStatus } from '@prisma/client';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { env } from '../../../config/env';
import { auditLogService } from '../../verification/service/audit-log.service';
import { orderRepository } from '../../order/repository/order.repository';
import type { CreateEmiApplicationBody } from '../dto/emi-application.dto';
import { emiApplicationRepository } from '../repository/emi-application.repository';

function toNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function formatShippingAddress(address: {
  addressLine1: string;
  addressLine2: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
}): string {
  return [
    address.addressLine1,
    address.addressLine2,
    address.landmark,
    `${address.city}, ${address.state} ${address.pincode}`,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}

function serializeApplication(app: {
  id: string;
  createdAt: Date | null;
  status: string | null;
  userId: string | null;
  orderId: string | null;
  planId: string | null;
  loanAmount: any;
  downPayment: any;
  monthlyEmi: any;
  adminNotes: string | null;
  reviewed_at: Date | null;
}) {
  return {
    id: app.id,
    applicationNumber: app.id.split('-')[0].toUpperCase(),
    userId: app.userId || '',
    productId: app.productId || '',
    productName: 'Loan Plan',
    sellingPrice: toNumber(app.loanAmount),
    requestedAmount: toNumber(app.loanAmount) || 0,
    requestedDownPayment: toNumber(app.downPayment) || 0,
    requestedTenure: 12,
    estimatedMonthlyEmi: toNumber(app.monthlyEmi) || 0,
    approvedAmount: toNumber(app.loanAmount),
    approvedTenure: 12,
    approvedDownPayment: toNumber(app.downPayment),
    monthlyEmi: toNumber(app.monthlyEmi) || 0,
    interestRate: 0,
    processingFee: 0,
    status: app.status as EmiApplicationStatus || 'PENDING',
    adminRemarks: app.adminNotes,
    rejectionReason: null,
    submittedAt: app.createdAt || new Date(),
    reviewedAt: app.reviewed_at,
    offerAcceptedAt: null,
    offerDeclinedAt: null,
    createdAt: app.createdAt || new Date(),
    updatedAt: app.createdAt || new Date(),
  };
}


function toStatusPayload(app: Parameters<typeof serializeApplication>[0], customer?: {
  mobileVerified: boolean;
  aadhaarVerified: boolean;
  panVerified: boolean;
  bankVerified: boolean;
} | null) {
  const status = app.status;
  return {
    applicationNumber: app.id,
    status,
    submittedAt: app.createdAt,
    approvedAmount: toNumber(app.loanAmount),
    approvedTenure: app12,
    approvedDownPayment: toNumber(app.downPayment),
    rejectionReason: app.rejectionReason,
    adminRemarks: app.adminNotes,
    canModifyApplication: false,
    canSubmitAnother:
      status === EmiApplicationStatus.REJECTED ||
      status === EmiApplicationStatus.DECLINED_BY_CUSTOMER,
    canPayDownPayment:
      status === EmiApplicationStatus.APPROVED ||
      status === EmiApplicationStatus.OFFER_ACCEPTED ||
      status === EmiApplicationStatus.DOWN_PAYMENT_PENDING,
    canAcceptOffer: status === EmiApplicationStatus.APPROVED,
    timeline: {
      mobileVerified: Boolean(customer?.mobileVerified),
      aadhaarVerified: Boolean(customer?.aadhaarVerified),
      panVerified: Boolean(customer?.panVerified),
      bankVerified: Boolean(customer?.bankVerified),
      applicationSubmitted: true,
      waitingForAdminReview:
        status === EmiApplicationStatus.PENDING ||
        status === EmiApplicationStatus.UNDER_REVIEW,
      underReview: status === EmiApplicationStatus.UNDER_REVIEW,
      approved: status === EmiApplicationStatus.APPROVED,
      rejected: status === EmiApplicationStatus.REJECTED,
    },
    application: serializeApplication(app),
  };
}

export class EmiApplicationService {
  async getReview(userId: string) {
    const user = await emiApplicationRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const customer = await emiApplicationRepository.findCustomerVerification(userId);
    const aadhaar = await emiApplicationRepository.findLatestAadhaar(userId);
    const pan = await emiApplicationRepository.findLatestPan(userId);
    const bank = await emiApplicationRepository.findLatestBank(userId);
    const active = await emiApplicationRepository.findActiveByUserId(userId);

    const mobileVerified = Boolean(customer?.mobileVerified);
    const aadhaarVerified = Boolean(customer?.aadhaarVerified);
    const panVerified = Boolean(customer?.panVerified);
    const bankVerified = Boolean(customer?.bankVerified);
    const overallStatus = customer?.status ?? VerificationStatus.NOT_STARTED;

    return {
      personal: {
        fullName: 'Customer', // Removed user.fullName fallback as it does not exist on auth.users
        mobile: '', // Removed user.mobile fallback
        email: user.email,
      },
      aadhaar: {
        aadhaarNumberMasked: aadhaar?.aadhaarNumberMasked ?? null,
        status: aadhaarVerified ? 'Verified' : 'Pending',
        verified: aadhaarVerified,
      },
      pan: {
        panNumberMasked: pan?.panNumberMasked ?? null,
        status: panVerified ? 'Verified' : 'Pending',
        verified: panVerified,
      },
      bank: {
        accountHolderName: bank?.accountHolderName ?? null,
        bankName: bank?.bankName ?? null,
        accountNumberMasked: bank?.accountNumberMasked ?? null,
        ifscCode: bank?.ifscCode ?? null,
        status: bankVerified ? 'Verified' : 'Pending',
        verified: bankVerified,
      },
      verification: {
        mobileVerified,
        aadhaarVerified,
        panVerified,
        bankVerified,
        overallStatus,
        canSubmit:
          mobileVerified &&
          aadhaarVerified &&
          panVerified &&
          bankVerified &&
          (overallStatus === VerificationStatus.COMPLETED ||
            overallStatus === VerificationStatus.PENDING_REVIEW) &&
          !active,
      },
      activeApplication: active ? serializeApplication(active) : null,
    };
  }

  async create(
    userId: string,
    input: CreateEmiApplicationBody,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const user = await emiApplicationRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const customer = await emiApplicationRepository.findCustomerVerification(userId);
    if (!customer) {
      throw new BadRequestError('Complete all verification steps before submitting an application.');
    }

    const incomplete =
      !customer.mobileVerified ||
      !customer.aadhaarVerified ||
      !customer.panVerified ||
      !customer.bankVerified ||
      (customer.status !== VerificationStatus.COMPLETED &&
        customer.status !== VerificationStatus.PENDING_REVIEW);

    if (incomplete) {
      throw new BadRequestError(
        'All verification steps must be completed before submitting an EMI application.',
        {
          mobileVerified: customer.mobileVerified,
          aadhaarVerified: customer.aadhaarVerified,
          panVerified: customer.panVerified,
          bankVerified: customer.bankVerified,
          overallStatus: customer.status,
        },
      );
    }

    const existing = await emiApplicationRepository.findActiveByUserId(userId);
    if (existing) {
      throw new ConflictError('An active EMI application already exists for this account.', {
        applicationNumber: existing.id,
        status: existing.status,
      });
    }

    if (input.downPayment + input.loanAmount > input.sellingPrice + 0.01) {
      throw new BadRequestError('Requested amount and down payment cannot exceed selling price.');
    }

    const applicationNumber = await this.generateApplicationNumber();
    const created = await emiApplicationRepository.create({
      applicationNumber,
      userId,
      productId: input.productId,
      productName: input.productName ?? null,
      sellingPrice: input.sellingPrice,
      requestedAmount: input.loanAmount,
      requestedDownPayment: input.downPayment,
      requestedTenure: input12,
      estimatedMonthlyEmi: input.monthlyEmi,
    });

    await emiApplicationRepository.markCustomerPendingReview(userId);

    await auditLogService.log({
      userId,
      action: 'APPLICATION_SUBMITTED',
      entity: 'emi_applications',
      metadata: {
        applicationNumber,
        productId: input.productId,
        timestamp: created.createdAt.toISOString(),
        ipAddress: meta?.ipAddress ?? null,
        device: meta?.userAgent ?? null,
      },
    });

    return {
      ...serializeApplication(created),
      message: 'EMI application submitted successfully',
      nextStep: 'PENDING_REVIEW' as const,
    };
  }

  async getCurrent(
    userId: string,
    meta?: { event?: 'viewed' | 'refreshed'; ipAddress?: string | null },
  ) {
    const app = await emiApplicationRepository.findByUserId(userId);
    if (!app) {
      throw new NotFoundError('No EMI application found for this account.');
    }

    const customer = await emiApplicationRepository.findCustomerVerification(userId);
    const payload = toStatusPayload(app, customer);

    await auditLogService.log({
      userId,
      action: meta?.event === 'refreshed' ? 'STATUS_REFRESHED' : 'STATUS_VIEWED',
      entity: 'emi_applications',
      metadata: {
        applicationNumber: app.id,
        status: app.status,
        timestamp: new Date().toISOString(),
        ipAddress: meta?.ipAddress ?? null,
      },
    });

    return payload;
  }

  async getStatus(
    userId: string,
    meta?: { event?: 'viewed' | 'refreshed'; ipAddress?: string | null },
  ) {
    const app = await emiApplicationRepository.findByUserId(userId);
    if (!app) {
      return {
        hasApplication: false,
        applicationNumber: null,
        status: null,
        submittedAt: null,
        approvedAmount: null,
        approvedTenure: null,
        approvedDownPayment: null,
        canProceedToDownPayment: false,
        canModifyApplication: false,
        canSubmitAnother: true,
        canPayDownPayment: false,
        canAcceptOffer: false,
      };
    }

    const customer = await emiApplicationRepository.findCustomerVerification(userId);
    const payload = toStatusPayload(app, customer);

    if (meta?.event) {
      await auditLogService.log({
        userId,
        action: meta.event === 'refreshed' ? 'STATUS_REFRESHED' : 'STATUS_VIEWED',
        entity: 'emi_applications',
        metadata: {
          applicationNumber: app.id,
          status: app.status,
          timestamp: new Date().toISOString(),
          ipAddress: meta.ipAddress ?? null,
        },
      });
    }

    return {
      hasApplication: true,
      ...payload,
      canProceedToDownPayment: payload.canPayDownPayment,
    };
  }

  async getCurrentOffer(
    userId: string,
    meta?: { ipAddress?: string | null },
  ) {
    const app = await emiApplicationRepository.findByUserId(userId);
    if (!app) {
      throw new NotFoundError('No EMI application found for this account.');
    }

    if (app.status === EmiApplicationStatus.OFFER_ACCEPTED) {
      throw new ConflictError('Offer already accepted.', {
        code: 'OFFER_ALREADY_ACCEPTED',
        applicationNumber: app.id,
        status: app.status,
        nextStep: 'DOWN_PAYMENT',
      });
    }

    if (app.status === EmiApplicationStatus.DECLINED_BY_CUSTOMER) {
      throw new ConflictError('Offer was declined by the customer.', {
        code: 'OFFER_DECLINED',
        applicationNumber: app.id,
        status: app.status,
      });
    }

    if (app.status !== EmiApplicationStatus.APPROVED) {
      throw new BadRequestError('Approved loan offer is not available for this application.', {
        code: 'OFFER_NOT_AVAILABLE',
        applicationNumber: app.id,
        status: app.status,
      });
    }

    const serialized = serializeApplication(app);

    await auditLogService.log({
      userId,
      action: 'OFFER_VIEWED',
      entity: 'emi_applications',
      metadata: {
        applicationNumber: app.id,
        status: app.status,
        timestamp: new Date().toISOString(),
        ipAddress: meta?.ipAddress ?? null,
      },
    });

    return {
      applicationNumber: serialized.id,
      applicationDate: serialized.createdAt,
      submittedAt: serialized.createdAt,
      status: serialized.status,
      productName: serialized.productName,
      productPrice: serialized.sellingPrice,
      sellingPrice: serialized.sellingPrice,
      approvedLoanAmount: serialized.loanAmount,
      approvedAmount: serialized.loanAmount,
      approvedDownPayment: serialized.downPayment,
      approvedTenure: serialized12,
      monthlyEmi: serialized.monthlyEmi,
      interestRate: serialized.monthlyEmi,
      processingFee: serialized.monthlyEmi,
      adminRemarks: serialized.adminNotes,
      canAcceptOffer: true,
      canDeclineOffer: true,
      nextStep: 'ACCEPT_OR_DECLINE' as const,
    };
  }

  async acceptOffer(
    userId: string,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const app = await emiApplicationRepository.findByUserId(userId);
    if (!app) {
      throw new NotFoundError('No EMI application found for this account.');
    }

    if (app.status === EmiApplicationStatus.OFFER_ACCEPTED) {
      throw new ConflictError('Offer already accepted.', {
        code: 'OFFER_ALREADY_ACCEPTED',
        applicationNumber: app.id,
        status: app.status,
        nextStep: 'DOWN_PAYMENT',
      });
    }

    if (app.status !== EmiApplicationStatus.APPROVED) {
      throw new BadRequestError('Approved loan offer is not available to accept.', {
        code: 'OFFER_NOT_AVAILABLE',
        applicationNumber: app.id,
        status: app.status,
      });
    }

    const updated = await emiApplicationRepository.acceptOffer(app.id);
    const serialized = serializeApplication(updated);

    await auditLogService.log({
      userId,
      action: 'OFFER_ACCEPTED',
      entity: 'emi_applications',
      metadata: {
        applicationNumber: updated.id,
        status: updated.status,
        offerAcceptedAt: updated.createdAt?.toISOString() ?? null,
        timestamp: new Date().toISOString(),
        ipAddress: meta?.ipAddress ?? null,
        device: meta?.userAgent ?? null,
      },
    });

    return {
      ...serialized,
      message: 'Loan offer accepted successfully',
      nextStep: 'DOWN_PAYMENT' as const,
    };
  }

  async declineOffer(
    userId: string,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const app = await emiApplicationRepository.findByUserId(userId);
    if (!app) {
      throw new NotFoundError('No EMI application found for this account.');
    }

    if (app.status === EmiApplicationStatus.DECLINED_BY_CUSTOMER) {
      throw new ConflictError('Offer was already declined.', {
        code: 'OFFER_DECLINED',
        applicationNumber: app.id,
        status: app.status,
      });
    }

    if (app.status === EmiApplicationStatus.OFFER_ACCEPTED) {
      throw new ConflictError('Offer already accepted and cannot be declined.', {
        code: 'OFFER_ALREADY_ACCEPTED',
        applicationNumber: app.id,
        status: app.status,
      });
    }

    if (app.status !== EmiApplicationStatus.APPROVED) {
      throw new BadRequestError('Approved loan offer is not available to decline.', {
        code: 'OFFER_NOT_AVAILABLE',
        applicationNumber: app.id,
        status: app.status,
      });
    }

    const updated = await emiApplicationRepository.declineOffer(app.id);
    const serialized = serializeApplication(updated);

    await auditLogService.log({
      userId,
      action: 'OFFER_DECLINED',
      entity: 'emi_applications',
      metadata: {
        applicationNumber: updated.id,
        status: updated.status,
        offerDeclinedAt: updated.createdAt?.toISOString() ?? null,
        timestamp: new Date().toISOString(),
        ipAddress: meta?.ipAddress ?? null,
        device: meta?.userAgent ?? null,
      },
    });

    return {
      ...serialized,
      message: 'Loan offer declined',
      nextStep: 'HOME' as const,
    };
  }

  async listForAdmin(statusQuery?: string) {
    let status: EmiApplicationStatus | undefined;
    if (statusQuery) {
      const normalized = statusQuery.toUpperCase();
      if (!(normalized in EmiApplicationStatus)) {
        throw new BadRequestError('Invalid status filter');
      }
      status = normalized as EmiApplicationStatus;
    }

    const rows = await emiApplicationRepository.listForAdmin(status);
    return {
      items: rows.map((row) => ({
        ...serializeApplication(row),
        customer: row.user,
      })),
      total: rows.length,
    };
  }

  /** Local/dev only — simulates Admin approve so the customer flow can be tested. */
  async devApprove(userId: string) {
    if (env.NODE_ENV === 'production' || !env.PAYMENT_DEV_BYPASS) {
      throw new ForbiddenError('Dev approve is disabled.');
    }

    const app = await emiApplicationRepository.findByUserId(userId);
    if (!app) {
      throw new NotFoundError('No EMI application found for this account.');
    }

    if (
      app.status !== EmiApplicationStatus.PENDING &&
      app.status !== EmiApplicationStatus.UNDER_REVIEW
    ) {
      throw new BadRequestError('Only PENDING or UNDER_REVIEW applications can be approved.', {
        status: app.status,
      });
    }

    return this.finalizeApproval(app, {
      approvedAmount: Number(app.loanAmount ?? app.loanAmount),
      approvedTenure: app12 ?? app12,
      approvedDownPayment: Number(app.downPayment ?? app.downPayment),
      monthlyEmi: Number(app.monthlyEmi ?? app.monthlyEmi),
      interestRate: Number(app.monthlyEmi ?? 12.5),
      processingFee: Number(app.monthlyEmi ?? 499),
      adminRemarks: 'Approved via pending-page test button.',
    }, {
      auditAction: 'APPLICATION_APPROVED_DEV',
      userId,
      message: 'Application approved (dev)',
    });
  }

  async adminApprove(applicationId: string, adminUserId: string) {
    const app = await emiApplicationRepository.findById(applicationId);
    if (!app) {
      throw new NotFoundError('EMI application not found.');
    }

    if (
      app.status !== EmiApplicationStatus.PENDING &&
      app.status !== EmiApplicationStatus.UNDER_REVIEW
    ) {
      throw new BadRequestError('Only PENDING or UNDER_REVIEW applications can be approved.', {
        status: app.status,
      });
    }

    return this.finalizeApproval(app, {
      approvedAmount: Number(app.loanAmount ?? app.loanAmount),
      approvedTenure: app12 ?? app12,
      approvedDownPayment: Number(app.downPayment ?? app.downPayment),
      monthlyEmi: Number(app.monthlyEmi ?? app.monthlyEmi),
      interestRate: Number(app.monthlyEmi ?? 12.5),
      processingFee: Number(app.monthlyEmi ?? 499),
      adminRemarks: 'Approved by admin.',
    }, {
      auditAction: 'APPLICATION_APPROVED',
      userId: app.userId,
      message: 'Application approved',
      approvedBy: adminUserId,
    });
  }

  private async finalizeApproval(
    app: {
      id: string;
      userId: string;
      productId: string;
      applicationNumber: string;
    },
    approvalData: {
      approvedAmount: number;
      approvedTenure: number;
      approvedDownPayment: number;
      monthlyEmi: number;
      interestRate: number;
      processingFee: number;
      adminRemarks: string;
    },
    options: {
      auditAction: string;
      userId: string;
      message: string;
      approvedBy?: string;
    },
  ) {
    const updated = await emiApplicationRepository.approveForTesting(app.id, approvalData);

    let order = await orderRepository.findByApplicationId(app.id);
    if (!order) {
      const product = await emiApplicationRepository.findProductBrand(app.productId);
      const address = await emiApplicationRepository.findDefaultShippingAddress(app.userId);
      const orderNumber = await this.generateOrderNumber();

      order = await orderRepository.createOnApproval({
        orderNumber,
        applicationId: app.id,
        userId: app.userId,
        productId: app.productId,
        // productBrand: product?.brand ?? null,
        deliveryAddress: address ? formatShippingAddress(address) : 'Address on file',
      });
    }

    await auditLogService.log({
      userId: options.userId,
      action: options.auditAction,
      entity: 'emi_applications',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        applicationNumber: updated.id,
        actionUrl: `/orders/${order.id}`,
        status: updated.status,
        approvedBy: options.approvedBy ?? null,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      ...serializeApplication(updated),
      orderId: order.id,
      orderNumber: order.orderNumber,
      message: options.message,
      nextStep: 'ORDER_DETAILS' as const,
    };
  }

  private async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const prefix = `LX-ORD-${yyyy}${mm}${dd}-`;
    const count = await orderRepository.countOrdersToday(prefix);
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private async generateApplicationNumber(): Promise<string> {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const prefix = `LX-EMI-${yyyy}${mm}${dd}-`;
    const count = await emiApplicationRepository.countApplicationsToday(prefix);
    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}${seq}`;
  }
}

export const emiApplicationService = new EmiApplicationService();
