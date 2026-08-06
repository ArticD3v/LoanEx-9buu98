import { Pool, QueryResultRow } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_URL.includes('supabase') || env.DATABASE_URL.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client pool error', err);
});

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (env.NODE_ENV === 'development') {
    console.log(`[PG Native Query] (${duration}ms): ${text.trim().substring(0, 100)}...`);
  }
  return res;
}

export async function queryOne<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<T | null> {
  const res = await query<T>(text, params);
  return res.rows[0] || null;
}

export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Map singular Prisma names to actual Postgres plural table names
const TABLE_NAME_MAP: Record<string, string> = {
  product: 'products',
  category: 'categories',
  subCategory: 'sub_categories',
  brand: 'brands',
  dealer: 'dealers',
  supplier: 'suppliers',
  manufacturer: 'manufacturers',
  warehouse: 'warehouses',
  user: 'users',
  profile: 'profiles',
  address: 'addresses',
  order: 'orders',
  orderItem: 'order_items',
  cartItem: 'cart_items',
  wishlistItem: 'wishlist_items',
  productEmiPlan: 'product_emi_plans',
  emiPlan: 'emi_plans',
  emiDetail: 'emi_details',
  emiApplication: 'emi_applications',
  customerKyc: 'customer_kyc',
  experianReport: 'experian_reports',
  digilockerReport: 'digilocker_reports',
};

function resolveTableName(name: string): string {
  return TABLE_NAME_MAP[name] || name;
}

function createPgTableProxy(rawName: string) {
  const tableName = resolveTableName(rawName);

  return {
    async findMany(args: any = {}) {
      let sql = `SELECT * FROM "${tableName}"`;
      const params: any[] = [];
      if (args.where && Object.keys(args.where).length > 0) {
        const keys = Object.keys(args.where);
        const conditions = keys.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
        sql += ` WHERE ${conditions}`;
        params.push(...keys.map(k => args.where[k]));
      }
      if (args.orderBy) {
        sql += ` ORDER BY "createdAt" DESC`;
      }
      if (args.take) {
        sql += ` LIMIT ${args.take}`;
      }
      const res = await query(sql, params);
      return res.rows;
    },
    async findUnique(args: any) {
      const keys = Object.keys(args.where);
      const conditions = keys.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
      const sql = `SELECT * FROM "${tableName}" WHERE ${conditions} LIMIT 1`;
      const params = keys.map(k => args.where[k]);
      return queryOne(sql, params);
    },
    async findFirst(args: any = {}) {
      return this.findUnique(args);
    },
    async create(args: any) {
      const data = args.data || args;
      const keys = Object.keys(data);
      const cols = keys.map(k => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map(k => data[k]);
      const sql = `INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders}) RETURNING *`;
      return queryOne(sql, values);
    },
    async update(args: any) {
      const keys = Object.keys(args.data);
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const whereKeys = Object.keys(args.where);
      const whereClause = whereKeys.map((k, i) => `"${k}" = $${i + 1 + keys.length}`).join(' AND ');
      const values = [...keys.map(k => args.data[k]), ...whereKeys.map(k => args.where[k])];
      const sql = `UPDATE "${tableName}" SET ${setClause} WHERE ${whereClause} RETURNING *`;
      return queryOne(sql, values);
    },
    async upsert(args: any) {
      const existing = await this.findFirst({ where: args.where });
      if (existing) {
        return this.update({ where: args.where, data: args.update });
      }
      return this.create({ data: args.create });
    },
    async delete(args: any) {
      const whereKeys = Object.keys(args.where);
      const whereClause = whereKeys.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
      const values = whereKeys.map(k => args.where[k]);
      const sql = `DELETE FROM "${tableName}" WHERE ${whereClause} RETURNING *`;
      return queryOne(sql, values);
    },
    async deleteMany(args: any = {}) {
      let sql = `DELETE FROM "${tableName}"`;
      const params: any[] = [];
      if (args.where && Object.keys(args.where).length > 0) {
        const keys = Object.keys(args.where);
        const conditions = keys.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
        sql += ` WHERE ${conditions}`;
        params.push(...keys.map(k => args.where[k]));
      }
      return query(sql, params);
    },
    async count(args: any = {}) {
      const res = await query(`SELECT COUNT(*)::int as count FROM "${tableName}"`);
      return res.rows[0]?.count || 0;
    }
  };
}

export const prisma: any = new Proxy({}, {
  get(_target, prop: string) {
    if (prop === '$queryRaw' || prop === '$executeRaw') {
      return (sql: string, ...params: any[]) => query(sql, params);
    }
    if (prop === '$transaction') {
      return (cb: any) => transaction(cb);
    }
    return createPgTableProxy(prop);
  }
});

export default pool;
