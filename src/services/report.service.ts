import { ReportRepository } from '../database/report.repo';
import { DailyReport, ReportFilter } from '../types/report';
import { StoreRepository } from '../database/store.repo';
import {
  buildReportHtml,
  buildReportCsv,
  generatePdf,
  generateCsvFile,
  shareFile,
  saveFileToDevice,
  buildFileName,
  getFullDailyReport,
  formatFilterPeriod,
} from '../utils/report-export';

export const ReportService = {
  async getDailyReport(date: string): Promise<DailyReport> {
    return await ReportRepository.getDailyReport(date);
  },

  /**
   * Export laporan ke file CSV.
   *
   * ⚠️ Karena pustaka .xlsx murni tidak kompatibel dengan React Native,
   * export menggunakan format **CSV** yang bisa dibuka di Excel.
   *
   * @param filter - Filter laporan
   * @returns Path file CSV yang tersimpan di cache, atau null jika gagal
   */
  async generateExcelReport(filter: ReportFilter): Promise<string | null> {
    try {
      if (filter.startDate && filter.endDate && filter.startDate > filter.endDate) {
        throw new Error('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
      }

      const store = await StoreRepository.getActiveStore();
      const storeName = store?.name || 'AdaKasir';

      const { summary, transactions } = await getFullDailyReport(filter, storeName);

      if (transactions.length === 0 && summary.totalSales === 0) {
        throw new Error('Tidak ada transaksi pada periode ini.');
      }

      const filterPeriod = formatFilterPeriod(filter);
      const csv = buildReportCsv(summary, transactions, filterPeriod);
      const filePath = await generateCsvFile(csv, filter);

      return filePath;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Export laporan ke file PDF.
   *
   * @param filter - Filter laporan
   * @returns Path file PDF yang tersimpan di cache, atau null jika gagal
   */
  async generatePDFReport(filter: ReportFilter): Promise<string | null> {
    try {
      if (filter.startDate && filter.endDate && filter.startDate > filter.endDate) {
        throw new Error('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
      }

      const store = await StoreRepository.getActiveStore();
      const storeName = store?.name || 'AdaKasir';

      const { summary, transactions } = await getFullDailyReport(filter, storeName);

      if (transactions.length === 0 && summary.totalSales === 0) {
        throw new Error('Tidak ada transaksi pada periode ini.');
      }

      const filterPeriod = formatFilterPeriod(filter);
      const html = buildReportHtml(summary, transactions, filterPeriod);
      const filePath = await generatePdf(html, filter);

      return filePath;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Bagikan file laporan via Android share sheet.
   *
   * @param filePath - Path file yang akan dibagikan
   * @returns true jika berhasil dibagikan
   */
  async shareReportFile(filePath: string): Promise<boolean> {
    return shareFile(filePath);
  },

  /**
   * Simpan file laporan ke perangkat (SAF / document directory).
   *
   * @param filePath - Path file sumber (dari cache)
   * @param filter   - Filter untuk mendapatkan nama file yang benar
   * @returns Hasil operasi
   */
  async saveReportFile(
    filePath: string,
    filter: ReportFilter
  ): Promise<{ uri?: string; cancelled?: boolean }> {
    const ext = filePath.endsWith('.pdf') ? 'pdf' : 'csv';
    const fileName = buildFileName(filter, ext);
    return saveFileToDevice(filePath, fileName);
  },
};

// Re-export helper untuk kemudahan akses dari UI
export { formatFilterPeriod } from '../utils/report-export';
export type { ReportSummary } from '../utils/report-export';
