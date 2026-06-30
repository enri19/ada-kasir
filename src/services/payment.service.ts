export type PaymentMethod = 'cash' | 'qris_static' | 'debt';

export type SaleStatus = 'paid' | 'debt' | 'cancelled';

export function calculateChange(total: number, paidAmount: number): number {
  return Math.max(paidAmount - total, 0);
}

export function isPaymentValid(params: {
  method: PaymentMethod;
  total: number;
  paidAmount?: number;
  customerId?: string;
}): boolean {
  if (params.total <= 0) return false;

  if (params.method === 'cash') {
    return (params.paidAmount ?? 0) >= params.total;
  }

  if (params.method === 'qris_static') {
    return true;
  }

  if (params.method === 'debt') {
    return Boolean(params.customerId);
  }

  return false;
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'cash': return 'Tunai';
    case 'qris_static': return 'QRIS';
    case 'debt': return 'Bon';
    default: return method;
  }
}

export function getSaleStatusLabel(status: SaleStatus): string {
  switch (status) {
    case 'paid': return 'Lunas';
    case 'debt': return 'Belum Lunas';
    case 'cancelled': return 'Dibatalkan';
    default: return status;
  }
}
