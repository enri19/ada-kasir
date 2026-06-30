import { getDatabase } from './db';

export interface DailyReport {
  totalSales: number;
  totalTransactions: number;
  totalProfit: number;
  totalDebt: number;
  cashTotal: number;
  qrisTotal: number;
  debtTotal: number;
  topProducts: { name: string; qty: number; revenue: number }[];
  hourlySales: { hour: number; total: number }[];
}

export const ReportRepository = {
  async getDailyReport(date?: string): Promise<DailyReport> {
    const db = await getDatabase();
    const targetDate = date || new Date().toISOString().split('T')[0];
    const startDate = `${targetDate}T00:00:00.000Z`;
    const endDate = `${targetDate}T23:59:59.999Z`;

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
      `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, SUM(total_amount) as total 
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

    return {
      totalSales: salesResult?.total || 0,
      totalTransactions: salesResult?.count || 0,
      totalProfit: profitResult?.profit || 0,
      totalDebt: debtResult?.total || 0,
      cashTotal: cashResult?.total || 0,
      qrisTotal: qrisResult?.total || 0,
      debtTotal: debtResult2?.total || 0,
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

  async getTransactionsByDate(date: string): Promise<any[]> {
    const db = await getDatabase();
    const startDate = `${date}T00:00:00.000Z`;
    const endDate = `${date}T23:59:59.999Z`;
    return await db.getAllAsync(
      `SELECT id, invoice_number as invoiceNumber, total_amount as totalAmount, payment_method as paymentMethod, status, created_at as createdAt 
       FROM sales WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC`,
      [startDate, endDate]
    );
  },
};
