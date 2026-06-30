export type PaymentMethod = 'cash' | 'qris_static' | 'debt';
export type TransactionStatus = 'paid' | 'debt' | 'cancelled';

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string | null;
  productName: string;
  qty: number;
  price: number;
  costPrice: number;
  subtotal: number;
  createdAt: string;
}

export interface SaleFormData {
  customerId: string | null;
  paymentMethod: PaymentMethod;
  paidAmount: number;
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
  customerName?: string;
}
