import { getDatabase, generateId } from './db';
import { Category, CategoryFormData } from '../types/category';

export const DEFAULT_CATEGORIES = [
  { name: 'Sembako', sortOrder: 1 },
  { name: 'Minuman', sortOrder: 2 },
  { name: 'Rokok', sortOrder: 3 },
  { name: 'Mie', sortOrder: 4 },
  { name: 'Snack', sortOrder: 5 },
  { name: 'Kopi', sortOrder: 6 },
  { name: 'Sabun', sortOrder: 7 },
  { name: 'Obat', sortOrder: 8 },
  { name: 'Pulsa', sortOrder: 9 },
  { name: 'Lainnya', sortOrder: 10 },
];

export const CategoryRepository = {
  async seedDefaultCategories(): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    // Check if categories already exist
    const existing = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories'
    );

    if (existing && existing.count > 0) {
      return; // Categories already seeded
    }

    // Insert default categories
    for (const cat of DEFAULT_CATEGORIES) {
      const id = generateId();
      await db.runAsync(
        'INSERT INTO categories (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, cat.name, cat.sortOrder, now, now]
      );
    }
  },

  async create(data: CategoryFormData): Promise<Category> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    const sortOrder = data.sortOrder || 0;
    const category: Category = { id, name: data.name, sortOrder, createdAt: now, updatedAt: now };
    await db.runAsync(
      'INSERT INTO categories (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, data.name, sortOrder, now, now]
    );
    return category;
  },

  async getAll(): Promise<Category[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT id, name, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt FROM categories ORDER BY sort_order ASC, name ASC'
    );
    return rows;
  },

  async getById(id: string): Promise<Category | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<Category>(
      'SELECT id, name, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt FROM categories WHERE id = ?',
      [id]
    );
    return result || null;
  },

  async update(id: string, data: Partial<CategoryFormData>): Promise<Category | null> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    await db.runAsync(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM categories WHERE id = ?`, [id]);
  },
};
