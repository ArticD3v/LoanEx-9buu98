import { Router, Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../../config/database';

export const categoryRouter = Router();

// GET /api/v1/categories - List all categories
categoryRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(`
      SELECT 
        c.*, 
        COUNT(p.id)::int as "productCount"
      FROM categories c
      LEFT JOIN products p ON p."categoryId" = c.id
      GROUP BY c.id
      ORDER BY c."sortOrder" ASC, c.name ASC
    `);

    return res.json({
      success: true,
      message: 'Categories fetched successfully',
      data: result.rows.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || '',
        icon: cat.icon || '',
        color: cat.color || '',
        bgColor: cat.bgColor || '',
        status: cat.status || 'active',
        sortOrder: cat.sortOrder || 0,
        productCount: Number(cat.productCount || 0),
        createdAt: cat.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/categories - Create new category
categoryRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, icon, color, bgColor, status, sortOrder } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    const category = await queryOne(`
      INSERT INTO categories (name, description, icon, color, "bgColor", status, "sortOrder")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      name.trim(),
      description?.trim() || null,
      icon?.trim() || null,
      color?.trim() || null,
      bgColor?.trim() || null,
      status || 'active',
      sortOrder != null ? Number(sortOrder) : 0,
    ]);

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/categories/:id - Update category
categoryRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, bgColor, status, sortOrder } = req.body;

    const existing = await queryOne('SELECT * FROM categories WHERE id = $1', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const updated = await queryOne(`
      UPDATE categories
      SET 
        name = $1,
        description = $2,
        icon = $3,
        color = $4,
        "bgColor" = $5,
        status = $6,
        "sortOrder" = $7
      WHERE id = $8
      RETURNING *
    `, [
      name ? name.trim() : existing.name,
      description !== undefined ? description : existing.description,
      icon !== undefined ? icon : existing.icon,
      color !== undefined ? color : existing.color,
      bgColor !== undefined ? bgColor : existing.bgColor,
      status !== undefined ? status : existing.status,
      sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
      id,
    ]);

    return res.json({
      success: true,
      message: 'Category updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/categories/:id - Delete category
categoryRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await queryOne('SELECT * FROM categories WHERE id = $1', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    await query('DELETE FROM categories WHERE id = $1', [id]);

    return res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});
