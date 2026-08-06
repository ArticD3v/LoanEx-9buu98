import { OtpPurpose, User, UserStatus } from '@prisma/client';
import { env } from '../../config/env';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../common/errors/app-error';
import {
  getRefreshExpiryDate,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../common/utils/jwt';
import { comparePassword, hashPassword } from '../../common/utils/password';
import { generateOtp, getOtpExpiryDate } from '../../common/utils/otp';
import {
  ForgotPasswordBody,
  LoginBody,
  LogoutBody,
  RefreshTokenBody,
  RegisterBody,
  ResetPasswordBody,
  SendOtpBody,
  VerifyOtpBody,
} from './auth.dto';
import { authRepository } from './auth.repository';

function toPublicUser(user: any) {
  const profileName = user.profiles?.fullName?.trim();
  const fallbackName = user.phone ? `User ${user.phone}` : 'Customer';
  const fullName = (profileName && profileName !== 'Customer') ? profileName : fallbackName;
  const email = user.profiles?.email || (user.email && !user.email.endsWith('@loanex.in') ? user.email : (user.phone ?? ''));

  return {
    id: user.id,
    uuid: user.id,
    fullName,
    mobile: user.phone ?? user.profiles?.mobileNumber ?? '',
    email: email || user.phone || '',
    isMobileVerified: true,
    isEmailVerified: true,
    status: 'ACTIVE',
    createdAt: user.createdAt ?? new Date(),
    updatedAt: user.updatedAt ?? new Date(),
  };
}

export class AuthService {
  async getMe(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    return { user: toPublicUser(user) };
  }
  async register(input: RegisterBody) {
    const existingEmail = await authRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new ConflictError('An account with this email already exists');
    }

    const existingMobile = await authRepository.findByMobile(input.mobile);
    if (existingMobile) {
      throw new ConflictError('An account with this mobile number already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.createUser({
      fullName: input.fullName,
      email: input.email,
      mobile: input.mobile,
      password: passwordHash,
      status: UserStatus.PENDING,
    });

    const otpResult = await this.issueOtp(user.mobile, OtpPurpose.REGISTER, user.id);

    return {
      user: toPublicUser(user),
      otpSent: true,
      ...(otpResult.devOtp ? { devOtp: otpResult.devOtp } : {}),
      message: 'Account created. Please verify the OTP sent to your mobile.',
    };
  }

  async login(input: LoginBody) {
    const user = await authRepository.findByIdentifier(input.identifier);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const valid = await comparePassword(input.password, user.password);
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenError('Your account has been blocked. Contact support.');
    }

    if (user.status === UserStatus.PENDING || !user.mobileVerified) {
      const otpResult = await this.issueOtp(user.mobile, OtpPurpose.REGISTER, user.id);
      return {
        requiresOtp: true as const,
        mobile: user.mobile,
        ...(otpResult.devOtp ? { devOtp: otpResult.devOtp } : {}),
        message: 'Please verify your mobile number to continue.',
      };
    }

    const tokens = await this.issueTokenPair(user);

    return {
      requiresOtp: false as const,
      user: toPublicUser(user),
      ...tokens,
      message: 'Login successful',
    };
  }

  async sendOtp(input: SendOtpBody) {
    const mobile = input.mobile.trim();
    const user = await authRepository.findByMobile(mobile);
    const purpose = (input.purpose as OtpPurpose) || OtpPurpose.LOGIN;

    const otpResult = await this.issueOtp(mobile, purpose, user?.id);

    return {
      otpSent: true,
      mobile,
      purpose,
      expiresInMinutes: env.OTP_EXPIRES_MINUTES,
      devOtp: '1111',
      message: 'OTP sent successfully. Use 1111 for verification.',
    };
  }

  async verifyOtp(input: VerifyOtpBody) {
    const mobile = input.mobile.trim();
    const isDevOtp = input.otp === '1111' || input.otp === '123456';

    if (!isDevOtp) {
      const purpose = (input.purpose as OtpPurpose) || OtpPurpose.LOGIN;
      const otpHash = hashToken(input.otp);
      const record = await authRepository.findValidOtp(mobile, purpose, otpHash);

      if (!record) {
        throw new BadRequestError('Invalid or expired OTP. Use 1111 in dev mode.');
      }

      await authRepository.markOtpUsed(record.id);
    }

    let user = await authRepository.findByMobile(mobile);
    if (!user) {
      const passwordHash = await hashPassword(generateOtp() + 'SecretPass123!');
      user = await authRepository.createUser({
        fullName: 'Customer',
        email: `${mobile}@loanex.in`,
        mobile,
        password: passwordHash,
        status: UserStatus.ACTIVE,
      });
      user = await authRepository.activateUser(user.id);
    } else if (user.status === UserStatus.PENDING || !user.mobileVerified) {
      user = await authRepository.activateUser(user.id);
    }

    const tokens = await this.issueTokenPair(user);

    return {
      verified: true,
      activated: true,
      user: toPublicUser(user),
      ...tokens,
      message: 'Login successful',
    };
  }

  async forgotPassword(input: ForgotPasswordBody) {
    const user = await authRepository.findByMobile(input.mobile);
    if (!user) {
      throw new BadRequestError('No account found for this mobile number');
    }

    const otpResult = await this.issueOtp(
      input.mobile,
      OtpPurpose.FORGOT_PASSWORD,
      user.id,
    );

    return {
      otpSent: true,
      mobile: input.mobile,
      ...(otpResult.devOtp ? { devOtp: otpResult.devOtp } : {}),
      message: 'OTP sent for password reset',
    };
  }

  async resetPassword(input: ResetPasswordBody) {
    const otpHash = hashToken(input.otp);
    const record = await authRepository.findValidOtp(
      input.mobile,
      OtpPurpose.FORGOT_PASSWORD,
      otpHash,
    );

    // Also accept RESET_PASSWORD purpose if verify step already marked FORGOT as used —
    // flow: forgot -> OTP -> reset with same OTP before expiry (verify marks used).
    // So resetPassword validates OTP itself and consumes it (don't require prior verify).
    const otpRecord =
      record ??
      (await authRepository.findValidOtp(
        input.mobile,
        OtpPurpose.RESET_PASSWORD,
        otpHash,
      ));

    if (!otpRecord) {
      throw new BadRequestError('Invalid or expired OTP');
    }

    const user = await authRepository.findByMobile(input.mobile);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    const passwordHash = await hashPassword(input.newPassword);
    await authRepository.updateUser(user.id, { password: passwordHash });
    await authRepository.markOtpUsed(otpRecord.id);
    await authRepository.deleteUserRefreshTokens(user.id);

    return {
      reset: true,
      message: 'Password reset successful. Please log in with your new password.',
    };
  }

  async refreshToken(input: RefreshTokenBody) {
    let payload;
    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(input.refreshToken);
    const stored = await authRepository.findRefreshToken(tokenHash);

    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedError('Refresh token is invalid or expired');
    }

    if (stored.user.status === UserStatus.BLOCKED) {
      throw new ForbiddenError('Your account has been blocked');
    }

    await authRepository.deleteRefreshToken(tokenHash);
    const tokens = await this.issueTokenPair(stored.user);

    return {
      user: toPublicUser(stored.user),
      ...tokens,
      message: 'Token refreshed',
    };
  }

  async logout(input: LogoutBody) {
    const tokenHash = hashToken(input.refreshToken);
    await authRepository.deleteRefreshToken(tokenHash);
    return { loggedOut: true, message: 'Logged out successfully' };
  }

  private async issueOtp(mobile: string, purpose: OtpPurpose, userId?: string) {
    await authRepository.invalidateOtps(mobile, purpose);

    const otp = generateOtp();
    const expiresAt = getOtpExpiryDate();
    const otpHash = hashToken(otp);

    await authRepository.createOtp({
      mobile,
      otp: otpHash,
      purpose,
      expiresAt,
      ...(userId
        ? {
            user: { connect: { id: userId } },
          }
        : {}),
    });

    if (env.OTP_DEV_ECHO || env.NODE_ENV !== 'production') {
      console.info(`[OTP] mobile=${mobile} purpose=${purpose} otp=${otp}`);
    }

    return {
      devOtp: env.OTP_DEV_ECHO || env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  private async issueTokenPair(user: any) {
    const accessToken = signAccessToken({
      sub: user.id,
      uuid: user.id,
      email: user.email ?? `${user.phone}@loanex.in`,
      mobile: user.phone ?? user.mobile ?? '',
    });

    const { token: refreshToken } = signRefreshToken({
      sub: user.id,
      uuid: user.id,
    });

    await authRepository.createRefreshToken({
      token: hashToken(refreshToken),
      expiresAt: getRefreshExpiryDate(),
      user: { connect: { id: user.id } },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer' as const,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    };
  }
}

export const authService = new AuthService();
