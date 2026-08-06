import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { validateRequest } from '../../common/middleware/validate';
import { asyncHandler } from '../../common/utils/async-handler';
import { emiApplicationController } from '../emi-application/controller/emi-application.controller';
import { emiPaymentController } from '../emi-payment/controller/emi-payment.controller';
import { autopayController } from '../autopay/controller/autopay.controller';
import { adminUpdateAutopaySchema } from '../autopay/validator/autopay.validator';
import { loanController } from '../loan/controller/loan.controller';
import { adminUpdateLoanSchema } from '../loan/validator/loan.validator';
import { notificationController } from '../notifications/controller/notification.controller';
import { adminCreateNotificationSchema } from '../notifications/validator/notification.validator';
import { orderController } from '../order/controller/order.controller';
import { adminUpdateOrderStatusSchema } from '../order/validator/order.validator';

export const adminRouter = Router();

adminRouter.use(authenticate);

adminRouter.get(
  '/emi-applications',
  asyncHandler(emiApplicationController.listForAdmin),
);

adminRouter.post(
  '/emi-applications/:applicationId/approve',
  asyncHandler(emiApplicationController.adminApprove),
);

adminRouter.patch(
  '/orders/:orderId/status',
  validateRequest(adminUpdateOrderStatusSchema),
  asyncHandler(orderController.adminUpdateStatus),
);

adminRouter.get('/loans', asyncHandler(loanController.listForAdmin));
adminRouter.get('/loans/:loanId', asyncHandler(loanController.getForAdmin));
adminRouter.patch(
  '/loans/:loanId',
  validateRequest(adminUpdateLoanSchema),
  asyncHandler(loanController.adminUpdate),
);
adminRouter.get('/emi-payments', asyncHandler(emiPaymentController.listForAdmin));

adminRouter.get('/autopay', asyncHandler(autopayController.listForAdmin));
adminRouter.get('/autopay/:loanId', asyncHandler(autopayController.getForAdmin));
adminRouter.patch(
  '/autopay/:loanId',
  validateRequest(adminUpdateAutopaySchema),
  asyncHandler(autopayController.adminUpdate),
);

adminRouter.get('/notifications', asyncHandler(notificationController.listForAdmin));
adminRouter.post(
  '/notifications',
  validateRequest(adminCreateNotificationSchema),
  asyncHandler(notificationController.adminCreate),
);
adminRouter.delete(
  '/notifications/:id',
  asyncHandler(notificationController.adminDelete),
);
