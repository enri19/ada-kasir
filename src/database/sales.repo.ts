import { getDatabase, generateId } from './db';
import { Sale, SaleItem, SaleWithItems, PaymentMethod, TransactionStatus } from '../types/sale';
import type { SQLiteDatabase } from 'expo-sqlite';

export const SaleRepository = {
  async createSale(
    invoiceNumber: string,
    customerId: string | null,
    totalAmount: number,
    paidAmount: number,
    changeAmount: number,
    paymentMethod: PaymentMethod,
    status: TransactionStatus,
    items: { productId: string | null; productName: string; qty: number; price: number; costPrice: number; subtotal: number }[],
    db?: SQLiteDatabase
  ): Promise<SaleWithItems> {
    const database = db || await getDatabase();
    const saleId = generateId();
    const now = new Date().toISOString();

    await database.runAsync(
      `INSERT INTO sales (id, invoice_number, customer_id, total_amount, paid_amount, change_amount, payment_method, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [saleId, invoiceNumber, customerId, totalAmount, paidAmount, changeAmount, paymentMethod, status, now, now]
    );

    const saleItems: SaleItem[] = [];
    for (const item of items) {
      const itemId = generateId();
      await database.runAsync(
        `INSERT INTO sale_items (id, sale_id, product_id, product_name, qty, price, cost_price, subtotal, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, saleId, item.productId, item.productName, item.qty, item.price, item.costPrice, item.subtotal, now]
      );
      saleItems.push({ id: itemId, saleId, ...item, createdAt: now });
    }

    return {
      id: saleId,
      invoiceNumber,
      customerId,
      totalAmount,
      paidAmount,
      changeAmount,
      paymentMethod,
      status,
      createdAt: now,
      updatedAt: now,
      items: saleItems,
    };
  },

  async getAll(): Promise<SaleWithItems[]> {
    const db = await getDatabase();
    const sales = await db.getAllAsync<Sale>(
      `SELECT id, invoice_number as invoiceNumber, customer_id as customerId, total_amount as totalAmount, paid_amount as paidAmount, change_amount as changeAmount, payment_method as paymentMethod, status, created_at as createdAt, updated_at as updatedAt FROM sales ORDER BY created_at DESC`
    );

    return await this._attachItemsToSales(db, sales);
  },

  async getById(id: string): Promise<SaleWithItems | null> {
    const db = await getDatabase();
    const sale = await db.getFirstAsync<SaleWithItems>(
      `SELECT s.id, s.invoice_number as invoiceNumber, s.customer_id as customerId,
              s.total_amount as totalAmount, s.paid_amount as paidAmount,
              s.change_amount as changeAmount, s.payment_method as paymentMethod,
              s.status, s.created_at as createdAt, s.updated_at as updatedAt,
              c.name as customerName,
              d.status as debtStatus,
              d.due_date as debtDueDate
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN debts d ON d.sale_id = s.id
       WHERE s.id = ?`,
      [id]
    );
    if (!sale) return null;
    const items = await db.getAllAsync<SaleItem>(
      `SELECT id, sale_id as saleId, product_id as productId, product_name as productName, qty, price, cost_price as costPrice, subtotal, created_at as createdAt FROM sale_items WHERE sale_id = ?`,
      [sale.id]
    );
    return {
      ...sale,
      items: items.map((item) => ({
        ...item,
        subtotal: item.qty * item.price,
      })),
    };
  },

  async getByDate(date: string): Promise<SaleWithItems[]> {
    const db = await getDatabase();
    const startDate = `${date}T00:00:00.000Z`;
    const endDate = `${date}T23:59:59.999Z`;
    const sales = await db.getAllAsync<Sale>(
      `SELECT id, invoice_number as invoiceNumber, customer_id as customerId, total_amount as totalAmount, paid_amount as paidAmount, change_amount as changeAmount, payment_method as paymentMethod, status, created_at as createdAt, updated_at as updatedAt FROM sales WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC`,
      [startDate, endDate]
    );

    return await this._attachItemsToSales(db, sales);
  },

  async getTodayCount(): Promise<number> {
    const db = await getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const startDate = `${today}T00:00:00.000Z`;
    const endDate = `${today}T23:59:59.999Z`;
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sales WHERE created_at >= ? AND created_at <= ?`,
      [startDate, endDate]
    );
    return result?.count || 0;
  },

  async getByInvoiceNumber(invoiceNumber: string): Promise<SaleWithItems | null> {
    const db = await getDatabase();
    const sale = await db.getFirstAsync<Sale>(
      `SELECT id, invoice_number as invoiceNumber, customer_id as customerId, total_amount as totalAmount, paid_amount as paidAmount, change_amount as changeAmount, payment_method as paymentMethod, status, created_at as createdAt, updated_at as updatedAt FROM sales WHERE invoice_number = ?`,
      [invoiceNumber]
    );
    if (!sale) return null;
    const items = await db.getAllAsync<SaleItem>(
      `SELECT id, sale_id as saleId, product_id as productId, product_name as productName, qty, price, cost_price as costPrice, subtotal, created_at as createdAt FROM sale_items WHERE sale_id = ?`,
      [sale.id]
    );
    return {
      ...sale,
      items: items.map((item) => ({
        ...item,
        subtotal: item.qty * item.price,
      })),
    };
  },

  async updateStatus(id: string, status: TransactionStatus): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`UPDATE sales SET status = ?, updated_at = ? WHERE id = ?`, [status, new Date().toISOString(), id]);
  },

  /**
   * Helper: attach items to sales in batch (avoids N+1).
   * Always recalculates subtotal = qty * price for correctness.
   */
  async _attachItemsToSales(db: SQLiteDatabase, sales: Sale[]): Promise<SaleWithItems[]> {
    if (sales.length === 0) return [];

    const saleIds = sales.map((s) => s.id);
    const placeholders = saleIds.map(() => '?').join(',');
    const allItems = await db.getAllAsync<SaleItem>(
      `SELECT id, sale_id as saleId, product_id as productId, product_name as productName, qty, price, cost_price as costPrice, subtotal, created_at as createdAt
       FROM sale_items WHERE sale_id IN (${placeholders})`,
      saleIds
    );

    // Group items by saleId
    const itemsBySaleId = new Map<string, SaleItem[]>();
    for (const item of allItems) {
      const safeItem: SaleItem = {
        ...item,
        subtotal: item.qty * item.price, // recalculate for correctness
      };
      const group = itemsBySaleId.get(item.saleId) || [];
      group.push(safeItem);
      itemsBySaleId.set(item.saleId, group);
    }

    return sales.map((sale) => ({
      ...sale,
      items: itemsBySaleId.get(sale.id) || [],
    }));
  },
};
