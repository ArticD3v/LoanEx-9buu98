import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import type { VerifyPaymentBody } from '../validator/payment.validator';
import { paymentService } from '../service/payment.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class PaymentController {
  getContext = async (req: Request, res: Response) => {
    const data = await paymentService.getDownPaymentContext(
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Down payment context loaded');
  };

  createOrder = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const data = await paymentService.createOrder(requireUserId(authReq), {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    return sendSuccess(res, data, 'Razorpay order created', 201);
  };

  verify = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as VerifyPaymentBody;
    const data = await paymentService.verifyPayment(requireUserId(authReq), body, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    return sendSuccess(res, data, 'Payment verified successfully');
  };

  getByApplicationId = async (req: Request, res: Response) => {
    const applicationId = String(req.params.applicationId ?? '');
    const data = await paymentService.getByApplicationId(
      applicationId,
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Payment details fetched');
  };

  getOrderConfirmation = async (req: Request, res: Response) => {
    const orderNumber =
      typeof req.query.orderNumber === 'string' ? req.query.orderNumber : undefined;
    const data = await paymentService.getOrderConfirmation(
      requireUserId(req as AuthenticatedRequest),
      orderNumber,
    );
    return sendSuccess(res, data, 'Order confirmation loaded');
  };

  createDevBypassSignature = async (req: Request, res: Response) => {
    const razorpayOrderId = String((req.body as { razorpayOrderId?: string })?.razorpayOrderId ?? '');
    const data = await paymentService.createDevBypassSignature(
      requireUserId(req as AuthenticatedRequest),
      razorpayOrderId,
    );
    return sendSuccess(res, data, 'Dev payment signature created');
  };
}

export const paymentController = new PaymentController();
