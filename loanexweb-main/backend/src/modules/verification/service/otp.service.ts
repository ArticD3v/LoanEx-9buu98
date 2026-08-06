import { env } from '../../../config/env';
import { generateOtp, getOtpExpiryDate } from '../../../common/utils/otp';
import { hashToken } from '../../../common/utils/jwt';

export class OtpService {
  generate(length = env.OTP_LENGTH): string {
    return generateOtp(length);
  }

  hash(otp: string): string {
    return hashToken(otp);
  }

  matches(otp: string, hash: string): boolean {
    return this.hash(otp) === hash;
  }

  getExpiry(minutes: number): Date {
    return getOtpExpiryDate(minutes);
  }

  isExpired(expiresAt: Date | null | undefined): boolean {
    if (!expiresAt) return true;
    return expiresAt.getTime() <= Date.now();
  }

  logDev(label: string, destination: string, otp: string): void {
    if (env.OTP_DEV_ECHO || env.NODE_ENV !== 'production') {
      console.info(`[${label}] destination=${destination} otp=${otp}`);
    }
  }

  devPayload(otp: string): { devOtp?: string } {
    if (env.OTP_DEV_ECHO || env.NODE_ENV !== 'production') {
      return { devOtp: otp };
    }
    return {};
  }
}

export const otpService = new OtpService();
