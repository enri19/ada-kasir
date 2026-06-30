import { getDatabase, generateId } from './db';
import { Sale, SaleItem, SaleWithItems, PaymentMethod, TransactionStatus } from '../types/sale';

export const SaleRepository = {
  async createSale(
    invoiceNumber: string,
    customerId: string | null,
    totalAmount: number,
    paidAmount: number,
    changeAmount: number,
    paymentMethod: PaymentMethod,
    status: TransactionStatus,
    items: { productId: string | null; productName: string; qty: number; price: number; costPrice: number; subtotal: number }[]
  ): Promise<SaleWithItems> {
    const db = await getDatabase();
    const saleId = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO sales (id, invoice_number, customer_id, total_amount, paid_amount, change_amount, payment_method, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [saleId, invoiceNumber, customerId, totalAmount, paidAmount, changeAmount, paymentMethod, status, now, now]
    );

    const saleItems: SaleItem[] = [];
    for (const item of items) {
      const itemId = generateId();
      await db.runAsync(
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

    const result: SaleWithItems[] = [];
    for (const sale of sales) {
      const items = await db.getAllAsync<SaleItem>(
        `SELECT id, sale_id as saleId, product_id as productId, product_name as productName, qty, price, cost_price as costPrice, subtotal, created_at as createdAt FROM sale_items WHERE sale_id = ?`,
        [sale.id]
      );
      result.push({ ...sale, items });
    }
    return result;
  },

  async getById(id: string): Promise<SaleWithItems | null> {
    const db = await getDatabase();
    const sale = await db.getFirstAsync<Sale>(
      `SELECT id, invoice_number as invoiceNumber, customer_id as customerId, total_amount as totalAmount, paid_amount as paidAmount, change_amount as changeAmount, payment_method as paymentMethod, status, created_at as createdAt, updated_at as updatedAt FROM sales WHERE id = ?`,
      [id]
    );
    if (!sale) return null;
    const items = await db.getAllAsync<SaleItem>(
      `SELECT id, sale_id as saleId, product_id as productId, product_name as productName, qty, price, cost_price as costPrice, subtotal, created_at as createdAt FROM sale_items WHERE sale_id = ?`,
      [sale.id]
    );
    return { ...sale, items };
  },

  async getByDate(date: string): Promise<SaleWithItems[]> {
    const db = await getDatabase();
    const startDate = `${date}T00:00:00.000Z`;
    const endDate = `${date}T23:59:59.999Z`;
    const sales = await db.getAllAsync<Sale>(
      `SELECT id, invoice_number as invoiceNumber, customer_id as customerId, total_amount as totalAmount, paid_amount as paidAmount, change_amount as changeAmount, payment_method as paymentMethod, status, created_at as createdAt, updated_at as updatedAt FROM sales WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC`,
      [startDate, endDate]
    );

    const result: SaleWithItems[] = [];
    for (const sale of sales) {
      const items = await db.getAllAsync<SaleItem>(
        `SELECT id, sale_id as saleId, product_id as productId, product_name as productName, qty, price, cost_price as costPrice, subtotal, created_at as createdAt FROM sale_items WHERE sale_id = ?`,
        [sale.id]
      );
      result.push({ ...sale, items });
    }
    return result;
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
    return { ...sale, items };
  },

  async updateStatus(id: string, status: TransactionStatus): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`UPDATE sales SET status = ?, updated_at = ? WHERE id = ?`, [status, new Date().toISOString(), id]);
  },
};
