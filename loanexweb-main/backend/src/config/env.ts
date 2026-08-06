import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_NAME: z.string().default('LoanEx API'),
  API_PREFIX: z.string().default('/api/v1'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:4200'),
  OTP_LENGTH: z.coerce.number().default(6),
  OTP_EXPIRES_MINUTES: z.coerce.number().default(10),
  OTP_DEV_ECHO: z
    .string()
    .optional()
    .transform((value) => value !== 'false'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  /** Global / general API budget per IP per window (production). */
  RATE_LIMIT_MAX: z.coerce.number().default(2_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(60),
  MOBILE_OTP_EXPIRES_MINUTES: z.coerce.number().default(5),
  MOBILE_OTP_MAX_RESEND: z.coerce.number().default(3),
  MOBILE_OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  MOBILE_OTP_RESEND_COOLDOWN_MS: z.coerce.number().default(30_000),
  AADHAAR_OTP_EXPIRES_MINUTES: z.coerce.number().default(5),
  AADHAAR_OTP_MAX_RESEND: z.coerce.number().default(3),
  AADHAAR_OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  AADHAAR_OTP_RESEND_COOLDOWN_MS: z.coerce.number().default(60_000),
  VERIFICATION_RATE_LIMIT_MAX: z.coerce.number().default(120),
  RAZORPAY_KEY_ID: z.string().min(1).default('rzp_test_loanex_key'),
  RAZORPAY_KEY_SECRET: z.string().min(1).default('loanex_razorpay_test_secret'),
  RAZORPAY_CURRENCY: z.string().default('INR'),
  GST_PERCENT: z.coerce.number().default(18),
  EMI_LATE_FEE_PERCENT: z.coerce.number().default(2),
  AUTOPAY_PROVIDER: z.string().default('STUB'),
  PAYMENT_DEV_BYPASS: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
