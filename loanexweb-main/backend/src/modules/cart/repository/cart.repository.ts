import { query, queryOne, transaction } from '../../../config/database';

export class CartRepository {
  findProduct(productId: string) {
    return queryOne('SELECT * FROM products WHERE id = $1', [productId]);
  }

  findVariant(_variantId: string) {
    return null;
  }

  async findItemByIdForUser(id: string, userId: string) {
    const item = await queryOne('SELECT * FROM cart_items WHERE id = $1 AND "user_id" = $2', [id, userId]);
    if (!item) return null;
    const product = await this.findProduct(item.product_id);
    return { ...item, product };
  }

  async findItemByProductVariant(userId: string, productId: string, _variantId: string | null) {
    const item = await queryOne('SELECT * FROM cart_items WHERE "user_id" = $1 AND "product_id" = $2', [userId, productId]);
    if (!item) return null;
    const product = await this.findProduct(productId);
    return { ...item, product };
  }

  async listForUser(userId: string) {
    const res = await query('SELECT * FROM cart_items WHERE "user_id" = $1 ORDER BY "created_at" DESC', [userId]);
    const itemsWithProduct = await Promise.all(
      res.rows.map(async (item: any) => {
        const product = await this.findProduct(item.product_id);
        return { ...item, product };
      })
    );
    return itemsWithProduct;
  }

  async create(userId: string, productId: string, _variantId: string | null, quantity: number) {
    const item = await queryOne(`
      INSERT INTO cart_items ("user_id", "product_id", quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT ("user_id", "product_id") DO UPDATE
      SET quantity = cart_items.quantity + EXCLUDED.quantity
      RETURNING *
    `, [userId, productId, quantity]);

    const product = await this.findProduct(productId);
    return { ...item, product };
  }

  async updateQuantity(id: string, quantity: number) {
    const item = await queryOne('UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *', [quantity, id]);
    if (!item) return null;
    const product = await this.findProduct(item.product_id);
    return { ...item, product };
  }

  delete(id: string) {
    return query('DELETE FROM cart_items WHERE id = $1', [id]);
  }

  clear(userId: string) {
    return query('DELETE FROM cart_items WHERE "user_id" = $1', [userId]);
  }

  async countItems(userId: string) {
    const res = await queryOne(`
      SELECT 
        COALESCE(SUM(quantity), 0)::int as total_quantity,
        COUNT(id)::int as count
      FROM cart_items
      WHERE "user_id" = $1
    `, [userId]);

    return {
      _sum: { quantity: res?.total_quantity || 0 },
      _count: { _all: res?.count || 0 },
    };
  }

  async moveToWishlist(cartItemId: string, userId: string) {
    return transaction(async (client) => {
      const itemRes = await client.query('SELECT * FROM cart_items WHERE id = $1 AND "user_id" = $2', [cartItemId, userId]);
      const item = itemRes.rows[0];
      if (!item) return null;

      await client.query(`
        INSERT INTO wishlist_items ("user_id", "product_id")
        VALUES ($1, $2)
        ON CONFLICT ("user_id", "product_id") DO NOTHING
      `, [userId, item.product_id]);

      await client.query('DELETE FROM cart_items WHERE id = $1', [cartItemId]);
      return item;
    });
  }
}

export const cartRepository = new CartRepository();
