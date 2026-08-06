import { OrderStatus } from '@prisma/client';
import { prisma } from '../../../config/database';

export class ReviewsRepository {
  findByProduct(productId: string) {
    return prisma.product_reviews.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });
  }

  findByUserAndProduct(userId: string, productId: string) {
    return prisma.product_reviews.findUnique({
      where: { userId_productId: { userId, productId } },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });
  }

  findById(reviewId: string) {
    return prisma.product_reviews.findUnique({
      where: { id: reviewId },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });
  }

  hasEligibleOrder(userId: string, productId: string) {
    return prisma.orders.findFirst({
      where: {
        userId,
        productId,
        orderStatus: { not: OrderStatus.CANCELLED },
      },
      select: { id: true },
    });
  }

  productExists(productId: string) {
    return prisma.products.findUnique({
      where: { id: productId },
      select: { id: true },
    });
  }

  create(input: { userId: string; productId: string; rating: number; review: string }) {
    return prisma.product_reviews.create({
      data: {
        userId: input.userId,
        productId: input.productId,
        rating: input.rating,
        review: input.review,
      },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });
  }

  update(reviewId: string, data: { rating?: number; review?: string }) {
    return prisma.product_reviews.update({
      where: { id: reviewId },
      data,
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });
  }

  delete(reviewId: string) {
    return prisma.product_reviews.delete({ where: { id: reviewId } });
  }

  async getAggregate(productId: string) {
    const result = await prisma.product_reviews.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      averageRating: Math.round((result._avg.rating ?? 0) * 10) / 10,
      totalReviews: result._count.rating,
    };
  }
}

export const reviewsRepository = new ReviewsRepository();
