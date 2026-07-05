/**
 * report-export.ts — Helper export laporan ke PDF dan CSV.
 *
 * ── Arsitektur ────────────────────────────────────────────
 * Modul ini berisi:
 *   1. Helpers (escapeHtml, escapeCsv, sanitizeFileName, format)
 *   2. buildReportHtml() — HTML rapi untuk PDF
 *   3. buildReportCsv() — CSV aman untuk Excel
 *   4. generatePdf() — cetak HTML ke PDF via expo-print
 *   5. generateCsvFile() — tulis CSV ke file via expo-file-system
 *   6. shareFile() — bagikan file via expo-sharing
 *
 * Semua fungsi export menerima data yang sudah jadi (tidak membaca
 * database langsung) sehingga bisa dipakai oleh service atau UI.
 *
 * ── Kompatibilitas ────────────────────────────────────────
 * ✅ Berjalan di Expo managed (tidak perlu prebuild).
 * ✅ expo-print untuk PDF, expo-sharing untuk share, expo-file-system
 *    untuk menulis file CSV.
 *
 * ── Catatan ───────────────────────────────────────────────
 * Export Excel menggunakan format CSV sebagai fallback karena
 * pustaka .xlsx murni di React Native rumit dan berat. CSV bisa
 * dibuka di Microsoft Excel, Google Sheets, dan LibreOffice Calc.
 */
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { DailyReport, ReportFilter } from '../types/report';
import { ReportRepository } from '../database/report.repo';
import { StoreRepository } from '../database/store.repo';

// ─── Konstanta ────────────────────────────────────────────

const DATE_LOCALE = 'id-ID';

// ─── Helpers ──────────────────────────────────────────────

/** Format rupiah untuk laporan */
export const formatRupiah = (amount: number): string => {
  if (amount === 0) return 'Rp0';
  return `Rp${Math.round(amount).toLocaleString(DATE_LOCALE)}`;
};

/** Format tanggal Indonesia (2 Juli 2026) */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(DATE_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/** Format tanggal dan jam Indonesia */
export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${formatDate(d)} ${d.toLocaleTimeString(DATE_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

/** Label metode pembayaran */
export const paymentMethodLabel = (method: string): string => {
  switch (method) {
    case 'cash':
      return 'Tunai';
    case 'qris_static':
      return 'QRIS';
    case 'debt':
      return 'Bon';
    default:
      return method;
  }
};

/** Label status transaksi */
export const statusLabel = (status: string, method?: string): string => {
  if (status === 'paid') return 'Lunas';
  if (status === 'debt' || method === 'debt') return 'Belum Lunas';
  return status;
};

/**
 * Escape karakter HTML untuk aman dimasukkan ke template HTML.
 */
export const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Escape nilai CSV untuk aman dibuka di Excel.
 * Mencegah formula injection dengan mengecek karakter awal
 * dan membungkus dengan tanda kutip jika perlu.
 */
export const escapeCsv = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);

  // Cegah formula injection — nilai diawali =, +, -, @, atau tab
  const sanitized = /^[=\+\-@\t]/.test(str) ? `'${str}` : str;

  // Jika mengandung koma, kutip, atau baris baru, bungkus dengan kutip
  if (/[,"\n\r]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
};

/**
 * Bersihkan nama file dari karakter ilegal.
 */
export const sanitizeFileName = (name: string): string => {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .toLowerCase();
};

// ─── Helper hitung ringkasan laporan ─────────────────────

/**
 * Hitung ringkasan laporan harian.
 */
export interface ReportSummary {
  /** Nama toko */
  storeName: string;
  /** Tanggal laporan (single day) */
  reportDate: string;
  /** Tanggal awal (period) */
  periodStart: string;
  /** Tanggal akhir (period) */
  periodEnd: string;
  /** Apakah laporan periode (bukan harian) */
  isPeriod: boolean;
  /** Total penjualan kotor (omzet) */
  totalSales: number;
  /** Total transaksi */
  totalTransactions: number;
  /** Total diskon (diestimasi dari items vs total) */
  totalDiscount: number;
  /** Total penjualan bersih */
  totalNetSales: number;
  /** Total laba kotor */
  totalProfit: number;
  /** Total tunai */
  cashTotal: number;
  /** Total QRIS */
  qrisTotal: number;
  /** Total bon/piutang dari penjualan */
  debtTotal: number;
  /** Total pembayaran piutang/bon */
  debtPaymentTotal: number;
  /** Total kas masuk */
  totalCashIn: number;
  /** Total piutang belum lunas */
  totalDebtRemaining: number;
  /** Total item terjual */
  totalItemsSold: number;
  /** Produk terlaris (top 5) */
  topProducts: { name: string; qty: number; revenue: number }[];
}

/**
 * Hitung ringkasan dari DailyReport + data transaksi.
 */
export function calculateReportSummary(
  report: DailyReport,
  storeName: string,
  filter: { date?: string; startDate?: string; endDate?: string },
  transactions: { items?: any[]; totalAmount: number; paidAmount?: number }[]
): ReportSummary {
  const isPeriod = !!filter.startDate && !!filter.endDate && !filter.date;
  const totalItemsSold = transactions.reduce(
    (sum, t: any) => sum + (t.itemsTotalQty || 0),
    0
  );

  // Estimasi diskon: dari report kita tidak punya data diskon langsung,
  // jadi gunakan selisih jika ada data transaksi
  const totalDiscount = 0; // tidak tersedia dari aggregasi saat ini

  // Penjualan bersih = omzet - diskon
  const totalNetSales = report.totalSales - totalDiscount;

  return {
    storeName,
    reportDate: filter.date ? formatDate(filter.date) : '',
    periodStart: filter.startDate ? formatDate(filter.startDate) : '',
    periodEnd: filter.endDate ? formatDate(filter.endDate) : '',
    isPeriod,
    totalSales: report.totalSales,
    totalTransactions: report.totalTransactions,
    totalDiscount,
    totalNetSales,
    totalProfit: report.totalProfit,
    cashTotal: report.cashTotal,
    qrisTotal: report.qrisTotal,
      debtTotal: report.debtTotal,
      debtPaymentTotal: report.debtPaymentTotal || 0,
      totalCashIn: report.totalCashIn ?? (report.cashTotal + report.qrisTotal + (report.debtPaymentTotal || 0)),
      totalDebtRemaining: report.totalDebt,
    totalItemsSold,
    topProducts: report.topProducts.slice(0, 5),
  };
}

/**
 * Hitung total qty item terjual dari array items.
 */
function calculateTotalItemsSold(transactions: any[]): number {
  let total = 0;
  for (const t of transactions) {
    if (Array.isArray(t.items)) {
      total += t.items.reduce((sum: number, i: any) => sum + (i.qty || 0), 0);
    }
  }
  return total;
}

// ─── Helper nama file ────────────────────────────────────

/**
 * Bangun nama file laporan dari filter. Diexport supaya bisa dipakai
 * di service layer untuk keperluan save/share.
 */
export function buildFileName(
  filter: { date?: string; startDate?: string; endDate?: string },
  extension: string
): string {
  if (filter.date) {
    const day = filter.date;
    return sanitizeFileName(`laporan-harian-${day}.${extension}`);
  }
  if (filter.startDate && filter.endDate) {
    const start = filter.startDate.slice(0, 10);
    const end = filter.endDate.slice(0, 10);
    return sanitizeFileName(`laporan-periode-${start}-sd-${end}.${extension}`);
  }
  const now = new Date().toISOString().slice(0, 10);
  return sanitizeFileName(`laporan-${now}.${extension}`);
}

// ─── Helper tanggal untuk display ────────────────────────

export function formatFilterPeriod(filter: { date?: string; startDate?: string; endDate?: string }): string {
  if (filter.date) return `Tanggal: ${formatDate(filter.date)}`;
  if (filter.startDate && filter.endDate) {
    return `Periode: ${formatDate(filter.startDate)} — ${formatDate(filter.endDate)}`;
  }
  return '';
}

// ─── HTML Builder ────────────────────────────────────────

/**
 * Bangun HTML laporan yang siap dicetak ke PDF.
 */
export function buildReportHtml(
  summary: ReportSummary,
  transactions: any[],
  filterPeriod: string
): string {
  const tglCetak = formatDateTime(new Date());
  const isEmpty = transactions.length === 0;

  const rows = isEmpty
    ? `<tr><td colspan="6" style="text-align:center;padding:32px;color:#888;">Tidak ada transaksi pada periode ini.</td></tr>`
    : transactions
        .map((t) => {
          const method = paymentMethodLabel(t.paymentMethod || 'cash');
          const status = statusLabel(t.status, t.paymentMethod);
          const total = t.totalAmount || 0;
          const customer = t.customerName || '-';
          const waktu = t.createdAt ? formatDateTime(t.createdAt) : '-';
          return `<tr>
            <td>${escapeHtml(t.invoiceNumber || '-')}</td>
            <td>${escapeHtml(waktu)}</td>
            <td>${escapeHtml(customer)}</td>
            <td>${escapeHtml(method)}</td>
            <td style="text-align:right">${formatRupiah(total)}</td>
            <td>${escapeHtml(status)}</td>
          </tr>`;
        })
        .join('\n');

  // Baris produk terlaris
  const topProductRows = summary.topProducts
    .map(
      (p, i) => `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${escapeHtml(p.name)}</td>
      <td style="text-align:center">${p.qty} pcs</td>
      <td style="text-align:right">${formatRupiah(p.revenue)}</td>
    </tr>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Laporan Penjualan</title>
<style>
  @page { margin: 16mm 12mm; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 10pt;
    color: #222;
    margin: 0;
    padding: 0;
    line-height: 1.5;
  }
  h1 {
    font-size: 16pt;
    margin: 0 0 4px 0;
    color: #8f000d;
  }
  .subtitle {
    font-size: 9pt;
    color: #666;
    margin-bottom: 8px;
  }
  .header {
    text-align: center;
    border-bottom: 2px solid #8f000d;
    padding-bottom: 10px;
    margin-bottom: 14px;
  }
  .summary-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
  }
  .summary-box {
    flex: 1;
    min-width: 120px;
    background: #f5f5f5;
    border-radius: 6px;
    padding: 8px 10px;
    text-align: center;
  }
  .summary-box .label {
    font-size: 7pt;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .summary-box .value {
    font-size: 12pt;
    font-weight: 700;
    color: #222;
    margin-top: 2px;
  }
  .summary-box .value.primary { color: #8f000d; }
  .summary-box .value.green { color: #2a6b2c; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-bottom: 14px;
  }
  th {
    background: #8f000d;
    color: #fff;
    padding: 6px 8px;
    text-align: left;
    font-weight: 600;
  }
  td {
    padding: 5px 8px;
    border-bottom: 1px solid #e0e0e0;
  }
  tr:nth-child(even) td {
    background: #fafafa;
  }
  .section-title {
    font-size: 11pt;
    font-weight: 700;
    color: #8f000d;
    margin: 14px 0 8px 0;
    padding-bottom: 4px;
    border-bottom: 1px solid #ddd;
  }
  .footer {
    text-align: center;
    font-size: 7.5pt;
    color: #999;
    margin-top: 20px;
    border-top: 1px solid #ddd;
    padding-top: 8px;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: 8pt;
    color: #666;
    margin-bottom: 10px;
  }
</style>
</head>
<body>

<div class="header">
  <h1>${escapeHtml(summary.storeName)}</h1>
  <div class="subtitle">LAPORAN PENJUALAN</div>
  <div class="subtitle">${escapeHtml(filterPeriod)}</div>
</div>

<div class="info-row">
  <span>Cetak: ${escapeHtml(tglCetak)}</span>
  <span>Total Transaksi: ${summary.totalTransactions}</span>
</div>

<!-- Ringkasan -->
<div class="summary-grid">
  <div class="summary-box">
    <div class="label">Total Penjualan</div>
    <div class="value primary">${formatRupiah(summary.totalSales)}</div>
  </div>
  <div class="summary-box">
    <div class="label">Tunai</div>
    <div class="value">${formatRupiah(summary.cashTotal)}</div>
  </div>
  <div class="summary-box">
    <div class="label">QRIS</div>
    <div class="value">${formatRupiah(summary.qrisTotal)}</div>
  </div>
  <div class="summary-box">
    <div class="label">Bon</div>
    <div class="value">${formatRupiah(summary.debtTotal)}</div>
  </div>
  <div class="summary-box">
    <div class="label">Pembayaran Piutang</div>
    <div class="value">${formatRupiah(summary.debtPaymentTotal)}</div>
  </div>
  <div class="summary-box">
    <div class="label">Total Kas Masuk</div>
    <div class="value green">${formatRupiah(summary.totalCashIn)}</div>
  </div>
  <div class="summary-box">
    <div class="label">Laba Kotor</div>
    <div class="value green">${formatRupiah(summary.totalProfit)}</div>
  </div>
  <div class="summary-box">
    <div class="label">Piutang Bon</div>
    <div class="value">${formatRupiah(summary.totalDebtRemaining)}</div>
  </div>
</div>

<!-- Tabel transaksi -->
<div class="section-title">Daftar Transaksi</div>
<table>
  <thead>
    <tr>
      <th>Invoice</th>
      <th>Tanggal</th>
      <th>Pelanggan</th>
      <th>Pembayaran</th>
      <th style="text-align:right">Total</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>

${topProductRows.length > 0 ? `
<!-- Produk terlaris -->
<div class="section-title">Produk Terlaris</div>
<table>
  <thead>
    <tr>
      <th style="text-align:center;width:40px">#</th>
      <th>Produk</th>
      <th style="text-align:center">Terjual</th>
      <th style="text-align:right">Pendapatan</th>
    </tr>
  </thead>
  <tbody>
    ${topProductRows}
  </tbody>
</table>
` : ''}

<div class="footer">
  Laporan ini digenerate otomatis oleh AdaKasir — ${escapeHtml(tglCetak)}
</div>

</body>
</html>`;
}

// ─── CSV Builder ──────────────────────────────────────────

/**
 * Bangun CSV laporan yang aman dibuka di Excel.
 */
export function buildReportCsv(
  summary: ReportSummary,
  transactions: any[],
  filterPeriod: string
): string {
  const lines: string[] = [];

  // Metadata
  lines.push(`Laporan Penjualan,${escapeCsv(summary.storeName)}`);
  lines.push(`${summary.isPeriod ? 'Periode' : 'Tanggal'},${escapeCsv(filterPeriod)}`);
  lines.push(`Cetak,${escapeCsv(formatDateTime(new Date()))}`);
  lines.push('');

  // Ringkasan
  lines.push('RINGKASAN');
  lines.push(`Total Penjualan,${summary.totalSales}`);
  lines.push(`Total Transaksi,${summary.totalTransactions}`);
  lines.push(`Penjualan Tunai,${summary.cashTotal}`);
  lines.push(`Penjualan QRIS,${summary.qrisTotal}`);
  lines.push(`Penjualan Bon,${summary.debtTotal}`);
  lines.push(`Pembayaran Piutang,${summary.debtPaymentTotal}`);
  lines.push(`Total Kas Masuk,${summary.totalCashIn}`);
  lines.push(`Laba Kotor,${summary.totalProfit}`);
  lines.push(`Piutang Bon,${summary.totalDebtRemaining}`);
  lines.push('');

  // Header transaksi
  const HEADERS = ['Invoice', 'Tanggal', 'Pelanggan', 'Pembayaran', 'Total', 'Status'];
  lines.push('TRANSAKSI');
  lines.push(HEADERS.map((h) => escapeCsv(h)).join(','));

  // Data transaksi
  if (transactions.length === 0) {
    lines.push('Tidak ada transaksi pada periode ini.');
  } else {
    for (const t of transactions) {
      const method = paymentMethodLabel(t.paymentMethod || 'cash');
      const status = statusLabel(t.status, t.paymentMethod);
      const total = t.totalAmount || 0;
      const customer = t.customerName || '-';
      const waktu = t.createdAt ? formatDateTime(t.createdAt) : '-';
      lines.push(
        [
          escapeCsv(t.invoiceNumber || '-'),
          escapeCsv(waktu),
          escapeCsv(customer),
          escapeCsv(method),
          escapeCsv(total),
          escapeCsv(status),
        ].join(',')
      );
    }
  }

  // Produk terlaris
  if (summary.topProducts.length > 0) {
    lines.push('');
    lines.push('PRODUK TERLARIS');
    lines.push(['No', 'Produk', 'Terjual', 'Pendapatan'].map((h) => escapeCsv(h)).join(','));
    summary.topProducts.forEach((p, i) => {
      lines.push(
        [
          escapeCsv(i + 1),
          escapeCsv(p.name),
          escapeCsv(`${p.qty} pcs`),
          escapeCsv(p.revenue),
        ].join(',')
      );
    });
  }

  return lines.join('\n');
}

// ─── PDF Generator ───────────────────────────────────────

/**
 * Generate file PDF laporan.
 *
 * @param html - HTML laporan dari buildReportHtml()
 * @param filter - Filter untuk nama file
 * @returns Path file PDF yang tersimpan
 * @throws Error jika gagal
 */
export async function generatePdf(
  html: string,
  filter: { date?: string; startDate?: string; endDate?: string }
): Promise<string> {
  try {
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Di Android expo-print simpan file. Kita rename dengan nama yang lebih jelas.
    const fileName = buildFileName(filter, 'pdf');
    const dir = FileSystem.cacheDirectory + 'reports/';

    // Pastikan direktori ada
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

    const dest = dir + fileName;
    await FileSystem.moveAsync({ from: uri, to: dest });

    return dest;
  } catch (error) {
    console.error('Gagal membuat file PDF:', error);
    throw new Error('Gagal membuat file PDF laporan.');
  }
}

// ─── CSV File Generator ──────────────────────────────────

/**
 * Generate file CSV laporan.
 *
 * @param csv - String CSV dari buildReportCsv()
 * @param filter - Filter untuk nama file
 * @returns Path file CSV yang tersimpan
 * @throws Error jika gagal
 */
export async function generateCsvFile(
  csv: string,
  filter: { date?: string; startDate?: string; endDate?: string }
): Promise<string> {
  try {
    const fileName = buildFileName(filter, 'csv');
    const dir = FileSystem.cacheDirectory + 'reports/';

    // Pastikan direktori ada
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

    const filePath = dir + fileName;
    await FileSystem.writeAsStringAsync(filePath, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return filePath;
  } catch (error) {
    console.error('Gagal membuat file CSV:', error);
    throw new Error('Gagal membuat file CSV laporan.');
  }
}

// ─── Share ───────────────────────────────────────────────

/**
 * Bagikan file menggunakan expo-sharing.
 *
 * @param filePath - Path file yang akan dibagikan
 * @returns true jika berhasil dibagikan, false jika tidak
 */
export async function shareFile(filePath: string): Promise<boolean> {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: filePath.endsWith('.pdf') ? 'application/pdf' : 'text/csv',
        dialogTitle: 'Bagikan Laporan',
      });
      return true;
    } else {
      console.log('Sharing tidak tersedia di perangkat ini. File tersimpan di:', filePath);
      return false;
    }
  } catch (error) {
    console.error('Gagal membagikan file:', error);
    // Jangan throw — share gagal bukan error fatal
    return false;
  }
}

// ─── Save to device ──────────────────────────────────────

/**
 * MIME type berdasarkan ekstensi file.
 */
function mimeTypeOf(filePath: string): string {
  return filePath.endsWith('.pdf') ? 'application/pdf' : 'text/csv';
}

/**
 * Simpan file laporan ke perangkat menggunakan StorageAccessFramework
 * (Android SAF). User akan memilih folder tujuan lewat system picker.
 *
 * Flow:
 *   1. Minta permission folder via `requestDirectoryPermissionsAsync`
 *   2. Jika user cancel → return `{ cancelled: true }`
 *   3. Buat file baru di folder pilihan user via `createFileAsync`
 *   4. Baca konten file sumber (cache) dan tulis ke file baru
 *   5. Hapus file sumber dari cache
 *
 * Fallback jika SAF tidak tersedia (iOS / error):
 *   - Copy file ke `documentDirectory/reports/` dan return path-nya.
 *
 * @param sourcePath - Path file sumber (dari cache)
 * @param fileName   - Nama file tujuan (contoh: "laporan-harian-2026-07-02.pdf")
 * @returns `{ uri: string }` jika berhasil, atau `{ cancelled: true }` jika user batal
 * @throws Error jika gagal total
 */
export async function saveFileToDevice(
  sourcePath: string,
  fileName: string
): Promise<{ uri: string } | { cancelled: true }> {
  const mimeType = mimeTypeOf(sourcePath);

  // Android SAF — minta user pilih folder
  if (Platform.OS === 'android') {
    try {
      const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permission.granted) {
        return { cancelled: true };
      }

      const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permission.directoryUri,
        fileName.replace(/\.\w+$/, ''), // hapus ekstensi — createFileAsync akan nambahin
        mimeType
      );

      // Baca konten file sumber sebagai base64
      const contentBase64 = await FileSystem.readAsStringAsync(sourcePath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Tulis ke SAF URI
      await FileSystem.StorageAccessFramework.writeAsStringAsync(safUri, contentBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return { uri: safUri };
    } catch (error: any) {
      // User cancel atau SAF error — fallback
      if (error?.message?.includes('user')) {
        return { cancelled: true };
      }
      console.error('SAF save error, falling back:', error);
    }
  }

  // Fallback: simpan ke documentDirectory/reports/
  const dir = FileSystem.documentDirectory + 'reports/';
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = dir + fileName;
  await FileSystem.copyAsync({ from: sourcePath, to: dest });

  return { uri: dest };
}

// ─── Data transaksi lengkap ──────────────────────────────

/**
 * Load data transaksi lengkap dengan items untuk keperluan export.
 * Berbeda dengan getTransactionsByRange yang hanya header, fungsi ini
 * juga mengambil item details sehingga total qty bisa dihitung.
 */
export async function loadTransactionsWithItems(
  startDate: string,
  endDate: string,
  limit: number = 200
): Promise<any[]> {
  const db = (await import('../database/db')).getDatabase;
  const database = await db();
  const transactions = await database.getAllAsync<any>(
    `SELECT s.id, s.invoice_number as invoiceNumber, s.customer_id as customerId,
            s.total_amount as totalAmount, s.paid_amount as paidAmount,
            s.change_amount as changeAmount, s.payment_method as paymentMethod,
            s.status, s.created_at as createdAt,
            c.name as customerName
     FROM sales s
     LEFT JOIN customers c ON s.customer_id = c.id
     WHERE s.created_at >= ? AND s.created_at <= ? AND s.status != 'cancelled'
     ORDER BY s.created_at DESC LIMIT ?`,
    [startDate, endDate, limit]
  );

  const saleIds = transactions.map((t) => t.id);
  if (saleIds.length === 0) return transactions;

  const placeholders = saleIds.map(() => '?').join(',');
  const items = await database.getAllAsync<any>(
    `SELECT id, sale_id as saleId, product_name as productName, qty, price, cost_price as costPrice, subtotal
     FROM sale_items WHERE sale_id IN (${placeholders})`,
    saleIds
  );

  const itemsBySaleId = new Map<string, any[]>();
  for (const item of items) {
    const correctedSubtotal = (item.qty || 0) * (item.price || 0);
    const normalizedItem = {
      ...item,
      subtotal: item.subtotal === correctedSubtotal ? item.subtotal : correctedSubtotal,
    };
    const saleItems = itemsBySaleId.get(item.saleId) || [];
    saleItems.push(normalizedItem);
    itemsBySaleId.set(item.saleId, saleItems);
  }

  for (const t of transactions) {
    const saleItems = itemsBySaleId.get(t.id) || [];
    t.items = saleItems;
    t.itemsTotalQty = saleItems.reduce((sum: number, i: any) => sum + (i.qty || 0), 0);
    t.itemsTotalProfit = saleItems.reduce((sum: number, i: any) => sum + ((i.price || 0) - (i.costPrice || 0)) * (i.qty || 0), 0);
  }

  return transactions;
}

async function getDebtPaymentTotalByRange(startDate: string, endDate: string): Promise<number> {
  const db = (await import('../database/db')).getDatabase;
  const database = await db();
  const result = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM debt_payments WHERE paid_at >= ? AND paid_at <= ?`,
    [startDate, endDate]
  );
  return result?.total || 0;
}

/**
 * Dapatkan ringkasan harian dari ReportRepository + tambahan items count.
 */
export async function getFullDailyReport(
  filter: ReportFilter,
  storeName: string
): Promise<{
  report: DailyReport;
  summary: ReportSummary;
  transactions: any[];
}> {
  const { date, startDate, endDate } = filter;

  let transactions: any[];
  let report: DailyReport;

  if (date) {
    report = await ReportRepository.getDailyReport(date);
    const { startDate: sd, endDate: ed } = getDayRange(date);
    transactions = await loadTransactionsWithItems(sd, ed);
  } else if (startDate && endDate) {
    // Untuk periode, kita ambil data transaksi lengkap dan kalkulasi manual
    // karena DailyReport hanya per hari
    transactions = await loadTransactionsWithItems(startDate, endDate);

    // Re-kalkulasi dari transaksi
    const totalSales = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const totalTransactions = transactions.length;
    const cashTotal = transactions
      .filter((t) => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const qrisTotal = transactions
      .filter((t) => t.paymentMethod === 'qris_static')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const debtTotal = transactions
      .filter((t) => t.paymentMethod === 'debt')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    // Hitung laba dari items (cost_price sudah tersedia sekarang)
    const totalProfit = transactions.reduce(
      (sum, t) => sum + (t.itemsTotalProfit || 0),
      0
    );

    const debtPaymentTotal = await getDebtPaymentTotalByRange(startDate, endDate);

    // Top products
    const topProducts = await ReportRepository.getTopProductsByRange(startDate, endDate, 5);
    const totalDebtResult = await ReportRepository.getDailyReport();

    // Buat DailyReport dari kalkulasi periode
    const periodReport: DailyReport = {
      totalSales,
      totalTransactions,
      totalProfit,
      totalDebt: totalDebtResult.totalDebt,
      cashTotal,
      qrisTotal,
      debtTotal,
      debtPaymentTotal,
      totalCashIn: cashTotal + qrisTotal + debtPaymentTotal,
      totalProducts: 0,
      totalActiveProducts: 0,
      totalStockLow: 0,
      totalStockOut: 0,
      totalStockValue: 0,
      topProducts,
      hourlySales: [],
    };

    report = periodReport;
  } else {
    report = await ReportRepository.getDailyReport();
    const now = new Date();
    const sd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const ed = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    transactions = await loadTransactionsWithItems(sd, ed);
  }

  const summary = calculateReportSummary(report, storeName, filter, transactions);
  return { report, summary, transactions };
}

function getDayRange(date: string): { startDate: string; endDate: string } {
  const parts = date.split('-').map(Number);
  const year = parts[0];
  const month = parts[1] - 1;
  const day = parts[2];
  return {
    startDate: new Date(year, month, day, 0, 0, 0).toISOString(),
    endDate: new Date(year, month, day, 23, 59, 59).toISOString(),
  };
}
