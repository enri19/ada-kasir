export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFormData {
  name: string;
  phone: string;
  address: string;
  note: string;
}
