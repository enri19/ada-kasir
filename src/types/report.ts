export interface DailyReport {
  totalSales: number;
  totalTransactions: number;
  totalProfit: number;
  totalDebt: number;
  topProducts: { name: string; qty: number; revenue: number }[];
  hourlySales: { hour: number; total: number }[];
}
