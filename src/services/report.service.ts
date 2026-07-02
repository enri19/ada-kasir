import { ReportRepository } from '../database/report.repo';
import { DailyReport, ReportFilter } from '../types/report';
import { StoreRepository } from '../database/store.repo';
import {
  buildReportHtml,
  buildReportCsv,
  generatePdf,
  generateCsvFile,
  shareFile,
  getFullDailyReport,
  formatFilterPeriod,
} from '../utils/report-export';

export const ReportService = {
  async getDailyReport(date: string): Promise<DailyReport> {
    return await ReportRepository.getDailyReport(date);
  },

  /**
   * Export laporan ke file Excel/CSV.
   *
   * ⚠️ Karena pustaka .xlsx murni tidak kompatibel dengan React Native
   * tanpa native module, export menggunakan format **CSV** yang:
   *   - Bisa dibuka di Microsoft Excel, Google Sheets, LibreOffice Calc
   *   - Ringan (text-based)
   *   - Kompatibel dengan Expo managed (tidak perlu prebuild)
   *   - Bisa langsung dishare via expo-sharing
   *
   * @param filter - Filter laporan (date atau startDate/endDate)
   * @returns Path file CSV, atau null jika gagal
   */
  async generateExcelReport(filter: ReportFilter): Promise<string | null> {
    try {
      // Validasi tanggal
      if (filter.startDate && filter.endDate && filter.startDate > filter.endDate) {
        throw new Error('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
      }

      // Ambil data toko
      const store = await StoreRepository.getActiveStore();
      const storeName = store?.name || 'AdaKasir';

      // Ambil data laporan lengkap
      const { summary, transactions } = await getFullDailyReport(filter, storeName);

      // Cek apakah ada data
      if (transactions.length === 0 && summary.totalSales === 0) {
        throw new Error('Tidak ada transaksi pada periode ini.');
      }

      // Bangun CSV
      const filterPeriod = formatFilterPeriod(filter);
      const csv = buildReportCsv(summary, transactions, filterPeriod);

      // Simpan ke file
      const filePath = await generateCsvFile(csv, filter);

      return filePath;
    } catch (error: any) {
      console.error('Report service: generateExcelReport error', error);
      throw error; // Biarkan caller handle
    }
  },

  /**
   * Export laporan ke file PDF.
   *
   * Menggunakan expo-print untuk mengenerate PDF dari HTML.
   * HTML dibuat dengan template yang rapi dan aman dari XSS via escapeHtml.
   *
   * @param filter - Filter laporan (date atau startDate/endDate)
   * @returns Path file PDF, atau null jika gagal
   */
  async generatePDFReport(filter: ReportFilter): Promise<string | null> {
    try {
      // Validasi tanggal
      if (filter.startDate && filter.endDate && filter.startDate > filter.endDate) {
        throw new Error('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
      }

      // Ambil data toko
      const store = await StoreRepository.getActiveStore();
      const storeName = store?.name || 'AdaKasir';

      // Ambil data laporan lengkap
      const { summary, transactions } = await getFullDailyReport(filter, storeName);

      // Cek apakah ada data
      if (transactions.length === 0 && summary.totalSales === 0) {
        throw new Error('Tidak ada transaksi pada periode ini.');
      }

      // Bangun HTML
      const filterPeriod = formatFilterPeriod(filter);
      const html = buildReportHtml(summary, transactions, filterPeriod);

      // Generate PDF
      const filePath = await generatePdf(html, filter);

      return filePath;
    } catch (error: any) {
      console.error('Report service: generatePDFReport error', error);
      throw error;
    }
  },

  /**
   * Export laporan ke PDF dan langsung bagikan.
   * Menggabungkan generate + share dalam satu langkah.
   *
   * @param filter - Filter laporan
   * @returns true jika berhasil dibagikan, false jika hanya tersimpan
   */
  async exportAndSharePDF(filter: ReportFilter): Promise<{ success: boolean; message: string }> {
    try {
      const filePath = await this.generatePDFReport(filter);
      if (!filePath) {
        return { success: false, message: 'Gagal membuat file PDF laporan.' };
      }

      const shared = await shareFile(filePath);
      if (shared) {
        return { success: true, message: 'Laporan PDF berhasil dibagikan.' };
      }
      return { success: true, message: `File PDF tersimpan. Gunakan file manager untuk membuka: ${filePath}` };
    } catch (error: any) {
      const msg = error?.message || 'Gagal membuat file PDF laporan.';
      return { success: false, message: msg };
    }
  },

  /**
   * Export laporan ke CSV dan langsung bagikan.
   *
   * @param filter - Filter laporan
   * @returns true jika berhasil dibagikan, false jika hanya tersimpan
   */
  async exportAndShareCSV(filter: ReportFilter): Promise<{ success: boolean; message: string }> {
    try {
      const filePath = await this.generateExcelReport(filter);
      if (!filePath) {
        return { success: false, message: 'Gagal membuat file CSV laporan.' };
      }

      const shared = await shareFile(filePath);
      if (shared) {
        return { success: true, message: 'Laporan CSV berhasil dibagikan.' };
      }
      return { success: true, message: `File CSV tersimpan. Gunakan file manager untuk membuka: ${filePath}` };
    } catch (error: any) {
      const msg = error?.message || 'Gagal membuat file CSV laporan.';
      return { success: false, message: msg };
    }
  },
};

// Re-export helper untuk kemudahan akses dari UI
export { formatFilterPeriod } from '../utils/report-export';
export type { ReportSummary } from '../utils/report-export';
