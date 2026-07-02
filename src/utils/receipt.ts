import { ReceiptData, PrinterSize } from '../types/printer';

// ─── Konstanta ────────────────────────────────────────────

/** Lebar karakter default per ukuran printer */
const WIDTH: Record<PrinterSize, number> = {
  '58mm': 32,
  '80mm': 48,
};

/** Garis pemisah */
const LINE = '='.repeat(32);
const LINE_THIN = '-'.repeat(32);

// ─── Helper format ────────────────────────────────────────

/** Format rupiah tanpa desimal untuk struk */
export const formatRupiahStruk = (amount: number): string => {
  if (amount === 0) return 'Rp0';
  const formatted = Math.round(amount).toLocaleString('id-ID');
  return `Rp${formatted}`;
};

/** Potong teks agar tidak melebihi lebar tertentu */
const truncate = (text: string, maxWidth: number): string => {
  if (text.length <= maxWidth) return text;
  return text.slice(0, maxWidth - 1) + '…';
};

/** Rata kiri dalam lebar tertentu */
const padRight = (text: string, width: number): string => {
  return (text + ' '.repeat(width)).slice(0, width);
};

/** Rata tengah dalam lebar tertentu */
export const centerText = (text: string, width: number): string => {
  const trimmed = text.trim();
  const padLeft = Math.max(0, Math.floor((width - trimmed.length) / 2));
  const padRightCount = Math.max(0, width - trimmed.length - padLeft);
  return ' '.repeat(padLeft) + trimmed + ' '.repeat(padRightCount);
};

/**
 * Align kiri dan kanan dalam satu baris
 * Contoh: "Nasi Goreng           Rp15.000"
 */
const alignLeftRight = (left: string, right: string, width: number): string => {
  const truncatedLeft = truncate(left, width - right.length - 1);
  const spaces = width - truncatedLeft.length - right.length;
  return truncatedLeft + ' '.repeat(Math.max(1, spaces)) + right;
};

/**
 * Format item struk: nama produk, lalu qty x harga = subtotal
 * Contoh:
 *   Nasi Goreng
 *   2 x Rp12.000       Rp24.000
 */
const formatItemLine = (item: { name: string; qty: number; price: number; subtotal: number }, width: number): string[] => {
  const lines: string[] = [];
  const truncatedName = truncate(item.name, width);
  lines.push(truncatedName);

  const qtyPrice = `${item.qty} x ${formatRupiahStruk(item.price)}`;
  const subTotal = formatRupiahStruk(item.subtotal);
  lines.push(alignLeftRight(qtyPrice, subTotal, width));

  return lines;
};

/** Buat garis sesuai lebar */
const makeLine = (char: string, width: number): string => {
  return char.repeat(width);
};

// ─── Builder struk utama ──────────────────────────────────

/**
 * Generate teks struk thermal yang siap dikirim ke printer.
 *
 * @param data    - Data transaksi untuk struk
 * @param size    - Ukuran printer ('58mm' = 32 char, '80mm' = 48 char)
 * @returns       - Teks struk dengan format thermal
 */
export const buildReceiptText = (data: ReceiptData, size: PrinterSize = '58mm'): string => {
  const W = WIDTH[size];
  const lines: string[] = [];

  // ── Header toko ──
  lines.push('');
  lines.push(centerText(data.storeName, W));
  if (data.storeAddress) {
    lines.push(centerText(truncate(data.storeAddress, W), W));
  }
  if (data.storePhone) {
    lines.push(centerText(`Telp: ${data.storePhone}`, W));
  }
  lines.push(makeLine('=', W));

  // ── Info transaksi ──
  lines.push(`No    : ${data.invoiceNumber}`);
  lines.push(`Tgl   : ${data.date}`);
  lines.push(`Jam   : ${data.time}`);
  if (data.cashierName) {
    lines.push(`Kasir : ${data.cashierName}`);
  }
  if (data.customerName) {
    lines.push(`Pembeli: ${data.customerName}`);
  }
  lines.push(makeLine('-', W));

  // ── Daftar item ──
  data.items.forEach((item) => {
    const itemLines = formatItemLine(item, W);
    itemLines.forEach((l) => lines.push(l));
  });
  lines.push(makeLine('-', W));

  // ── Ringkasan harga ──
  lines.push(alignLeftRight('Subtotal', formatRupiahStruk(data.subtotal), W));
  if (data.discount > 0) {
    lines.push(alignLeftRight('Diskon', `-${formatRupiahStruk(data.discount)}`, W));
  }
  lines.push(makeLine('=', W));
  lines.push(alignLeftRight('TOTAL', formatRupiahStruk(data.total), W));
  lines.push(makeLine('=', W));

  // ── Pembayaran ──
  lines.push(`Pembayaran: ${data.paymentMethod}`);
  if (data.paymentMethod === 'Tunai' && data.paidAmount > 0) {
    lines.push(`Tunai     : ${formatRupiahStruk(data.paidAmount)}`);
    lines.push(`Kembali   : ${formatRupiahStruk(data.changeAmount)}`);
  }
  if (data.paymentMethod === 'Bon' && data.debtNote) {
    lines.push(`Catatan   : ${data.debtNote}`);
  }

  // ── Catatan kaki ──
  lines.push(makeLine('-', W));
  if (data.receiptNote) {
    const wrappedNote = wrapText(data.receiptNote, W);
    wrappedNote.forEach((n) => lines.push(n));
  }
  lines.push('');
  lines.push(centerText('Terima kasih', W));
  lines.push(centerText('Silakan datang kembali', W));
  lines.push('');
  lines.push(makeLine('=', W));
  lines.push('');

  return lines.join('\n');
};

/** Bungkus teks panjang agar muat dalam lebar tertentu */
const wrapText = (text: string, width: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= width) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.map((l) => centerText(l, width));
};

/**
 * Generate teks untuk test print.
 */
export const buildTestPrintText = (size: PrinterSize = '58mm'): string => {
  const W = WIDTH[size];
  const lines: string[] = [];

  lines.push('');
  lines.push(centerText('TEST PRINT', W));
  lines.push(centerText('============', W));
  lines.push('');
  lines.push(centerText('AdaKasir', W));
  lines.push(centerText('Sistem Kasir Offline', W));
  lines.push('');
  lines.push(makeLine('-', W));
  lines.push('');
  lines.push('  Printer berfungsi normal.');
  lines.push('  Terima kasih telah');
  lines.push('  menggunakan AdaKasir!');
  lines.push('');
  lines.push(`  Tanggal: ${new Date().toLocaleDateString('id-ID')}`);
  lines.push(`  Waktu  : ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
  lines.push('');
  lines.push(makeLine('=', W));
  lines.push('');

  return lines.join('\n');
};

/**
 * Ambil data struk dari objek transaksi untuk dikirim ke formatter.
 * Fungsi ini menyusun ReceiptData dari SaleWithItems dan Store.
 */
export const buildReceiptData = (params: {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  invoiceNumber: string;
  createdAt: string;
  cashierName?: string;
  customerName?: string;
  items: { productName: string; qty: number; price: number; subtotal: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paidAmount: number;
  changeAmount: number;
  debtNote?: string;
  receiptNote?: string;
}): ReceiptData => {
  const date = new Date(params.createdAt);
  return {
    storeName: params.storeName,
    storeAddress: params.storeAddress,
    storePhone: params.storePhone,
    invoiceNumber: params.invoiceNumber,
    date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    cashierName: params.cashierName,
    customerName: params.customerName,
    items: params.items.map((i) => ({
      name: i.productName,
      qty: i.qty,
      price: i.price,
      subtotal: i.subtotal,
    })),
    subtotal: params.subtotal,
    discount: params.discount,
    total: params.total,
    paymentMethod: params.paymentMethod,
    paidAmount: params.paidAmount,
    changeAmount: params.changeAmount,
    debtNote: params.debtNote,
    receiptNote: params.receiptNote,
  };
};
