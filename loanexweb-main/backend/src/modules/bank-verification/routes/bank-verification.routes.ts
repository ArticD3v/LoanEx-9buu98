import { Router } from 'express';
import { createRateLimiter } from '../../../common/middleware/rate-limiter';
import { authenticate } from '../../../common/middleware/authenticate';
import { validateRequest } from '../../../common/middleware/validate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { env } from '../../../config/env';
import { bankVerificationController } from '../controller/bank-verification.controller';
import { verifyBankBodySchema } from '../validator/bank-verification.validator';

const bankRateLimiter = createRateLimiter({
  max: env.VERIFICATION_RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many verification requests. Please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const bankVerificationRouter = Router();

bankVerificationRouter.use(authenticate);
bankVerificationRouter.use(bankRateLimiter);

bankVerificationRouter.get('/status', asyncHandler(bankVerificationController.getStatus));

bankVerificationRouter.post(
  '/verify',
  validateRequest(verifyBankBodySchema),
  asyncHandler(bankVerificationController.verify),
);
