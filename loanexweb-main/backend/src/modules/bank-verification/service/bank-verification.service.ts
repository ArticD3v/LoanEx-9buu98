import { BankAccountType, BankVerificationStatus } from '@prisma/client';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/app-error';
import {
  hashAccountNumber,
  maskAccountNumber,
  normalizeIfsc,
} from '../../../common/utils/bank';
import { auditLogService } from '../../verification/service/audit-log.service';
import type { VerifyBankBody } from '../dto/bank-verification.dto';
import { bankVerificationRepository } from '../repository/bank-verification.repository';

export class BankVerificationService {
  async getStatus(userId: string) {
    const user = await bankVerificationRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const customer = await bankVerificationRepository.findCustomerVerification(userId);
    const latest = await bankVerificationRepository.findLatestByUserId(userId);
    const bankVerified = Boolean(user.bankVerified || customer?.bankVerified);

    return {
      bankVerified,
      panVerified: Boolean(customer?.panVerified || user.panVerified),
      aadhaarVerified: Boolean(customer?.aadhaarVerified || user.aadhaarVerified),
      mobileVerified: Boolean(customer?.mobileVerified || user.mobileVerified),
      accountNumberMasked: bankVerified ? (latest?.accountNumberMasked ?? null) : null,
      bankName: bankVerified ? (latest?.bankName ?? null) : null,
      accountType: bankVerified ? (latest?.accountType ?? null) : null,
      ifscCode: bankVerified ? (latest?.ifscCode ?? null) : null,
      status: bankVerified
        ? BankVerificationStatus.VERIFIED
        : (latest?.status ?? BankVerificationStatus.PENDING),
      verifiedAt: latest?.verifiedAt ?? null,
      verificationStatus: customer?.status ?? 'NOT_STARTED',
    };
  }

  async verify(
    userId: string,
    input: VerifyBankBody,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const user = await bankVerificationRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const customer = await bankVerificationRepository.findCustomerVerification(userId);
    const panVerified = Boolean(customer?.panVerified || user.panVerified);
    if (!panVerified) {
      throw new ForbiddenError('Complete PAN verification before verifying bank account.');
    }

    if (user.bankVerified || customer?.bankVerified) {
      const latest = await bankVerificationRepository.findLatestByUserId(userId);
      throw new ConflictError('Bank account is already verified', {
        status: BankVerificationStatus.VERIFIED,
        accountNumberMasked: latest?.accountNumberMasked ?? null,
      });
    }

    if (input.accountNumber !== input.confirmAccountNumber) {
      throw new BadRequestError('Account number and confirm account number must match');
    }

    const ifscCode = normalizeIfsc(input.ifscCode);
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      throw new BadRequestError('Invalid IFSC code');
    }

    const accountNumberHash = hashAccountNumber(input.accountNumber);
    const accountNumberMasked = maskAccountNumber(input.accountNumber);

    const taken = await bankVerificationRepository.findVerifiedByHash(
      accountNumberHash,
      userId,
    );
    if (taken) {
      throw new ConflictError('This bank account is already linked to another account');
    }

    const verifiedAt = new Date();
    const accountType = input.accountType as BankAccountType;

    await bankVerificationRepository.create({
      userId,
      accountHolderName: input.accountHolderName.trim(),
      bankName: input.bankName.trim(),
      accountNumberMasked,
      accountNumberHash,
      ifscCode,
      accountType,
      status: BankVerificationStatus.VERIFIED,
      verifiedAt,
    });

    await bankVerificationRepository.markUserBankVerified(userId);
    const customerUpdated =
      await bankVerificationRepository.upsertCustomerBankVerified(userId);

    await auditLogService.log({
      userId,
      action: 'BANK_VERIFIED',
      entity: 'bank_verifications',
      metadata: {
        accountNumberMasked,
        bankName: input.bankName.trim(),
        ifscCode,
        timestamp: verifiedAt.toISOString(),
        ipAddress: meta?.ipAddress ?? null,
        device: meta?.userAgent ?? null,
      },
    });

    return {
      status: BankVerificationStatus.VERIFIED as const,
      bankVerified: true as const,
      accountNumberMasked,
      bankName: input.bankName.trim(),
      verificationStatus: customerUpdated.verificationStatus,
      nextStep: 'VERIFICATION_SUMMARY' as const,
      verifiedAt,
    };
  }
}

export const bankVerificationService = new BankVerificationService();
