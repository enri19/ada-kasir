import { generateInvoiceNumber } from '../utils/invoice-number';
import { SaleRepository } from '../database/sales.repo';
import { DebtRepository } from '../database/debt.repo';
import { CartItem } from '../stores/cart.store';
import { PaymentMethod } from '../types/sale';
import { StockService } from './stock.service';

export const InvoiceService = {
  async processTransaction(
    items: CartItem[],
    customerId: string | null,
    paymentMethod: PaymentMethod,
    paidAmount: number,
    discount: number = 0
  ) {
    const transactionCount = await SaleRepository.getTodayCount();
    const invoiceNumber = generateInvoiceNumber(transactionCount);
    const subtotalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalAmount = Math.max(0, subtotalAmount - discount);
    const changeAmount = paymentMethod === 'cash' ? Math.max(0, paidAmount - totalAmount) : 0;
    const status = paymentMethod === 'debt' ? 'debt' : 'paid';

    const saleItems = items.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      qty: item.qty,
      price: item.product.sellPrice,
      costPrice: item.product.costPrice,
      subtotal: item.subtotal,
    }));

    const sale = await SaleRepository.createSale(
      invoiceNumber,
      customerId,
      totalAmount,
      paidAmount,
      changeAmount,
      paymentMethod,
      status,
      saleItems
    );

    await StockService.reduceStockForSaleItems(items, sale.id, 'sale');

    if (paymentMethod === 'debt' && customerId) {
      await DebtRepository.createDebt(
        customerId,
        sale.id,
        totalAmount,
        0,
        totalAmount,
        'unpaid',
        null,
        null,
        'transaction'
      );
    }

    return sale;
  },
};
