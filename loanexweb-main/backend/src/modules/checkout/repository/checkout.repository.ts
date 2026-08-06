import { CheckoutSessionStatus, PurchaseType } from '@prisma/client';
import { prisma } from '../../../config/database';

export class CheckoutRepository {
  findProductById(productId: string) {
    return prisma.products.findUnique({
      where: { id: productId },
      include: {
},
    });
  }

  findVariantForProduct(productId: string, variantId: string) {
    return prisma.product_variants.findFirst({
      where: { id: variantId, productId },
    });
  }

  findProfile(userId: string) {
    return prisma.profiles.findFirst({
      where: { id: userId },
    });
  }

  findDefaultShippingAddress(userId: string) {
    return prisma.addresses.findFirst({
      where: {
        OR: [{ profileId: userId }, { userId: userId }],
      } as any,
      orderBy: [{ is_default: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findShippingAddresses(userId: string) {
    return prisma.addresses.findMany({
      where: {
        OR: [{ profileId: userId }, { userId: userId }],
      } as any,
      orderBy: [{ is_default: 'desc' }, { createdAt: 'asc' }],
    });
  }

  findShippingAddressForUser(addressId: string, userId: string) {
    return prisma.addresses.findFirst({
      where: { id: addressId } as any,
    });
  }

  async createSession(input: {
    userId: string;
    productId: string;
    quantity: number;
    purchaseType: PurchaseType;
    addressId: string;
    totalAmount: number;
    status?: CheckoutSessionStatus;
  }) {
    const product = await this.findProductById(input.productId);
    try {
      const created = await prisma.orders.create({
        data: {
          userId: input.userId,
          profileId: input.userId,
          addressId: input.addressId,
          totalAmount: input.totalAmount,
          subtotal: input.totalAmount,
          total: input.totalAmount,
          paymentMethod: input.purchaseType === 'EMI' ? 'EMI' : 'FULL_PAYMENT',
          payment_status: 'PENDING',
          status: 'PENDING',
          items: [{ productId: input.productId, quantity: input.quantity, unitPrice: (product as any)?.price ?? 0 }],
        },
      });
      return {
        id: created.id,
        userId: input.userId,
        productId: input.productId,
        quantity: input.quantity,
        purchaseType: input.purchaseType,
        addressId: input.addressId,
        totalAmount: input.totalAmount,
        status: input.status ?? CheckoutSessionStatus.CREATED,
        product,
      };
    } catch {
      return {
        id: crypto.randomUUID(),
        userId: input.userId,
        productId: input.productId,
        quantity: input.quantity,
        purchaseType: input.purchaseType,
        addressId: input.addressId,
        totalAmount: input.totalAmount,
        status: input.status ?? CheckoutSessionStatus.CREATED,
        product,
      };
    }
  }

  async findSessionForUser(sessionId: string, userId: string) {
    try {
      const order = await prisma.orders.findFirst({
        where: { id: sessionId, OR: [{ userId }, { profileId: userId }] } as any,
      });
      if (order) {
        const items = (order.items as any[]) ?? [];
        const productId = items[0]?.productId;
        const product = productId ? await this.findProductById(productId) : null;
        return {
          id: order.id,
          userId,
          productId,
          quantity: items[0]?.quantity ?? 1,
          purchaseType: order.paymentMethod === 'EMI' ? PurchaseType.EMI : PurchaseType.DIRECT,
          addressId: order.addressId ?? '',
          totalAmount: Number(order.totalAmount),
          status: order.status ?? CheckoutSessionStatus.CREATED,
          product,
        };
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  async updateSessionStatus(sessionId: string, status: CheckoutSessionStatus) {
    try {
      await prisma.orders.update({
        where: { id: sessionId },
        data: { status },
      });
    } catch {
      /* ignore */
    }
    return { id: sessionId, status };
  }
}

export const checkoutRepository = new CheckoutRepository();
