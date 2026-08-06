import { query, queryOne } from '../../../config/database';
import type { ListProductsQuery } from '../dto/product.dto';

export type ProductWithReviewStats = any & {
  averageRating: number;
  reviewCount: number;
};

export class ProductRepository {
  async list(reqQuery: ListProductsQuery) {
    const page = Number(reqQuery.page) || 1;
    const limit = Number(reqQuery.limit) || 12;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE p.status = 'active'";
    const params: any[] = [];
    let paramIndex = 1;

    if (reqQuery.search) {
      whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex})`;
      params.push(`%${reqQuery.search}%`);
      paramIndex++;
    }

    if (reqQuery.brand) {
      whereClause += ` AND p.brand ILIKE $${paramIndex}`;
      params.push(reqQuery.brand);
      paramIndex++;
    }

    if (reqQuery.category) {
      whereClause += ` AND c.name ILIKE $${paramIndex}`;
      params.push(reqQuery.category);
      paramIndex++;
    }

    if (reqQuery.minPrice !== undefined) {
      whereClause += ` AND p.price >= $${paramIndex}`;
      params.push(reqQuery.minPrice);
      paramIndex++;
    }

    if (reqQuery.maxPrice !== undefined) {
      whereClause += ` AND p.price <= $${paramIndex}`;
      params.push(reqQuery.maxPrice);
      paramIndex++;
    }

    if (reqQuery.availability === 'IN_STOCK') {
      whereClause += ` AND p.stock > 0`;
    } else if (reqQuery.availability === 'OUT_OF_STOCK') {
      whereClause += ` AND (p.status != 'active' OR p.stock <= 0)`;
    }

    if (reqQuery.emiAvailable !== undefined) {
      whereClause += ` AND p."emiAvailable" = $${paramIndex}`;
      params.push(reqQuery.emiAvailable);
      paramIndex++;
    }

    if (reqQuery.featured === true) {
      whereClause += ` AND p.featured = true`;
    }

    let orderBy = 'p."createdAt" DESC';
    if (reqQuery.sort === 'price_asc') orderBy = 'p.price ASC';
    if (reqQuery.sort === 'price_desc') orderBy = 'p.price DESC';
    if (reqQuery.sort === 'name') orderBy = 'p.name ASC';

    const countSql = `
      SELECT COUNT(p.id)::int as total
      FROM products p
      LEFT JOIN categories c ON c.id = p."categoryId"
      ${whereClause}
    `;

    const dataSql = `
      SELECT p.*
      FROM products p
      LEFT JOIN categories c ON c.id = p."categoryId"
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const [countRes, dataRes] = await Promise.all([
      queryOne(countSql, params),
      query(dataSql, [...params, limit, offset]),
    ]);

    return {
      rows: dataRes.rows,
      total: Number(countRes?.total || 0),
    };
  }

  async findById(productId: string) {
    return queryOne('SELECT * FROM products WHERE id = $1', [productId]);
  }

  async findVariantForProduct(_productId: string, _variantId: string) {
    return null;
  }

  async findDefaultVariant(_productId: string) {
    return null;
  }

  async findByIdWithVariants(productId: string) {
    const product = await queryOne('SELECT * FROM products WHERE id = $1', [productId]);
    if (!product) return null;

    const emiPlansRes = await query(
      'SELECT * FROM product_emi_plans WHERE "productId" = $1 ORDER BY months ASC',
      [productId]
    );

    return {
      ...product,
      productEmiPlans: emiPlansRes.rows,
    };
  }

  async findBySlug(slug: string) {
    return queryOne('SELECT * FROM products WHERE slug = $1', [slug]);
  }

  async findBySlugWithVariants(slug: string) {
    const product = await queryOne('SELECT * FROM products WHERE slug = $1', [slug]);
    if (!product) return null;

    const emiPlansRes = await query(
      'SELECT * FROM product_emi_plans WHERE "productId" = $1 ORDER BY months ASC',
      [product.id]
    );

    return {
      ...product,
      productEmiPlans: emiPlansRes.rows,
    };
  }

  async create(data: any) {
    const keys = Object.keys(data);
    const cols = keys.map(k => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map(k => data[k]);

    return queryOne(`
      INSERT INTO products (${cols})
      VALUES (${placeholders})
      RETURNING *
    `, values);
  }

  async update(id: string, data: any) {
    const keys = Object.keys(data);
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = keys.map(k => data[k]);

    return queryOne(`
      UPDATE products
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *
    `, [...values, id]);
  }

  async getReviewStats(productIds: string[]) {
    if (productIds.length === 0) return new Map<string, { averageRating: number; reviewCount: number }>();

    const res = await query(`
      SELECT 
        "productId",
        AVG(rating)::float as "averageRating",
        COUNT(rating)::int as "reviewCount"
      FROM reviews
      WHERE "productId" = ANY($1)
      GROUP BY "productId"
    `, [productIds]);

    return new Map<string, { averageRating: number; reviewCount: number }>(
      res.rows.map((row: any) => [
        row.productId,
        {
          averageRating: Number(row.averageRating || 0),
          reviewCount: Number(row.reviewCount || 0),
        },
      ])
    );
  }

  async getDistinctFilters() {
    const [brandsRes, categoriesRes] = await Promise.all([
      query(`
        SELECT DISTINCT brand 
        FROM products 
        WHERE status = 'active' AND brand IS NOT NULL 
        ORDER BY brand ASC
      `),
      query(`
        SELECT DISTINCT c.name 
        FROM products p
        JOIN categories c ON c.id = p."categoryId"
        WHERE p.status = 'active' AND c.name IS NOT NULL
        ORDER BY c.name ASC
      `),
    ]);

    return {
      brands: brandsRes.rows.map((r: any) => r.brand),
      categories: categoriesRes.rows.map((r: any) => r.name),
    };
  }
}

export const productRepository = new ProductRepository();
