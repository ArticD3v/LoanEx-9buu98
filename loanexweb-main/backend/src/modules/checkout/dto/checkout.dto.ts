import { z } from 'zod';

export const createCheckoutBodySchema = z.object({
  productId: z.string().trim().min(1, 'Product is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(20).default(1),
  purchaseType: z.enum(['EMI', 'DIRECT']),
  addressId: z.string().trim().min(1).optional(),
});

export type CreateCheckoutBody = z.infer<typeof createCheckoutBodySchema>;
