import { getDatabase, generateId } from './db';
import { StockMovement, StockMovementType } from '../types/product';
import type { SQLiteDatabase } from 'expo-sqlite';

export const StockMovementRepository = {
  async create(params: {
    productId: string;
    type: StockMovementType;
    qty: number;
    stockBefore: number;
    stockAfter: number;
    referenceId?: string | null;
    note?: string | null;
  }, db?: SQLiteDatabase): Promise<StockMovement> {
    const database = db || await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    const stockMovement: StockMovement = {
      id,
      productId: params.productId,
      type: params.type,
      qty: params.qty,
      stockBefore: params.stockBefore,
      stockAfter: params.stockAfter,
      referenceId: params.referenceId || null,
      note: params.note || null,
      createdAt: now,
    };
    await database.runAsync(
      `INSERT INTO stock_movements (id, product_id, type, qty, stock_before, stock_after, reference_id, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stockMovement.id,
        stockMovement.productId,
        stockMovement.type,
        stockMovement.qty,
        stockMovement.stockBefore,
        stockMovement.stockAfter,
        stockMovement.referenceId,
        stockMovement.note,
        stockMovement.createdAt,
      ]
    );
    return stockMovement;
  },

  async getByProduct(productId: string): Promise<StockMovement[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT id, product_id as productId, type, qty, stock_before as stockBefore, stock_after as stockAfter, reference_id as referenceId, note, created_at as createdAt
       FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC`,
      [productId]
    );
    return rows;
  },
};
