import { CartItem } from '../stores/cart.store';
import { ProductRepository } from '../database/product.repo';
import { StockMovementRepository } from '../database/stock-movement.repo';
import { StockMovementType } from '../types/product';
import type { SQLiteDatabase } from 'expo-sqlite';

export const StockService = {
  async reduceStockForSaleItem(item: CartItem, referenceId: string, type: StockMovementType = 'sale', db?: SQLiteDatabase) {
    const product = await ProductRepository.getById(item.product.id, db);
    if (!product) return;
    if (!product.trackStock) return;

    const stockBefore = product.stock;
    const qty = item.qty;
    const stockAfter = product.allowNegativeStock ? stockBefore - qty : Math.max(0, stockBefore - qty);

    await ProductRepository.updateStock(product.id, stockAfter, db);
    await StockMovementRepository.create({
      productId: product.id,
      type,
      qty,
      stockBefore,
      stockAfter,
      referenceId,
      note: null,
    }, db);
  },

  async reduceStockForSaleItems(items: CartItem[], referenceId: string, type: StockMovementType = 'sale', db?: SQLiteDatabase) {
    for (const item of items) {
      await this.reduceStockForSaleItem(item, referenceId, type, db);
    }
  },
};
