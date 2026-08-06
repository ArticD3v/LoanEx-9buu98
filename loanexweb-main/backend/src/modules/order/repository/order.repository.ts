import {
  EmiApplicationStatus,
  OrderStatus,
  OrderTrackingStatus,
} from '@prisma/client';
import { prisma } from '../../../config/database';

const STATUS_FLOW: OrderStatus[] = [
  OrderStatus.ORDER_CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

function mapOrderRecord(order: any) {
  if (!order) return null;
  const items = (order.items as any[]) ?? [];
  const profile = order.profiles_orders_user_idToprofiles ?? order.profiles_orders_profile_idToprofiles;
  const rawMethod = String(order.paymentMethod ?? '').toUpperCase();
  const paymentMethod = rawMethod === 'EMI' ? 'EMI' : 'FULL PAYMENT';
  const rawStatus = String(order.status ?? order.payment_status ?? 'CONFIRMED').toUpperCase();
  const orderStatus = (rawStatus === 'PENDING' && paymentMethod === 'FULL PAYMENT') ? 'CONFIRMED' : rawStatus;

  return {
    ...order,
    orderNumber: order.id ? `ORD-${order.id.slice(0, 8).toUpperCase()}` : 'ORD-0000',
    applicationId: order.emi_applications?.id ?? null,
    productId: items[0]?.productId ?? '',
    productBrand: null,
    totalAmount: order.totalAmount ?? order.total ?? 0,
    paymentMethod,
    orderStatus,
    createdAt: order.createdAt ?? new Date(),
    application: order.emi_applications ?? {
      id: order.id,
      sellingPrice: order.totalAmount ?? order.total ?? 0,
      productName: 'Product',
      emiAmount: 0,
      tenure: 0,
    },
    paymentTransaction: null,
    trackingEvents: [],
    user: profile
      ? {
          id: profile.id,
          fullName: profile.fullName ?? 'Customer',
          email: profile.email ?? '',
          mobile: profile.mobileNumber ?? '',
        }
      : null,
  };
}

export class OrderRepository {
  async listForUser(userId: string) {
    const rows = await prisma.orders.findMany({
      where: { OR: [{ userId }, { profileId: userId }] } as any,
      orderBy: { createdAt: 'desc' },
      include: {
        emi_applications: true,
        profiles_orders_user_idToprofiles: true,
      },
    });
    return rows.map(mapOrderRecord);
  }

  async adminListAll() {
    const rows = await prisma.orders.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        emi_applications: true,
        profiles_orders_user_idToprofiles: true,
      },
    });
    return rows.map(mapOrderRecord);
  }

  async findLatestForUser(userId: string) {
    const row = await prisma.orders.findFirst({
      where: { OR: [{ userId }, { profileId: userId }] } as any,
      orderBy: { createdAt: 'desc' },
      include: {
        emi_applications: true,
        profiles_orders_user_idToprofiles: true,
      },
    });
    return mapOrderRecord(row);
  }

  async findByIdForUser(orderId: string, userId: string) {
    const row = await prisma.orders.findFirst({
      where: { id: orderId, OR: [{ userId }, { profileId: userId }] } as any,
      include: {
        emi_applications: true,
        profiles_orders_user_idToprofiles: true,
      },
    });
    return mapOrderRecord(row);
  }

  async findById(orderId: string) {
    const row = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        emi_applications: true,
        profiles_orders_user_idToprofiles: true,
      },
    });
    return mapOrderRecord(row);
  }

  async findByApplicationId(applicationId: string) {
    const row = await prisma.orders.findFirst({
      where: { profileId: applicationId } as any,
    });
    return mapOrderRecord(row);
  }

  countOrdersToday(prefix: string) {
    return prisma.orders.count();
  }

  async createOnApproval(input: {
    orderNumber: string;
    applicationId: string;
    userId: string;
    productId: string;
    productBrand?: string | null;
    deliveryAddress: string;
  }) {
    const created = await prisma.orders.create({
      data: {
        userId: input.userId,
        profileId: input.userId,
        status: OrderStatus.ORDER_CONFIRMED,
        items: [{ productId: input.productId, quantity: 1 }],
      },
    });
    return mapOrderRecord(created);
  }

  updateReceiptPath(orderId: string, receiptPath: string) {
    return prisma.orders.update({
      where: { id: orderId },
      data: { notes: receiptPath },
    });
  }

  updateInvoicePath(orderId: string, invoicePath: string) {
    return prisma.orders.update({
      where: { id: orderId },
      data: { notes: invoicePath },
    });
  }

  createTrackingEvent(input: any) {
    return null;
  }

  async updateStatus(input: {
    orderId: string;
    status: OrderStatus;
    remarks?: string | null;
    updatedBy?: string | null;
    location?: string | null;
    courierPartner?: string | null;
    trackingNumber?: string | null;
    warehouse?: string | null;
    deliveryAddress?: string | null;
  }) {
    const updated = await prisma.orders.update({
      where: { id: input.orderId },
      data: {
        status: input.status,
      },
      include: {
        emi_applications: true,
        profiles_orders_user_idToprofiles: true,
      },
    });
    return mapOrderRecord(updated);
  }

  nextAllowedStatus(current: OrderStatus): OrderStatus | null {
    const index = STATUS_FLOW.indexOf(current);
    if (index < 0 || index >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[index + 1];
  }

  isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
    return this.nextAllowedStatus(from) === to;
  }
}

export const orderRepository = new OrderRepository();
export { OrderStatus, OrderTrackingStatus, STATUS_FLOW };
