export type DebtStatus = 'unpaid' | 'partial' | 'paid';

export interface Debt {
  id: string;
  customerId: string;
  saleId: string | null;
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
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface DebtWithCustomer extends Debt {
  customerName: string;
  customerPhone: string | null;
}
