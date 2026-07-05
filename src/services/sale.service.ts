import { getDatabase } from '../database/db';
import { SaleRepository } from '../database/sales.repo';
import { ProductRepository } from '../database/product.repo';
import { StockMovementRepository } from '../database/stock-movement.repo';
import { DebtRepository } from '../database/debt.repo';
import { CartItem } from '../stores/cart.store';
import { PaymentMethod, TransactionStatus } from '../types/sale';

export interface ProcessSaleParams {
  items: CartItem[];
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  customerId?: string | null;
  invoiceNumber: string;
  debtNote?: string;
}

export interface StockValidationError {
  productName: string;
  available: number;
  requested: number;
}

/**
 * Proses transaksi penjualan secara ATOMIC menggunakan SQLite transaction.
 *
 * Flow:
 * 1. Validasi stok semua item (di dalam transaction)
 * 2. INSERT sale
 * 3. INSERT sale_items
 * 4. UPDATE stock + INSERT stock_movements
 * 5. Jika bon: INSERT debt
 * 6. COMMIT
 *
 * Jika error di langkah mana pun → ROLLBACK → throw error.
 * Tidak ada perubahan database parsial.
 */
export async function processSaleTransaction(params: ProcessSaleParams): Promise<string> {
  const db = await getDatabase();
  const { items, invoiceNumber, paymentMethod, status, debtNote } = params;

  await db.withTransactionAsync(async () => {
    // ── Step 1: Validasi stok semua item ──
    for (const item of items) {
      const product = await ProductRepository.getById(item.product.id, db);
      if (!product) {
        throw new Error(`Produk tidak ditemukan: ${item.product.name}`);
      }
      if (!product.trackStock) continue;

      if (!product.allowNegativeStock && product.stock < item.qty) {
        const error: any = new Error(
          `Stok ${product.name} tidak cukup. Tersedia ${product.stock}, diminta ${item.qty}.`
        );
        error.code = 'STOCK_INSUFFICIENT';
        error.details = {
          productName: product.name,
          available: product.stock,
          requested: item.qty,
        } as StockValidationError;
        throw error;
      }
    }

    // ── Step 2: Insert sale + sale_items ──
    const saleItems = items.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      qty: item.qty,
      price: item.product.sellPrice,
      costPrice: item.product.costPrice,
      subtotal: item.subtotal,
    }));

    await SaleRepository.createSale(
      invoiceNumber,
      params.customerId || null,
      params.totalAmount,
      params.paidAmount,
      params.changeAmount,
      paymentMethod,
      status,
      saleItems,
      db
    );

    // ── Step 3: Kurangi stok + catat stock movement ──
    const now = new Date().toISOString();
    for (const item of items) {
      const product = await ProductRepository.getById(item.product.id, db);
      if (!product || !product.trackStock) continue;

      const stockBefore = product.stock;
      const qty = item.qty;
      const stockAfter = product.allowNegativeStock
        ? stockBefore - qty
        : Math.max(0, stockBefore - qty);

      await ProductRepository.updateStock(product.id, stockAfter, db);

      await StockMovementRepository.create(
        {
          productId: product.id,
          type: 'sale',
          qty,
          stockBefore,
          stockAfter,
          referenceId: invoiceNumber,
          note: null,
        },
        db
      );
    }

    // ── Step 4: Jika bon, buat debt ──
    if (paymentMethod === 'debt' && params.customerId) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Get sale ID by invoice number – we already created the sale above
      const sale = await SaleRepository.getByInvoiceNumber(invoiceNumber);
      if (!sale) {
        throw new Error('Gagal mendapatkan data sale untuk pencatatan bon.');
      }

      await DebtRepository.createDebt(
        params.customerId,
        sale.id,
        params.totalAmount,
        0, // paidAmount
        params.totalAmount, // remainingAmount
        'unpaid',
        dueDate.toISOString().slice(0, 10),
        debtNote || null,
        'transaction',
        undefined,
        db
      );
    }
  });

  return invoiceNumber;
}
