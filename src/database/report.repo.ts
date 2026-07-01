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

    const salesResult = await db.getFirstAsync<{ total: number; count: number }>(
      `SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count FROM sales WHERE created_at >= ? AND created_at <= ? AND status != 'cancelled'`,
      [startDate, endDate]
    );

    const profitResult = await db.getFirstAsync<{ profit: number }>(
      `SELECT COALESCE(SUM((si.price - si.cost_price) * si.qty), 0) as profit 
       FROM sale_items si JOIN sales s ON si.sale_id = s.id 
       WHERE s.created_at >= ? AND s.created_at <= ? AND s.status != 'cancelled'`,
      [startDate, endDate]
    );

    const debtResult = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(remaining_amount), 0) as total FROM debts WHERE status != 'paid'`
    );

    const topProducts = await db.getAllAsync<{ name: string; qty: number; revenue: number }>(
      `SELECT si.product_name as name, SUM(si.qty) as qty, SUM(si.subtotal) as revenue 
       FROM sale_items si JOIN sales s ON si.sale_id = s.id 
       WHERE s.created_at >= ? AND s.created_at <= ? AND s.status != 'cancelled'
       GROUP BY si.product_name ORDER BY qty DESC LIMIT 5`,
      [startDate, endDate]
    );

    const hourlySales = await db.getAllAsync<{ hour: number; total: number }>(
      `SELECT CAST(strftime('%H', created_at, 'localtime') AS INTEGER) as hour, COUNT(*) as total 
       FROM sales WHERE created_at >= ? AND created_at <= ? AND status != 'cancelled'
       GROUP BY hour ORDER BY hour`,
      [startDate, endDate]
    );

    const cashResult = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE created_at >= ? AND created_at <= ? AND payment_method = 'cash' AND status != 'cancelled'`,
      [startDate, endDate]
    );

    const qrisResult = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE created_at >= ? AND created_at <= ? AND payment_method = 'qris_static' AND status != 'cancelled'`,
      [startDate, endDate]
    );

    const debtResult2 = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE created_at >= ? AND created_at <= ? AND payment_method = 'debt' AND status != 'cancelled'`,
      [startDate, endDate]
    );

    const debtPaymentsCash = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM debt_payments WHERE created_at >= ? AND created_at <= ? AND payment_method = 'cash'`,
      [startDate, endDate]
    );

    const debtPaymentsQris = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM debt_payments WHERE created_at >= ? AND created_at <= ? AND payment_method = 'qris_static'`,
      [startDate, endDate]
    );

    const stockSummary = await db.getFirstAsync<{
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
    );

    return {
      totalSales: salesResult?.total || 0,
      totalTransactions: salesResult?.count || 0,
      totalProfit: profitResult?.profit || 0,
      totalDebt: debtResult?.total || 0,
      cashTotal: cashResult?.total || 0,
      qrisTotal: qrisResult?.total || 0,
      debtTotal: debtResult2?.total || 0,
      debtCashTotal: debtPaymentsCash?.total || 0,
      debtQrisTotal: debtPaymentsQris?.total || 0,
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
      `SELECT id, invoice_number as invoiceNumber, total_amount as totalAmount, payment_method as paymentMethod, status, created_at as createdAt 
       FROM sales ORDER BY created_at DESC LIMIT ?`,
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
      `SELECT id, invoice_number as invoiceNumber, total_amount as totalAmount, payment_method as paymentMethod, status, created_at as createdAt 
       FROM sales WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC`,
      [startDate, endDate]
    );
  },

  async getTransactionsByRange(startDate: string, endDate: string, limit = 50): Promise<any[]> {
    const db = await getDatabase();
    return await db.getAllAsync(
      `SELECT id, invoice_number as invoiceNumber, total_amount as totalAmount, payment_method as paymentMethod, status, created_at as createdAt 
       FROM sales WHERE created_at >= ? AND created_at <= ? AND status != 'cancelled' ORDER BY created_at DESC LIMIT ?`,
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
