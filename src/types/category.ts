export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryFormData {
  name: string;
  sortOrder?: number;
}
