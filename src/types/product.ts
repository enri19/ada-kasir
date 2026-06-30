export interface Product {
  id: string;
  categoryId: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  costPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  trackStock: boolean;
  allowNegativeStock: boolean;
  unit: string;
  imageUri: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormData {
  name: string;
  categoryId: string | null;
  sku: string;
  barcode: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  trackStock: boolean;
  allowNegativeStock: boolean;
  unit: string;
  imageUri: string | null;
  isActive: boolean;
}

export type StockMovementType = 'initial' | 'sale' | 'stock_in' | 'stock_out' | 'adjustment' | 'return' | 'cancel';

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  qty: number;
  stockBefore: number;
  stockAfter: number;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
}

export const PRODUCT_UNITS = ['pcs', 'bungkus', 'botol', 'kaleng', 'sack', 'kg', 'liter', 'dus', 'box', 'pack'] as const;
export type ProductUnit = typeof PRODUCT_UNITS[number];
