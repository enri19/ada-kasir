import { getDatabase } from './db';
import { DailyReport, LowStockProduct } from '../types/report';

const getLocalDayRange = (date?: string) => {
  const now = new Date();
  const parts = date?.split('-').map(Number);
  const year = parts?.[0] || now.getFullYear();
  const month = parts?.[1] || now.getMonth() + 1;
  const day = parts?.[2] || now.getDate();

  return {
    startDate: new Date(year, month - 1, day, 0, 0, 0, 0).toISOString(),
    endDate: new Date(year, month - 1, day, 23, 59, 59, 999).toISOString(),
  };
};

export const ReportRepository = {
  async getDailyReport(date?: string): Promise<DailyReport> {
    const db = await getDatabase();
    const { startDate, endDate } = getLocalDayRange(date);

    // Run all independent aggregate queries in parallel
    const [
      salesResult,
      profitResult,
      debtResult,
      topProducts,
      hourlySales,
      paymentMethodRows,
      debtPaymentRows,
      stockSummary,
    ] = await Promise.all([
      // 1. Sales total + count
      db.getFirstAsync<{ total: number; count: number }>(
        `SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count FROM sales WHERE created_at >= ? AND created_at <= ? AND status != 'cancelled'`,
        [startDate, endDate]
      ),

      // 2. Profit
      db.getFirstAsync<{ profit: number }>(
        `SELECT COALESCE(SUM((si.price - si.cost_price) * si.qty), 0) as profit
         FROM sale_items si JOIN sales s ON si.sale_id = s.id
         WHERE s.created_at >= ? AND s.created_at <= ? AND s.status != 'cancelled'`,
        [startDate, endDate]
      ),

      // 3. Total debt (unpaid)
      db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(remaining_amount), 0) as total FROM debts WHERE status != 'paid'`
      ),

      // 4. Top products
      db.getAllAsync<{ name: string; qty: number; revenue: number }>(
        `SELECT si.product_name as name, SUM(si.qty) as qty, SUM(si.subtotal) as revenue
         FROM sale_items si JOIN sales s ON si.sale_id = s.id
         WHERE s.created_at >= ? AND s.created_at <= ? AND s.status != 'cancelled'
         GROUP BY si.product_name ORDER BY qty DESC LIMIT 5`,
        [startDate, endDate]
      ),

      // 5. Hourly sales
      db.getAllAsync<{ hour: number; total: number }>(
        `SELECT CAST(strftime('%H', created_at, 'localtime') AS INTEGER) as hour, COUNT(*) as total
         FROM sales WHERE created_at >= ? AND created_at <= ? AND status != 'cancelled'
         GROUP BY hour ORDER BY hour`,
        [startDate, endDate]
      ),

      // 6. Combined: sales totals by payment method (cash, qris, debt)
      db.getAllAsync<{ paymentMethod: string; total: number }>(
        `SELECT payment_method as paymentMethod, COALESCE(SUM(total_amount), 0) as total
         FROM sales WHERE created_at >= ? AND created_at <= ? AND status != 'cancelled'
         GROUP BY payment_method`,
        [startDate, endDate]
      ),

      // 7. Combined: debt payments by payment method (cash, qris)
      db.getAllAsync<{ paymentMethod: string; total: number }>(
        `SELECT payment_method as paymentMethod, COALESCE(SUM(amount), 0) as total
         FROM debt_payments WHERE paid_at >= ? AND paid_at <= ?
         GROUP BY payment_method`,
        [startDate, endDate]
      ),

      // 8. Stock summary
      db.getFirstAsync<{
        totalProducts: number;
        totalActiveProducts: number;
        totalStockLow: number;
        totalStockOut: number;
        totalStockValue: number;
      }>(
        `SELECT
           COUNT(*) as totalProducts,
           SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as totalActiveProducts,
           SUM(CASE WHEN track_stock = 1 AND min_stock > 0 AND stock <= min_stock THEN 1 ELSE 0 END) as totalStockLow,
           SUM(CASE WHEN track_stock = 1 AND stock <= 0 THEN 1 ELSE 0 END) as totalStockOut,
           COALESCE(SUM(stock * cost_price), 0) as totalStockValue
         FROM products`,
        []
      ),
    ]);

    // Parse grouped payment methods
    const pmtMap = new Map<string, number>();
    for (const row of paymentMethodRows || []) {
      pmtMap.set(row.paymentMethod, row.total);
    }
    const cashTotal = pmtMap.get('cash') || 0;
    const qrisTotal = pmtMap.get('qris_static') || 0;
    const debtTotal = pmtMap.get('debt') || 0;

    // Parse grouped debt payments
    const dpMap = new Map<string, number>();
    for (const row of debtPaymentRows || []) {
      dpMap.set(row.paymentMethod, row.total);
    }
    const debtCashTotal = dpMap.get('cash') || 0;
    const debtQrisTotal = dpMap.get('qris_static') || 0;
    const debtPaymentTotal = debtCashTotal + debtQrisTotal;

    return {
      totalSales: cashTotal + qrisTotal + debtTotal,
      totalTransactions: salesResult?.count || 0,
      totalProfit: profitResult?.profit || 0,
      totalDebt: debtResult?.total || 0,
      cashTotal,
      qrisTotal,
      debtTotal,
      debtCashTotal,
      debtQrisTotal,
      debtPaymentTotal,
      totalCashIn: cashTotal + qrisTotal + debtPaymentTotal,
      totalProducts: stockSummary?.totalProducts || 0,
      totalActiveProducts: stockSummary?.totalActiveProducts || 0,
      totalStockLow: stockSummary?.totalStockLow || 0,
      totalStockOut: stockSummary?.totalStockOut || 0,
      totalStockValue: stockSummary?.totalStockValue || 0,
      topProducts,
      hourlySales,
    };
  },

  async getRecentTransactions(limit: number = 10): Promise<any[]> {
    const db = await getDatabase();
    return await db.getAllAsync(
      `SELECT s.id, s.invoice_number as invoiceNumber, s.total_amount as totalAmount,
              s.payment_method as paymentMethod, s.status, s.created_at as createdAt,
              c.name as customerName
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       ORDER BY s.created_at DESC LIMIT ?`,
      [limit]
    );
  },

  async getLowStockProducts(limit: number = 5): Promise<LowStockProduct[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT id, name, stock, min_stock as minStock, track_stock as trackStock
       FROM products
       WHERE track_stock = 1 AND is_active = 1 AND stock <= min_stock
       ORDER BY stock ASC, min_stock ASC
       LIMIT ?`,
      [limit]
    );
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      stock: row.stock,
      minStock: row.minStock,
      trackStock: row.trackStock === 1,
    }));
  },

  async getTransactionsByDate(date: string): Promise<any[]> {
    const db = await getDatabase();
    const { startDate, endDate } = getLocalDayRange(date);
    return await db.getAllAsync(
      `SELECT s.id, s.invoice_number as invoiceNumber, s.total_amount as totalAmount,
              s.payment_method as paymentMethod, s.status, s.created_at as createdAt,
              c.name as customerName
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.created_at >= ? AND s.created_at <= ?
       ORDER BY s.created_at DESC`,
      [startDate, endDate]
    );
  },

  async getTransactionsByRange(startDate: string, endDate: string, limit = 50): Promise<any[]> {
    const db = await getDatabase();
    return await db.getAllAsync(
      `SELECT s.id, s.invoice_number as invoiceNumber, s.total_amount as totalAmount,
              s.payment_method as paymentMethod, s.status, s.created_at as createdAt,
              c.name as customerName
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.created_at >= ? AND s.created_at <= ? AND s.status != 'cancelled'
       ORDER BY s.created_at DESC LIMIT ?`,
      [startDate, endDate, limit]
    );
  },

  async getTopProductsByRange(startDate: string, endDate: string, limit = 50): Promise<{ name: string; qty: number; revenue: number }[]> {
    const db = await getDatabase();
    return await db.getAllAsync<{ name: string; qty: number; revenue: number }>(
      `SELECT si.product_name as name, SUM(si.qty) as qty, SUM(si.subtotal) as revenue 
       FROM sale_items si JOIN sales s ON si.sale_id = s.id 
       WHERE s.created_at >= ? AND s.created_at <= ? AND s.status != 'cancelled'
       GROUP BY si.product_name ORDER BY qty DESC LIMIT ?`,
      [startDate, endDate, limit]
    );
  },
};
