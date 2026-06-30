import { getDatabase, generateId } from './db';
import { Product, ProductFormData } from '../types/product';

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
      unit: data.unit,
      imageUri: data.imageUri || null,
      isActive: data.isActive,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await db.runAsync(
        `INSERT INTO products (id, category_id, name, sku, barcode, cost_price, sell_price, stock, unit, image_uri, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [product.id, product.categoryId, product.name, product.sku, product.barcode, product.costPrice, product.sellPrice, product.stock, product.unit, product.imageUri, product.isActive ? 1 : 0, product.createdAt, product.updatedAt]
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
      `SELECT id, category_id as categoryId, name, sku, barcode, cost_price as costPrice, sell_price as sellPrice, stock, unit, image_uri as imageUri, is_active as isActive, created_at as createdAt, updated_at as updatedAt FROM products ORDER BY name ASC`
    );
    return rows.map((r: any) => ({ ...r, isActive: r.isActive === 1 }));
  },

  async getActive(): Promise<Product[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT id, category_id as categoryId, name, sku, barcode, cost_price as costPrice, sell_price as sellPrice, stock, unit, image_uri as imageUri, is_active as isActive, created_at as createdAt, updated_at as updatedAt FROM products WHERE is_active = 1 ORDER BY name ASC`
    );
    return rows.map((r: any) => ({ ...r, isActive: r.isActive === 1 }));
  },

  async getById(id: string): Promise<Product | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<any>(
      `SELECT id, category_id as categoryId, name, sku, barcode, cost_price as costPrice, sell_price as sellPrice, stock, unit, image_uri as imageUri, is_active as isActive, created_at as createdAt, updated_at as updatedAt FROM products WHERE id = ?`,
      [id]
    );
    if (!result) return null;
    return { ...result, isActive: result.isActive === 1 };
  },

  async search(query: string): Promise<Product[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT id, category_id as categoryId, name, sku, barcode, cost_price as costPrice, sell_price as sellPrice, stock, unit, image_uri as imageUri, is_active as isActive, created_at as createdAt, updated_at as updatedAt FROM products WHERE name LIKE ? AND is_active = 1 ORDER BY name ASC`,
      [`%${query}%`]
    );
    return rows.map((r: any) => ({ ...r, isActive: r.isActive === 1 }));
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
    if (data.unit !== undefined) { fields.push('unit = ?'); values.push(data.unit); }
    if (data.imageUri !== undefined) { fields.push('image_uri = ?'); values.push(data.imageUri); }
    if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    await db.runAsync(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },

  async updateStock(id: string, newStock: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`UPDATE products SET stock = ?, updated_at = ? WHERE id = ?`, [newStock, new Date().toISOString(), id]);
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM products WHERE id = ?`, [id]);
  },
};
