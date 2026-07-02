/**
 * receipt-printer-format.ts
 *
 * Helper format struk thermal untuk printer 58mm dan 80mm.
 *
 * ── Lebar karakter ──
 * 58mm → 32 karakter
 * 80mm → 48 karakter
 *
 * ── Contoh output ──
 * ================================
 *         Warung Berkah
 *      Jl. Merdeka No. 123
 *       Telp: 08123456789
 * ================================
 * No    : INV-001
 * Tgl   : 1 Januari 2025
 * Jam   : 14:30
 * Kasir : Budi
 * Pembeli: Siti
 * --------------------------------
 * Nasi Goreng
 * 2 x Rp15.000         Rp30.000
 * Es Teh
 * 1 x Rp5.000           Rp5.000
 * --------------------------------
 * Subtotal              Rp35.000
 * Diskon                -Rp5.000
 * ================================
 * TOTAL                 Rp30.000
 * ================================
 * Pembayaran: Tunai
 * Tunai     : Rp50.000
 * Kembali   : Rp20.000
 * --------------------------------
 * Terima kasih
 * Silakan datang kembali
 * ================================
 */

import { PrinterReceiptData, PrinterReceiptItem, PrinterSize } from '../types/printer';

// ─── Konstanta ────────────────────────────────────────────

const CHAR_WIDTH: Record<PrinterSize, number> = {
  '58mm': 32,
  '80mm': 48,
};

// ─── Helper Format ────────────────────────────────────────

/**
 * Format angka ke format rupiah tanpa desimal.
 * Contoh: 15000 → "Rp15.000"
 */
export function formatRupiah(value: number): string {
  if (!Number.isFinite(value) || value < 0) value = 0;
  if (value === 0) return 'Rp0';
  return `Rp${Math.round(value).toLocaleString('id-ID')}`;
}

/**
 * Buat garis pemisah dengan karakter tertentu.
 * @param width Lebar baris (default 32 untuk 58mm)
 * @param char Karakter pengisi (default "=")
 */
export function divider(width: number = 32, char: string = '='): string {
  return char.repeat(width);
}

/**
 * Rata tengah teks dalam lebar tertentu.
 */
export function centerText(text: string, width: number): string {
  const trimmed = text.trim();
  const padLeft = Math.max(0, Math.floor((width - trimmed.length) / 2));
  const padRight = Math.max(0, width - trimmed.length - padLeft);
  return ' '.repeat(padLeft) + trimmed + ' '.repeat(padRight);
}

/**
 * Rata kiri dan kanan dalam satu baris.
 * @example leftRight("Subtotal", "Rp30.000", 32)
 *          → "Subtotal              Rp30.000"
 */
export function leftRight(left: string, right: string, width: number): string {
  const truncatedLeft = truncateText(left, Math.max(1, width - right.length - 1));
  const spaces = Math.max(1, width - truncatedLeft.length - right.length);
  return truncatedLeft + ' '.repeat(spaces) + right;
}

/**
 * Bungkus teks panjang agar muat dalam lebar tertentu.
 * Memotong kata jika terlalu panjang.
 */
export function wrapText(text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    // Jika satu kata lebih panjang dari width, potong paksa
    if (word.length > width) {
      if (currentLine) lines.push(currentLine);
      for (let i = 0; i < word.length; i += width) {
        lines.push(word.slice(i, i + width));
      }
      currentLine = '';
      continue;
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= width) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

/**
 * Potong teks agar tidak melebihi maxLength.
 * Jika terpotong, tambahkan "…" di akhir.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 1)) + '…';
}

/**
 * Format satu baris item struk.
 * Hasilnya bisa 1-2 baris tergantung panjang nama produk.
 *
 * Baris 1: Nama produk (wrap/truncate)
 * Baris 2: qty x harga                subtotal
 */
function formatItemLine(item: PrinterReceiptItem, width: number): string[] {
  const lines: string[] = [];

  const qtyPrice = `${item.quantity} x ${formatRupiah(item.price)}`;
  const subTotal = formatRupiah(item.subtotal);

  // Jika nama produk pendek, satukan dalam satu baris dengan qty info
  const combinedLine = `${item.quantity}x ${truncateText(item.name, width - subTotal.length - 3)}`;
  if (combinedLine.length + subTotal.length + 1 <= width) {
    // Nama pendek: "2x Nasi           Rp30.000"
    lines.push(leftRight(`${item.quantity}x ${item.name}`, subTotal, width));
  } else {
    // Nama panjang: tulis nama dulu, lalu baris qty + subtotal
    const wrappedName = wrapText(item.name, width);
    wrappedName.forEach((n) => lines.push(n));
    lines.push(leftRight(qtyPrice, subTotal, width));
  }

  return lines;
}

/**
 * Konversi label metode pembayaran dari internal ke tampilan.
 */
function getPaymentLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    qris_static: 'QRIS',
    transfer: 'Transfer',
    debt: 'Bon',
  };
  return labels[method] || method;
}

// ─── Builder Struk ────────────────────────────────────────

/**
 * Format data transaksi menjadi teks struk thermal.
 *
 * @param data   - Data transaksi
 * @param options - Opsi: paperSize ('58mm' | '80mm')
 * @returns Teks struk siap cetak
 */
export function formatReceiptForPrinter(
  data: PrinterReceiptData,
  options: { paperSize?: PrinterSize } = {}
): string {
  const size = options.paperSize || '58mm';
  const W = CHAR_WIDTH[size];
  const lines: string[] = [];

  // ── Header Toko ──
  lines.push('');
  if (data.storeName) {
    lines.push(centerText(data.storeName, W));
  }
  if (data.storeAddress) {
    const addressLines = wrapText(data.storeAddress, W);
    addressLines.forEach((l) => lines.push(centerText(l, W)));
  }
  if (data.storePhone) {
    lines.push(centerText(`Telp: ${data.storePhone}`, W));
  }
  lines.push(divider(W, '='));

  // ── Info Transaksi ──
  lines.push(`No    : ${data.invoiceNumber}`);
  lines.push(`Tgl   : ${data.date}`);
  if (data.time) {
    lines.push(`Jam   : ${data.time}`);
  }
  if (data.cashierName) {
    lines.push(`Kasir : ${data.cashierName}`);
  }
  if (data.customerName) {
    lines.push(`Pembeli: ${truncateText(data.customerName, W - 8)}`);
  }
  lines.push(divider(W, '-'));

  // ── Daftar Item ──
  data.items.forEach((item) => {
    const itemLines = formatItemLine(item, W);
    itemLines.forEach((l) => lines.push(l));
  });
  lines.push(divider(W, '-'));

  // ── Ringkasan Harga ──
  lines.push(leftRight('Subtotal', formatRupiah(data.subtotal), W));
  const discount = data.discount ?? 0;
  if (discount > 0) {
    lines.push(leftRight('Diskon', `-${formatRupiah(discount)}`, W));
  }
  lines.push(divider(W, '='));
  lines.push(leftRight('TOTAL', formatRupiah(data.total), W));
  lines.push(divider(W, '='));

  // ── Pembayaran ──
  const paymentLabel = getPaymentLabel(data.paymentMethod);
  lines.push(`Pembayaran: ${paymentLabel}`);

  if (data.paymentMethod === 'cash' || paymentLabel === 'Tunai') {
    if (data.paidAmount && data.paidAmount > 0) {
      lines.push(`Tunai     : ${formatRupiah(data.paidAmount)}`);
      lines.push(`Kembali   : ${formatRupiah(data.changeAmount ?? 0)}`);
    }
  }

  if (data.paymentMethod === 'debt' || paymentLabel === 'Bon') {
    if (data.debtAmount && data.debtAmount > 0) {
      lines.push(`Bon       : ${formatRupiah(data.debtAmount)}`);
    } else {
      lines.push(`Status    : Belum Lunas`);
    }
  }

  // ── Catatan ──
  if (data.note) {
    lines.push(divider(W, '-'));
    const noteLines = wrapText(data.note, W);
    noteLines.forEach((l) => lines.push(l));
  }

  // ── Footer ──
  lines.push(divider(W, '-'));
  lines.push('');
  lines.push(centerText('Terima kasih', W));
  lines.push(centerText('Silakan datang kembali', W));
  lines.push('');
  lines.push(divider(W, '='));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format struk test print untuk memverifikasi printer.
 *
 * @param options - Opsi: paperSize ('58mm' | '80mm')
 * @returns Teks test print
 */
export function formatTestReceipt(options: { paperSize?: PrinterSize } = {}): string {
  const size = options.paperSize || '58mm';
  const W = CHAR_WIDTH[size];
  const lines: string[] = [];

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  lines.push('');
  lines.push(centerText('TEST PRINT', W));
  lines.push(centerText('============', W));
  lines.push('');
  lines.push(centerText('AdaKasir', W));
  lines.push(centerText('Sistem Kasir Offline', W));
  lines.push('');
  lines.push(divider(W, '-'));
  lines.push('');
  lines.push(centerText('PRINTER BEKERJA NORMAL', W));
  lines.push('');
  lines.push(centerText('Jika tulisan ini terbaca', W));
  lines.push(centerText('dengan jelas, printer', W));
  lines.push(centerText('siap digunakan.', W));
  lines.push('');
  lines.push(divider(W, '-'));
  lines.push('');

  // Informasi cetak
  lines.push(leftRight('Tanggal', dateStr, W));
  lines.push(leftRight('Jam', timeStr, W));
  lines.push(leftRight('Ukuran', size.toUpperCase(), W));
  lines.push(leftRight('Lebar', `${W} karakter`, W));

  lines.push('');
  lines.push(divider(W, '='));

  // Test alignment
  lines.push('');
  lines.push(centerText('— Rata Tengah —', W));
  lines.push('');
  lines.push(leftRight('Kiri', 'Kanan', W));
  lines.push('');

  // Test karakter
  lines.push(divider(W, '.'));
  lines.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  lines.push('0123456789');
  lines.push('!@#$%^&*()_+-=[]{}|;:,.<>?');
  lines.push('');

  // Test wrap
  const testLong = `Ini adalah teks panjang untuk menguji wrapping pada printer thermal ${size}.`;
  const wrapped = wrapText(testLong, W);
  wrapped.forEach((l) => lines.push(l));
  lines.push('');

  lines.push(divider(W, '='));
  lines.push('');
  lines.push(centerText('Terima kasih', W));
  lines.push(centerText('telah menggunakan AdaKasir!', W));
  lines.push('');
  lines.push(divider(W, '='));
  lines.push('');

  return lines.join('\n');
}
