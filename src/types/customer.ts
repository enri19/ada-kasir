export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  isActive: number; // 1 = aktif, 0 = nonaktif
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDebtSummary {
  totalDebt: number;      // total sisa bon belum lunas
  totalBon: number;       // jumlah bon
}

export interface CustomerFormData {
  name: string;
  phone: string;
  address: string;
  note: string;
}
