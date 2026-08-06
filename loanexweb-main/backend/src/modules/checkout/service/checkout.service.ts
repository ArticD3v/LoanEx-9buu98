import { CheckoutSessionStatus, PurchaseType, type Product, type product_variants as ProductVariant } from '@prisma/client';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { auditLogService } from '../../verification/service/audit-log.service';
import type { CreateCheckoutBody } from '../dto/checkout.dto';
import { checkoutRepository } from '../repository/checkout.repository';

function toNumber(value: { toNumber?: () => number } | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function buildSummary(
  product: Product,
  quantity: number,
  variant?: ProductVariant | null,
) {
  const mrp = toNumber(variant?.price ?? product.price);
  const rawDiscount = variant ? variant.discountPrice : product.discountPrice;
  const unitPrice = rawDiscount == null ? mrp : toNumber(rawDiscount);
  const deliveryCharges = toNumber(product.deliveryCharge);
  const productPrice = unitPrice * quantity;
  const discount = Math.max(mrp - unitPrice, 0) * quantity;
  const totalAmount = productPrice + deliveryCharges;
  const stock = variant?.stock ?? product.stock;
  const images = variant ? parseImages(variant.images) : [];

  return {
    product: {
      id: product.id,
      name: product.name,
      brand: product.brand,
      sku: variant?.sku ?? product.sku,
      imageUrl: images[0] ?? product.image,
      inStock: (product.status === 'active' || (product as any).isActive !== false) && stock > 0,
      stockQuantity: stock,
    },
    quantity,
    pricing: {
      unitPrice,
      mrp,
      productPrice,
      discount,
      deliveryCharges,
      totalAmount,
    },
  };
}

function resolveVariant(
  product: any,
  variantId?: string,
) {
  const variants = product.variants ?? [];
  if (variants.length === 0) {
    if (variantId) {
      throw new BadRequestError('This product has no variants.', { code: 'INVALID_VARIANT' });
    }
    return null;
  }

  const variant =
    (variantId
      ? product.variants.find((row) => row.id === variantId)
      : product.variants.find((row) => row.isDefault) ?? product.variants[0]) ?? null;

  if (!variant) {
    throw new BadRequestError('Invalid product variant.', { code: 'INVALID_VARIANT' });
  }

  return variant;
}

export class CheckoutService {
  async getSummary(userId: string, productId: string, quantity = 1, variantId?: string) {
    const qty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    const product = await checkoutRepository.findProductById(productId);
    if (!product) throw new NotFoundError('Product not found.');

    const variant = resolveVariant(product, variantId);
    const profile = await checkoutRepository.findProfile(userId);
    const addresses = await checkoutRepository.findShippingAddresses(userId);
    const address = addresses.find((row) => row.isDefault) ?? addresses[0] ?? null;

    const summary = buildSummary(product, qty, variant);

    const mapAddressRow = (row: any) => {
      if (!row) return null;
      const line1 = row.house_number ?? (row.fullAddress ? row.fullAddress.split(',')[0] : 'Address Line 1');
      const line2 = row.street ?? row.apartment ?? row.area ?? '';
      return {
        id: row.id,
        addressLine1: line1,
        addressLine2: line2,
        landmark: row.landmark ?? null,
        city: row.city ?? '',
        state: row.state ?? '',
        pincode: row.pincode ?? '',
        country: 'India',
        isDefault: row.is_default ?? false,
      };
    };

    return {
      ...summary,
      prerequisites: {
        profileCompleted: Boolean(profile),
        addressCompleted: addresses.length > 0,
        readyForCheckout: Boolean(profile && addresses.length > 0),
      },
      address: mapAddressRow(address),
      addresses: addresses.map(mapAddressRow),
      purchaseOptions: [
        { code: 'EMI', label: 'Buy with EMI', description: 'Pay in easy monthly instalments.' },
        { code: 'DIRECT', label: 'Buy Direct', description: 'Pay the full amount now.' },
      ],
    };
  }

  async create(userId: string, input: CreateCheckoutBody) {
    const profile = await checkoutRepository.findProfile(userId);
    if (!profile) {
      throw new BadRequestError('Complete personal information before checkout.', {
        code: 'PROFILE_REQUIRED',
      });
    }

    let address = input.addressId
      ? await checkoutRepository.findShippingAddressForUser(input.addressId, userId)
      : await checkoutRepository.findDefaultShippingAddress(userId);

    if (input.addressId && !address) {
      throw new BadRequestError('Selected shipping address was not found.', {
        code: 'ADDRESS_NOT_FOUND',
      });
    }

    if (!address) {
      throw new BadRequestError('Add a shipping address before checkout.', {
        code: 'ADDRESS_REQUIRED',
      });
    }

    const product = await checkoutRepository.findProductById(input.productId);
    if (!product) throw new NotFoundError('Product not found.');

    const variant = resolveVariant(product, input?.id);
    const stock = variant?.stock ?? product.stock;

    if ((product.status !== 'active' && (product as any).isActive === false) || stock <= 0) {
      throw new BadRequestError(
        variant ? 'Selected variant is out of stock.' : 'Product is out of stock.',
        { code: 'OUT_OF_STOCK' },
      );
    }

    if (input.quantity > stock) {
      throw new BadRequestError(`Only ${stock} unit(s) available in stock.`, {
        code: 'INSUFFICIENT_STOCK',
        available: stock,
      });
    }

    const summary = buildSummary(product, input.quantity, variant);
    const purchaseType = input.purchaseType as PurchaseType;

    const session = await checkoutRepository.createSession({
      userId,
      productId: product.id,
      quantity: input.quantity,
      purchaseType,
      addressId: address.id,
      totalAmount: summary.pricing.totalAmount,
      status:
        purchaseType === PurchaseType.DIRECT
          ? CheckoutSessionStatus.PENDING_PAYMENT
          : CheckoutSessionStatus.CREATED,
    });

    const redirectPath =
      purchaseType === PurchaseType.EMI ? '/verification' : '/checkout/payment';

    await auditLogService.log({
      userId,
      action: 'CHECKOUT_SESSION_CREATED',
      entity: 'checkout_sessions',
      metadata: {
        sessionId: session.id,
        productId: product.id,
        purchaseType,
        quantity: input.quantity,
        totalAmount: summary.pricing.totalAmount,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      session: {
        id: session.id,
        userId: session.userId,
        productId: session.productId,
        quantity: session.quantity,
        purchaseType: session.purchaseType,
        addressId: session.addressId,
        totalAmount: toNumber(session.totalAmount),
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      summary,
      redirectPath,
      nextStep: purchaseType === PurchaseType.EMI ? 'EMI_VERIFICATION' : 'DIRECT_PAYMENT',
    };
  }

  async getSession(userId: string, sessionId: string) {
    const session = await checkoutRepository.findSessionForUser(sessionId, userId);
    if (!session) throw new NotFoundError('Checkout session not found.');
    if (session.userId !== userId) {
      throw new ForbiddenError('You can only access your own checkout session.');
    }

    const summary = buildSummary(session.product, session.quantity, session.variant);
    return {
      session: {
        id: session.id,
        userId: session.userId,
        productId: session.productId,
        quantity: session.quantity,
        purchaseType: session.purchaseType,
        addressId: session.addressId,
        totalAmount: toNumber(session.totalAmount),
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      summary,
    };
  }
}

export const checkoutService = new CheckoutService();
