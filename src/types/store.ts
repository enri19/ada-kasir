export interface Store {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  receiptNote: string;
  logoUri: string | null;
  qrisImageUri: string | null;
  qrisName: string | null;
  qrisNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoreFormData {
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  receiptNote: string;
  logoUri?: string | null;
}
