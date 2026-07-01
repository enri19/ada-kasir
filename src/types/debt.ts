export type DebtStatus = 'unpaid' | 'partial' | 'paid';
export type DebtSource = 'transaction' | 'manual';

export interface Debt {
  id: string;
  customerId: string;
  saleId: string | null;
  source: DebtSource;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: DebtStatus;
  dueDate: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  customerId: string;
  amount: number;
  paymentMethod: 'cash' | 'qris_static';
  note: string | null;
  paidAt: string;
  createdAt: string;
}

export interface DebtWithCustomer extends Debt {
  customerName: string;
  customerPhone: string | null;
}
