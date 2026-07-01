import { getDatabase } from '../db';
import { SEED_PRODUCTS, getImageKeyForCategory } from './products.seed';

export async function seedProducts(): Promise<{ inserted: number; skipped: number }> {
  const db = await getDatabase();

  // Resolve category name → id
  const cats = await db.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM categories');
  const catMap: Record<string, string> = {};
  for (const c of cats) catMap[c.name.toUpperCase()] = c.id;

  let inserted = 0;
  let skipped = 0;

  for (const p of SEED_PRODUCTS) {
    const categoryId = catMap[p.category_id] ?? null;
    const imageKey = p.image_key ?? getImageKeyForCategory(p.category_id);
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO products
        (id, category_id, name, sku, barcode, cost_price, sell_price, stock, min_stock, unit,
         image_key, is_active, track_stock, allow_negative_stock, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id, categoryId, p.name, p.sku, p.barcode,
        p.cost_price, p.sell_price, p.stock, p.min_stock, p.unit,
        imageKey, p.is_active, p.track_stock, p.allow_negative_stock,
        p.created_at, p.updated_at,
      ]
    );
    result.changes > 0 ? inserted++ : skipped++;
  }

  return { inserted, skipped };
}
