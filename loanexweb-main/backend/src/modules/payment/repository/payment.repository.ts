import {
  EmiApplicationStatus,
  OrderStatus,
  PaymentStatus,
  PaymentType,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../../config/database';

const PAYABLE_STATUSES: EmiApplicationStatus[] = [
  EmiApplicationStatus.APPROVED,
  EmiApplicationStatus.OFFER_ACCEPTED,
  EmiApplicationStatus.DOWN_PAYMENT_PENDING,
];

export class PaymentRepository {
  findApplicationForUser(applicationId: string, userId: string) {
    return prisma.emi_applications.findFirst({
      where: { id: applicationId, userId },
      include: { order: true },
    });
  }

  findLatestApplicationForUser(userId: string) {
    return prisma.emi_applications.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { order: true },
    });
  }

  findUserById(userId: string) {
    return prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
      },
    });
  }

  findSuccessDownPayment(applicationId: string) {
    return prisma.paymentTransaction.findFirst({
      where: {
        applicationId,
        paymentType: PaymentType.DOWN_PAYMENT,
        paymentStatus: PaymentStatus.SUCCESS,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByRazorpayOrderId(razorpayOrderId: string) {
    return prisma.paymentTransaction.findUnique({
      where: { razorpayOrderId },
    });
  }

  listByApplicationId(applicationId: string, userId: string) {
    return prisma.paymentTransaction.findMany({
      where: { applicationId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createTransaction(data: {
    applicationId: string;
    userId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
  }) {
    return prisma.paymentTransaction.create({
      data: {
        applicationId: data.applicationId,
        userId: data.userId,
        razorpayOrderId: data.razorpayOrderId,
        amount: data.amount,
        currency: data.currency,
        paymentStatus: PaymentStatus.CREATED,
        paymentType: PaymentType.DOWN_PAYMENT,
      },
    });
  }

  markPending(id: string) {
    return prisma.paymentTransaction.update({
      where: { id },
      data: { paymentStatus: PaymentStatus.PENDING },
    });
  }

  markFailed(id: string) {
    return prisma.paymentTransaction.update({
      where: { id },
      data: { paymentStatus: PaymentStatus.FAILED },
    });
  }

  completePaymentAndCreateOrder(input: {
    transactionId: string;
    applicationId: string;
    userId: string;
    productId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    orderNumber: string;
  }) {
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7);

    return prisma.$transaction(async (tx) => {
      const payment = await tx.paymentTransaction.update({
        where: { id: input.transactionId },
        data: {
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
          paymentStatus: PaymentStatus.SUCCESS,
        },
      });

      const application = await tx.emiApplication.update({
        where: { id: input.applicationId },
        data: { status: EmiApplicationStatus.ACTIVE_EMI },
      });

      const existing = await tx.order.findUnique({
        where: { applicationId: input.applicationId },
      });

      const order =
        existing ??
        (await tx.order.create({
          data: {
            orderNumber: input.orderNumber,
            applicationId: input.applicationId,
            userId: input.userId,
            productId: input.productId,
            /* productBrand:
              input.productId === 'hp-pavilion-15'
                ? 'HP'
                : input.productId === 'iphone-15'
                  ? 'Apple'
                  : input.productId === 'samsung-tv-55'
                    ? 'Samsung'
                    : 'LoanEx', */
            quantity: 1,
            paymentTransactionId: payment.id,
            orderStatus: OrderStatus.ORDER_CONFIRMED,
            estimatedDeliveryDate,
            courierPartner: 'LoanEx Express',
            trackingNumber: `LXTRK${Date.now().toString().slice(-10)}`,
            warehouse: 'LoanEx Central Warehouse, Mumbai',
            deliveryAddress: 'Customer registered address',
          },
        }));

      if (existing && !existing.paymentTransactionId) {
        await tx.order.update({
          where: { id: existing.id },
          data: {
            paymentTransactionId: payment.id,
            orderStatus: OrderStatus.ORDER_CONFIRMED,
            estimatedDeliveryDate: existing.estimatedDeliveryDate ?? estimatedDeliveryDate,
          },
        });
      }

      const freshOrder = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
      });

      const hasTracking = await tx.orderTracking.count({ where: { orderId: freshOrder.id } });
      if (hasTracking === 0) {
        await tx.orderTracking.create({
          data: {
            orderId: freshOrder.id,
            status: 'ORDER_CONFIRMED',
            remarks: 'Order confirmed after successful down payment',
            updatedBy: 'system',
            location: freshOrder.warehouse ?? 'LoanEx Central Warehouse, Mumbai',
          },
        });
      }

      return { payment, application, order: freshOrder };
    });
  }

  setApplicationDownPaymentPending(applicationId: string) {
    return prisma.emi_applications.update({
      where: { id: applicationId },
      data: { status: EmiApplicationStatus.DOWN_PAYMENT_PENDING },
    });
  }

  countOrdersToday(prefix: string) {
    return prisma.orders.count({
      where: { orderNumber: { startsWith: prefix } },
    });
  }

  findOrderByApplication(applicationId: string, userId: string) {
    return prisma.orders.findFirst({
      where: { applicationId, userId },
      include: {
        application: true,
      },
    });
  }

  findOrderByNumber(orderNumber: string, userId: string) {
    return prisma.orders.findFirst({
      where: { orderNumber, userId },
      include: { application: true },
    });
  }

  isPayableStatus(status: EmiApplicationStatus): boolean {
    return PAYABLE_STATUSES.includes(status);
  }
}

export const paymentRepository = new PaymentRepository();

export type DecimalLike = Prisma.Decimal | number | null | undefined;
