import { query, queryOne, transaction } from '../../../config/database';

export class WishlistRepository {
  findProduct(productId: string) {
    return queryOne('SELECT * FROM products WHERE id = $1', [productId]);
  }

  async findByIdForUser(id: string, userId: string) {
    const item = await queryOne('SELECT * FROM wishlist_items WHERE id = $1 AND "user_id" = $2', [id, userId]);
    if (!item) return null;
    const product = await this.findProduct(item.product_id);
    return { ...item, product };
  }

  async findByProductVariant(userId: string, productId: string, _variantId: string | null) {
    const item = await queryOne('SELECT * FROM wishlist_items WHERE "user_id" = $1 AND "product_id" = $2', [userId, productId]);
    if (!item) return null;
    const product = await this.findProduct(productId);
    return { ...item, product };
  }

  async listForUser(userId: string) {
    const res = await query('SELECT * FROM wishlist_items WHERE "user_id" = $1 ORDER BY "created_at" DESC', [userId]);
    return Promise.all(
      res.rows.map(async (item: any) => {
        const product = await this.findProduct(item.product_id);
        return { ...item, product };
      })
    );
  }

  async create(userId: string, productId: string, _variantId: string | null) {
    const item = await queryOne(`
      INSERT INTO wishlist_items ("user_id", "product_id")
      VALUES ($1, $2)
      ON CONFLICT ("user_id", "product_id") DO NOTHING
      RETURNING *
    `, [userId, productId]);

    const product = await this.findProduct(productId);
    return { ...item, product };
  }

  delete(id: string) {
    return query('DELETE FROM wishlist_items WHERE id = $1', [id]);
  }

  async count(userId: string) {
    const res = await queryOne('SELECT COUNT(id)::int as count FROM wishlist_items WHERE "user_id" = $1', [userId]);
    return res?.count || 0;
  }

  findCartItem(userId: string, productId: string, _variantId: string | null) {
    return queryOne('SELECT * FROM cart_items WHERE "user_id" = $1 AND "product_id" = $2', [userId, productId]);
  }

  async moveToCart(userId: string, wishlistItemId: string) {
    return transaction(async (client) => {
      const itemRes = await client.query('SELECT * FROM wishlist_items WHERE id = $1 AND "user_id" = $2', [wishlistItemId, userId]);
      const item = itemRes.rows[0];
      if (!item) return null;

      const productRes = await client.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
      const product = productRes.rows[0];
      const stock = product?.stock ?? 0;

      const cartRes = await client.query('SELECT * FROM cart_items WHERE "user_id" = $1 AND "product_id" = $2', [userId, item.product_id]);
      const existingCart = cartRes.rows[0];

      if (existingCart) {
        if (existingCart.quantity + 1 > stock) {
          return { error: 'INSUFFICIENT_STOCK' as const, stock, item: { ...item, product } };
        }
        await client.query('UPDATE cart_items SET quantity = quantity + 1 WHERE id = $1', [existingCart.id]);
      } else {
        await client.query(`
          INSERT INTO cart_items ("user_id", "product_id", quantity)
          VALUES ($1, $2, 1)
        `, [userId, item.product_id]);
      }

      await client.query('DELETE FROM wishlist_items WHERE id = $1', [item.id]);
      return { item: { ...item, product } };
    });
  }
}

export const wishlistRepository = new WishlistRepository();
