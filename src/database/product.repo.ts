import { getDatabase, generateId } from './db';
import { Product, ProductFormData } from '../types/product';
import type { SQLiteDatabase } from 'expo-sqlite';

export const ProductRepository = {
  async create(data: ProductFormData): Promise<Product> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    const product: Product = {
      id,
      categoryId: data.categoryId || null,
      name: data.name,
      sku: data.sku || null,
      barcode: data.barcode || null,
      costPrice: data.costPrice || 0,
      sellPrice: data.sellPrice || 0,
      stock: data.stock || 0,
      minStock: data.minStock || 0,
      trackStock: data.trackStock !== undefined ? data.trackStock : true,
      allowNegativeStock: data.allowNegativeStock !== undefined ? data.allowNegativeStock : true,
      unit: data.unit,
      imageUri: data.imageUri || null,
      imageKey: data.imageKey || 'default',
      isActive: data.isActive,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await db.runAsync(
        `INSERT INTO products (id, category_id, name, sku, barcode, cost_price, sell_price, stock, min_stock, track_stock, allow_negative_stock, unit, image_uri, image_key, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.categoryId,
          product.name,
          product.sku,
          product.barcode,
          product.costPrice,
          product.sellPrice,
          product.stock,
          product.minStock,
          product.trackStock ? 1 : 0,
          product.allowNegativeStock ? 1 : 0,
          product.unit,
          product.imageUri,
          product.imageKey,
          product.isActive ? 1 : 0,
          product.createdAt,
          product.updatedAt,
        ]
      );
    } catch (error) {
      console.error('ProductRepository.create error:', error);
      throw error;
    }
    return product;
  },

  async getAll(): Promise<Product[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT id, category_id as categoryId, name, sku, barcode, cost_price as costPrice, sell_price as sellPrice, stock, min_stock as minStock, track_stock as trackStock, allow_negative_stock as allowNegativeStock, unit, image_uri as imageUri, image_key as imageKey, is_active as isActive, created_at as createdAt, updated_at as updatedAt FROM products ORDER BY name ASC`
    );
    return rows.map((r: any) => ({ ...r, isActive: r.isActive === 1, trackStock: r.trackStock === 1, allowNegativeStock: r.allowNegativeStock === 1, imageKey: r.imageKey || 'default' }));
  },

  async getActive(): Promise<Product[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT id, category_id as categoryId, name, sku, barcode, cost_price as costPrice, sell_price as sellPrice, stock, min_stock as minStock, track_stock as trackStock, allow_negative_stock as allowNegativeStock, unit, image_uri as imageUri, image_key as imageKey, is_active as isActive, created_at as createdAt, updated_at as updatedAt FROM products WHERE is_active = 1 ORDER BY name ASC`
    );
    return rows.map((r: any) => ({ ...r, isActive: r.isActive === 1, trackStock: r.trackStock === 1, allowNegativeStock: r.allowNegativeStock === 1, imageKey: r.imageKey || 'default' }));
  },

  async getLowStockProducts(): Promise<Product[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT id, category_id as categoryId, name, sku, barcode, cost_price as costPrice, sell_price as sellPrice, stock, min_stock as minStock, track_stock as trackStock, allow_negative_stock as allowNegativeStock, unit, image_uri as imageUri, image_key as imageKey, is_active as isActive, created_at as createdAt, updated_at as updatedAt
       FROM products
       WHERE track_stock = 1 AND is_active = 1 AND stock <= min_stock
       ORDER BY stock ASC, min_stock ASC`
    );
    return rows.map((r: any) => ({ ...r, isActive: r.isActive === 1, trackStock: r.trackStock === 1, allowNegativeStock: r.allowNegativeStock === 1, imageKey: r.imageKey || 'default' }));
  },

  async getOutOfStockProducts(): Promise<Product[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT id, category_id as categoryId, name, sku, barcode, cost_price as costPrice, sell_price as sellPrice, stock, min_stock as minStock, track_stock as trackStock, allow_negative_stock as allowNegativeStock, unit, image_uri as imageUri, image_key as imageKey, is_active as isActive, created_at as createdAt, updated_at as updatedAt
       FROM products
       WHERE track_stock = 1 AND is_active = 1 AND stock <= 0
       ORDER BY stock ASC`
    );
    return rows.map((r: any) => ({ ...r, isActive: r.isActive === 1, trackStock: r.trackStock === 1, allowNegativeStock: r.allowNegativeStock === 1, imageKey: r.imageKey || 'default' }));
  },

  async getById(id: string, db?: SQLiteDatabase): Promise<Product | null> {
    const database = db || await getDatabase();
    const result = await database.getFirstAsync<any>(
      `SELECT id, category_id as categoryId, name, sku, barcode, cost_price as costPrice, sell_price as sellPrice, stock, min_stock as minStock, track_stock as trackStock, allow_negative_stock as allowNegativeStock, unit, image_uri as imageUri, image_key as imageKey, is_active as isActive, created_at as createdAt, updated_at as updatedAt FROM products WHERE id = ?`,
      [id]
    );
    if (!result) return null;
    return { ...result, isActive: result.isActive === 1, trackStock: result.trackStock === 1, allowNegativeStock: result.allowNegativeStock === 1, imageKey: result.imageKey || 'default' };
  },

  async search(query: string): Promise<Product[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT id, category_id as categoryId, name, sku, barcode, cost_price as costPrice, sell_price as sellPrice, stock, min_stock as minStock, track_stock as trackStock, allow_negative_stock as allowNegativeStock, unit, image_uri as imageUri, image_key as imageKey, is_active as isActive, created_at as createdAt, updated_at as updatedAt FROM products WHERE name LIKE ? AND is_active = 1 ORDER BY name ASC`,
      [`%${query}%`]
    );
    return rows.map((r: any) => ({ ...r, isActive: r.isActive === 1, trackStock: r.trackStock === 1, allowNegativeStock: r.allowNegativeStock === 1, imageKey: r.imageKey || 'default' }));
  },

  async update(id: string, data: Partial<ProductFormData>): Promise<Product | null> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.categoryId !== undefined) { fields.push('category_id = ?'); values.push(data.categoryId); }
    if (data.sku !== undefined) { fields.push('sku = ?'); values.push(data.sku); }
    if (data.barcode !== undefined) { fields.push('barcode = ?'); values.push(data.barcode); }
    if (data.costPrice !== undefined) { fields.push('cost_price = ?'); values.push(data.costPrice); }
    if (data.sellPrice !== undefined) { fields.push('sell_price = ?'); values.push(data.sellPrice); }
    if (data.stock !== undefined) { fields.push('stock = ?'); values.push(data.stock); }
    if (data.minStock !== undefined) { fields.push('min_stock = ?'); values.push(data.minStock); }
    if (data.trackStock !== undefined) { fields.push('track_stock = ?'); values.push(data.trackStock ? 1 : 0); }
    if (data.allowNegativeStock !== undefined) { fields.push('allow_negative_stock = ?'); values.push(data.allowNegativeStock ? 1 : 0); }
    if (data.unit !== undefined) { fields.push('unit = ?'); values.push(data.unit); }
    if (data.imageUri !== undefined) { fields.push('image_uri = ?'); values.push(data.imageUri); }
    if (data.imageKey !== undefined) { fields.push('image_key = ?'); values.push(data.imageKey); }
    if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    await db.runAsync(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },

  async updateStock(id: string, newStock: number, db?: SQLiteDatabase): Promise<void> {
    const database = db || await getDatabase();
    await database.runAsync(`UPDATE products SET stock = ?, updated_at = ? WHERE id = ?`, [newStock, new Date().toISOString(), id]);
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM products WHERE id = ?`, [id]);
  },
};
