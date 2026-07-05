export interface DailyReport {
  totalSales: number;
  totalTransactions: number;
  totalProfit: number;
  totalDebt: number;
  cashTotal: number;
  qrisTotal: number;
  debtTotal: number;
  debtCashTotal?: number; // pembayaran bon tunai
  debtQrisTotal?: number; // pembayaran bon qris
  debtPaymentTotal?: number; // total pembayaran piutang/bon
  totalCashIn?: number; // kas masuk = tunai + qris + pembayaran piutang
  totalProducts: number;
  totalActiveProducts: number;
  totalStockLow: number;
  totalStockOut: number;
  totalStockValue: number;
  topProducts: { name: string; qty: number; revenue: number }[];
  hourlySales: { hour: number; total: number }[];
}

export interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  trackStock: boolean;
}

export type ReportFilter = {
  date?: string;
  startDate?: string;
  endDate?: string;
};
