import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { auditLogService } from '../../verification/service/audit-log.service';
import type { AddWishlistItemBody } from '../dto/wishlist.dto';
import { wishlistRepository } from '../repository/wishlist.repository';

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

type WishlistRow = Awaited<ReturnType<typeof wishlistRepository.listForUser>>[number];

function mapItem(row: WishlistRow) {
  const variant = null;
  const mrp = toNumber(variant?.price ?? row.product.price);
  const rawDiscount = variant ? variant.discountPrice : row.product.discount;
  const unitPrice = rawDiscount == null ? mrp : toNumber(rawDiscount);
  const discount = Math.max(mrp - unitPrice, 0);
  const stock = variant?.stock ?? row.product.stock;
  const available = (row.product.status === 'active') && stock > 0;
  const images = variant ? parseImages(variant.images) : [];

  return {
    id: row.id,
    productId: row.productId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    dateAdded: row.createdAt,
    product: {
      id: row.product.id,
      name: row.product.name,
      brand: row.product.brand,
      sku: variant?.sku ?? row.product.sku,
      imageUrl: images[0] ?? row.product.image,
      unitPrice,
      mrp,
      discount,
      stockQuantity: stock,
      inStock: available,
      stockStatus: available
        ? stock <= 5
          ? 'LOW_STOCK'
          : 'IN_STOCK'
        : 'OUT_OF_STOCK',
    },
  };
}

export class WishlistService {
  async getWishlist(userId: string) {
    const rows = await wishlistRepository.listForUser(userId);
    const items = rows.map(mapItem);
    return {
      items,
      totalItems: items.length,
    };
  }

  async addItem(userId: string, input: AddWishlistItemBody) {
    const product = await wishlistRepository.findProduct(input.productId);
    if (!product) throw new NotFoundError('Product not found.');

    let variantId = input?.id ?? null;

    if (product.variants.length > 0) {
      const variant =
        (variantId
          ? product.variants.find((row) => row.id === variantId)
          : product.variants.find((row) => row.isDefault) ?? product.variants[0]) ?? null;

      if (!variant) {
        throw new BadRequestError('Invalid product variant.', { code: 'INVALID_VARIANT' });
      }
      variantId = variant.id;
    }

    const existing = await wishlistRepository.findByProductVariant(
      userId,
      input.productId,
      variantId,
    );
    if (existing) {
      throw new ConflictError('Product is already in your wishlist.', {
        code: 'DUPLICATE_WISHLIST_ITEM',
        wishlistItemId: existing.id,
      });
    }

    const item = await wishlistRepository.create(userId, input.productId, variantId);
    await auditLogService.log({
      userId,
      action: 'WISHLIST_ITEM_ADDED',
      entity: 'wishlist_items',
      metadata: {
        wishlistItemId: item.id,
        productId: input.productId,
        timestamp: new Date().toISOString(),
      },
    });

    const wishlist = await this.getWishlist(userId);
    return {
      item: mapItem(item),
      ...wishlist,
    };
  }

  async removeItem(userId: string, wishlistItemId: string) {
    const existing = await wishlistRepository.findByIdForUser(wishlistItemId, userId);
    if (!existing) throw new NotFoundError('Wishlist item not found.');

    await wishlistRepository.delete(existing.id);
    await auditLogService.log({
      userId,
      action: 'WISHLIST_ITEM_REMOVED',
      entity: 'wishlist_items',
      metadata: {
        wishlistItemId: existing.id,
        productId: existing.productId,
        timestamp: new Date().toISOString(),
      },
    });

    return this.getWishlist(userId);
  }

  async moveToCart(userId: string, wishlistItemId: string) {
    const existing = await wishlistRepository.findByIdForUser(wishlistItemId, userId);
    if (!existing) throw new NotFoundError('Wishlist item not found.');

    const stock = existing.variant?.stock ?? existing.product.stock;
    if (!existing.product.isActive || stock <= 0) {
      throw new BadRequestError('Product is out of stock.', { code: 'OUT_OF_STOCK' });
    }

    const cartItem = await wishlistRepository.findCartItem(
      userId,
      existing.productId,
      existing?.id,
    );
    if (cartItem && cartItem.quantity + 1 > stock) {
      throw new BadRequestError(`Only ${stock} unit(s) available in stock.`, {
        code: 'INSUFFICIENT_STOCK',
        available: stock,
      });
    }

    const moved = await wishlistRepository.moveToCart(userId, wishlistItemId);
    if (!moved || 'error' in moved) {
      if (moved && 'error' in moved && moved.error === 'INSUFFICIENT_STOCK') {
        throw new BadRequestError(`Only ${moved.stock} unit(s) available in stock.`, {
          code: 'INSUFFICIENT_STOCK',
          available: moved.stock,
        });
      }
      throw new NotFoundError('Wishlist item not found.');
    }

    await auditLogService.log({
      userId,
      action: 'WISHLIST_ITEM_MOVED_TO_CART',
      entity: 'wishlist_items',
      metadata: {
        wishlistItemId,
        productId: moved.item.productId,
        timestamp: new Date().toISOString(),
      },
    });

    return this.getWishlist(userId);
  }

  async hasProduct(userId: string, productId: string, variantId?: string) {
    const existing = await wishlistRepository.findByProductVariant(
      userId,
      productId,
      variantId ?? null,
    );
    return {
      inWishlist: Boolean(existing),
      wishlistItemId: existing?.id ?? null,
    };
  }
}

export const wishlistService = new WishlistService();
