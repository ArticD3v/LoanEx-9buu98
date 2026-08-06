import { prisma } from '../../../config/database';

export class VerificationRepository {
  // ─── KYC status from customer_kyc ───────────────────────────────────────────

  async findKycByUserId(userId: string) {
    return prisma.customer_kyc.findFirst({ where: { userId } });
  }

  async upsertKyc(
    userId: string,
    data: {
      aadharVerified?: boolean;
      aadhar_number?: string;
      aadharRawData?: any;
      fullName?: string;
      dob?: string;
      gender?: string;
      address?: any;
      pan_verified?: boolean;
      panNumber?: string;
      cibil_score?: number;
      experianRawData?: any;
      kycCompleted?: boolean;
      kycCompletedAt?: Date;
      face_verified?: boolean;
      faceMatchScore?: number;
      faceRawData?: any;
    },
  ) {
    const existing = await prisma.customer_kyc.findFirst({ where: { userId } });
    if (existing) {
      return prisma.customer_kyc.update({ where: { id: existing.id }, data });
    }
    return prisma.customer_kyc.create({ data: { userId, ...data } });
  }

  // ─── DigiLocker reports ──────────────────────────────────────────────────────

  async findDigilockerByProfileId(profileId: string) {
    return prisma.digilocker_reports.findFirst({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertDigilocker(
    profileId: string,
    data: {
      clientId?: string;
      name?: string;
      gender?: string;
      dob?: string;
      careOf?: string;
      yob?: string;
      zip?: string;
      masked_aadhaar?: string;
      fullAddress?: string;
      father_name?: string;
      profileImage?: string;
      xml_url?: string;
      rawData?: any;
    },
  ) {
    const existing = await prisma.digilocker_reports.findFirst({ where: { profileId } });
    if (existing) {
      return prisma.digilocker_reports.update({ where: { id: existing.id }, data });
    }
    return prisma.digilocker_reports.create({ data: { profileId, ...data } });
  }

  // ─── User helpers ────────────────────────────────────────────────────────────

  findUserById(userId: string) {
    return prisma.users.findUnique({ where: { id: userId }, include: { profiles: true } });
  }

  findProfileById(userId: string) {
    return prisma.profiles.findFirst({ where: { id: userId } });
  }

  // ─── KYC status summary ──────────────────────────────────────────────────────

  async getStatus(userId: string) {
    const kyc = await this.findKycByUserId(userId);
    const mobileVerified = true; // OTP login = mobile verified
    const aadhaarVerified = Boolean(kyc?.aadharVerified);
    const panVerified = Boolean(kyc?.pan_verified);
    const faceVerified = Boolean(kyc?.face_verified);
    const bankVerified = false; // extend later

    const completedSteps = [mobileVerified, aadhaarVerified, panVerified, faceVerified, bankVerified].filter(
      Boolean,
    ).length;

    const totalSteps = 5;
    const overallProgress = Math.round((completedSteps / totalSteps) * 100);

    return {
      mobileVerified,
      aadhaarVerified,
      panVerified,
      faceVerified,
      bankVerified,
      overallProgress,
      completedSteps,
      totalSteps,
      verificationStatus:
        completedSteps === 0
          ? 'NOT_STARTED'
          : completedSteps === totalSteps
            ? 'COMPLETED'
            : 'IN_PROGRESS',
      kyc,
      message: 'Status fetched',
    };
  }
}

export const verificationRepository = new VerificationRepository();
