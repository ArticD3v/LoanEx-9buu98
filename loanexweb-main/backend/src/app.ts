import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOrigins, env } from './config/env';
import { setupSwagger } from './config/swagger';
import { errorHandler, notFoundHandler } from './common/middleware/error-handler';
import { createRateLimiter } from './common/middleware/rate-limiter';
import { authRouter } from './modules/auth';
import { adminRouter } from './modules/admin';
import { bankVerificationRouter } from './modules/bank-verification';
import { emiApplicationRouter } from './modules/emi-application';
import { panVerificationRouter } from './modules/pan-verification';
import { paymentRouter } from './modules/payment';
import { orderRouter } from './modules/order';
import { loanRouter } from './modules/loan';
import { emiPaymentRouter } from './modules/emi-payment';
import { emiPaymentHistoryRouter, emiStatementRouter } from './modules/emi-history';
import { autopayRouter } from './modules/autopay';
import { notificationRouter } from './modules/notifications';
import { profileRouter } from './modules/profile';
import { checkoutRouter } from './modules/checkout';
import { cartRouter } from './modules/cart';
import { wishlistRouter } from './modules/wishlist';
import { productRouter } from './modules/product';
import { categoryRouter } from './modules/category';
import { reviewsRouter } from './modules/reviews';
import { supportRouter } from './modules/support';
import { verificationRouter } from './modules/verification';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.use(
    createRateLimiter({
      max: env.RATE_LIMIT_MAX,
      message: {
        success: false,
        message: 'Too many requests. Please try again later.',
        code: 'TOO_MANY_REQUESTS',
      },
    }),
  );

  setupSwagger(app);

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: 'OK',
      data: {
        service: env.APP_NAME,
        env: env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use(`${env.API_PREFIX}/auth`, authRouter);
  app.use(`${env.API_PREFIX}/verification`, verificationRouter);
  app.use(`${env.API_PREFIX}/verification/pan`, panVerificationRouter);
  app.use(`${env.API_PREFIX}/verification/bank`, bankVerificationRouter);
  app.use(`${env.API_PREFIX}/emi/applications`, emiApplicationRouter);
  app.use(`${env.API_PREFIX}/payments`, paymentRouter);
  app.use(`${env.API_PREFIX}/orders`, orderRouter);
  app.use(`${env.API_PREFIX}/loans`, loanRouter);
  app.use(`${env.API_PREFIX}/emi/payments`, emiPaymentRouter);
  app.use(`${env.API_PREFIX}/emi/payment-history`, emiPaymentHistoryRouter);
  app.use(`${env.API_PREFIX}/emi/statement`, emiStatementRouter);
  app.use(`${env.API_PREFIX}/autopay`, autopayRouter);
  app.use(`${env.API_PREFIX}/notifications`, notificationRouter);
  app.use(`${env.API_PREFIX}/profile`, profileRouter);
  app.use(`${env.API_PREFIX}/checkout`, checkoutRouter);
  app.use(`${env.API_PREFIX}/cart`, cartRouter);
  app.use(`${env.API_PREFIX}/wishlist`, wishlistRouter);
  app.use(`${env.API_PREFIX}/products`, productRouter);
  app.use(`${env.API_PREFIX}/categories`, categoryRouter);
  app.use(`${env.API_PREFIX}/reviews`, reviewsRouter);
  app.use(`${env.API_PREFIX}/support`, supportRouter);
  app.use(`${env.API_PREFIX}/admin`, adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
