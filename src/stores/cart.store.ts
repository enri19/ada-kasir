import { create } from 'zustand';
import { Product } from '../types/product';
import { PaymentMethod } from '../types/sale';

export interface CartItem {
  product: Product;
  qty: number;
  subtotal: number;
}

interface CartPaymentState {
  paymentMethod: PaymentMethod;
  paidAmount: number;
  selectedCustomerId: string | null;
  paymentNote: string;
}

interface CartState {
  items: CartItem[];
  discount: number;
  discountNote: string;
  payment: CartPaymentState;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  setDiscount: (amount: number, note?: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setPaidAmount: (amount: number) => void;
  setSelectedCustomer: (customerId: string | null) => void;
  setPaymentNote: (note: string) => void;
  resetPayment: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

const defaultPayment: CartPaymentState = {
  paymentMethod: 'cash',
  paidAmount: 0,
  selectedCustomerId: null,
  paymentNote: '',
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,
  discountNote: '',
  payment: { ...defaultPayment },

  addItem: (product) => {
    const items = get().items;
    const existingIndex = items.findIndex((item) => item.product.id === product.id);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        qty: newItems[existingIndex].qty + 1,
        subtotal: (newItems[existingIndex].qty + 1) * product.sellPrice,
      };
      set({ items: newItems });
    } else {
      set({
        items: [
          ...items,
          {
            product,
            qty: 1,
            subtotal: product.sellPrice,
          },
        ],
      });
    }
  },

  removeItem: (productId) => {
    set({ items: get().items.filter((item) => item.product.id !== productId) });
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    const items = get().items.map((item) =>
      item.product.id === productId
        ? { ...item, qty, subtotal: qty * item.product.sellPrice }
        : item
    );
    set({ items });
  },

  clearCart: () => set({ items: [], discount: 0, discountNote: '', payment: { ...defaultPayment } }),

  setDiscount: (amount, note) => {
    set({ discount: Math.max(0, amount), discountNote: note || '' });
  },

  setPaymentMethod: (method) => {
    const total = get().getTotal();
    set({
      payment: {
        ...get().payment,
        paymentMethod: method,
        paidAmount: method === 'qris_static' ? total : method === 'debt' ? 0 : get().payment.paidAmount,
      },
    });
  },

  setPaidAmount: (amount) => {
    set({ payment: { ...get().payment, paidAmount: amount } });
  },

  setSelectedCustomer: (customerId) => {
    set({ payment: { ...get().payment, selectedCustomerId: customerId } });
  },

  setPaymentNote: (note) => {
    set({ payment: { ...get().payment, paymentNote: note } });
  },

  resetPayment: () => {
    set({ payment: { ...defaultPayment } });
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  getTotal: () => {
    const subtotal = get().items.reduce((sum, item) => sum + item.subtotal, 0);
    return Math.max(0, subtotal - get().discount);
  },

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.qty, 0);
  },
}));
