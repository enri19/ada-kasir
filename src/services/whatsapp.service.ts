import { SaleWithItems } from '../types/sale';
import { Store } from '../types/store';

export const WhatsAppService = {
  generateReceiptText(store: Store, sale: SaleWithItems): string {
    const lines: string[] = [];
    lines.push(`*${store.name}*`);
    if (store.address) lines.push(store.address);
    if (store.phone) lines.push(`Telp: ${store.phone}`);
    lines.push('');
    lines.push(`No: ${sale.invoiceNumber}`);
    lines.push(`Tanggal: ${new Date(sale.createdAt).toLocaleDateString('id-ID')}`);
    lines.push(`Jam: ${new Date(sale.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    sale.items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.productName} x${item.qty} = Rp${item.subtotal.toLocaleString('id-ID')}`);
    });

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`Total: Rp${sale.totalAmount.toLocaleString('id-ID')}`);

    if (sale.paymentMethod === 'cash') {
      lines.push(`Bayar: Rp${sale.paidAmount.toLocaleString('id-ID')}`);
      lines.push(`Kembali: Rp${sale.changeAmount.toLocaleString('id-ID')}`);
      lines.push('');
      lines.push('Pembayaran: Tunai');
    } else if (sale.paymentMethod === 'qris_static') {
      lines.push('');
      lines.push('Pembayaran: QRIS');
    } else if (sale.paymentMethod === 'debt') {
      lines.push('');
      lines.push('Pembayaran: Bon');
      lines.push('Status: Belum Lunas');
    }

    lines.push('');
    if (store.receiptNote) {
      lines.push(store.receiptNote);
      lines.push('');
    }
    lines.push('Terima kasih.');

    return lines.join('\n');
  },

  generateDebtReminderText(store: Store, customerName: string, totalDebt: number, paidAmount: number, remainingAmount: number): string {
    const lines: string[] = [];
    lines.push(`Assalamu'alaikum Pak/Bu ${customerName},`);
    lines.push('');
    lines.push(`Catatan bon di ${store.name}:`);
    lines.push('');
    lines.push(`Total bon: Rp${totalDebt.toLocaleString('id-ID')}`);
    lines.push(`Sudah dibayar: Rp${paidAmount.toLocaleString('id-ID')}`);
    lines.push(`Sisa bon: Rp${remainingAmount.toLocaleString('id-ID')}`);
    lines.push('');
    lines.push('Mohon dicek kembali. Terima kasih.');
    return lines.join('\n');
  },

  sendToWhatsApp(phoneNumber: string, text: string): void {
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    const formatted = cleaned.startsWith('62') ? cleaned : `62${cleaned}`;
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${formatted}?text=${encoded}`;
    // In React Native, use Linking.openURL(url)
  },
};
