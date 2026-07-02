/**
 * PrinterService — Layanan cetak struk thermal via Bluetooth.
 *
 * ── Status Beta ───────────────────────────────────────────
 * Fitur printer native Bluetooth belum aktif pada versi beta ini.
 * Semua fungsi tersedia dan typed, namun berjalan dalam mode preview/fallback.
 * Native Bluetooth akan diaktifkan pada versi berikutnya menggunakan
 * development build (bukan Expo Go).
 * ────────────────────────────────────────────────────────────
 */
import { Platform } from 'react-native';
import {
  PrinterDevice,
  PrintResult,
  PrinterConnectionStatus,
  PrinterConfig,
  PrinterSettings,
  PrinterStatus,
} from '../types/printer';
import { PrinterConfigService } from './printer-config.service';
import { buildReceiptData, buildReceiptText, buildTestPrintText } from '../utils/receipt';
import { formatTestReceipt, formatReceiptForPrinter } from '../utils/receipt-printer-format';

const BETA_MESSAGE = 'Printer Bluetooth membutuhkan development build dan akan tersedia pada versi berikutnya.';

let connectionStatus: PrinterConnectionStatus = 'disconnected';

export const PrinterService = {
  isPrinterNativeAvailable(): boolean {
    return false;
  },

  async getPrinterSettings(): Promise<PrinterSettings> {
    const config = await PrinterConfigService.load();
    return {
      paperSize: config.printerSize,
      autoPrintAfterSale: config.autoReconnect,
      lastPrinterName: config.printerName || null,
      lastPrinterAddress: config.printerAddress || null,
    };
  },

  async savePrinterSettings(settings: PrinterSettings): Promise<void> {
    const config = await PrinterConfigService.load();
    await PrinterConfigService.save({
      ...config,
      printerSize: settings.paperSize,
      characterWidth: settings.paperSize === '58mm' ? 32 : 48,
      autoReconnect: settings.autoPrintAfterSale,
      printerName: settings.lastPrinterName ?? config.printerName,
      printerAddress: settings.lastPrinterAddress ?? config.printerAddress,
    });
  },

  async scanPrinters(): Promise<PrinterDevice[]> {
    throw new Error(BETA_MESSAGE);
  },

  async connectPrinter(_printerId: string): Promise<boolean> {
    throw new Error(BETA_MESSAGE);
  },

  async disconnectPrinter(): Promise<boolean> {
    connectionStatus = 'disconnected';
    return true;
  },

  async getPrinterStatus(): Promise<PrinterStatus> {
    const config = await PrinterConfigService.load();
    return {
      available: false,
      connected: false,
      message: BETA_MESSAGE,
      device: config.printerName
        ? {
            name: config.printerName,
            address: config.printerAddress,
            connectionType: config.connectionType,
            isPaired: false,
          }
        : null,
    };
  },

  async printTest(): Promise<string> {
    const config = await PrinterConfigService.load();
    const preview = formatTestReceipt({ paperSize: config.printerSize });
    return `── Preview Test Print ──\n${preview}\n── Akhir Preview ──\n\n${BETA_MESSAGE}`;
  },

  async printReceipt(receiptText: string): Promise<PrintResult> {
    if (!receiptText || receiptText.trim().length === 0) {
      return { success: false, message: 'Data struk tidak valid.' };
    }
    return { success: false, message: BETA_MESSAGE };
  },

  async printReceiptFromData(params: {
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
  }): Promise<PrintResult> {
    if (!params.invoiceNumber) return { success: false, message: 'Nomor invoice tidak ditemukan.' };
    if (!params.items || params.items.length === 0) return { success: false, message: 'Tidak ada item dalam transaksi.' };
    return { success: false, message: BETA_MESSAGE };
  },

  async printReceiptPreview(receiptData: any): Promise<string> {
    if (!receiptData || !receiptData.invoiceNumber) {
      throw new Error('Data transaksi tidak valid untuk dicetak.');
    }
    const config = await PrinterConfigService.load();
    const date = receiptData.createdAt ? new Date(receiptData.createdAt) : new Date();
    const preview = formatReceiptForPrinter(
      {
        storeName: receiptData.storeName,
        storeAddress: receiptData.storeAddress,
        storePhone: receiptData.storePhone,
        invoiceNumber: receiptData.invoiceNumber,
        date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        cashierName: receiptData.cashierName,
        customerName: receiptData.customerName,
        items: (receiptData.items || []).map((i: any) => ({
          name: i.productName || i.name,
          quantity: i.qty || i.quantity || 0,
          price: i.price,
          subtotal: i.subtotal,
        })),
        subtotal: receiptData.subtotal,
        discount: receiptData.discount,
        total: receiptData.total,
        paymentMethod: receiptData.paymentMethod || 'cash',
        paidAmount: receiptData.paidAmount,
        changeAmount: receiptData.changeAmount,
        note: receiptData.receiptNote,
      },
      { paperSize: config.printerSize }
    );
    return `── Preview Struk ──\n${preview}\n── Akhir Preview ──\n\n${BETA_MESSAGE}`;
  },

  async getConnectionStatus(): Promise<PrinterConnectionStatus> {
    return connectionStatus;
  },

  async getConfig(): Promise<PrinterConfig> {
    return PrinterConfigService.load();
  },

  async saveConfig(config: PrinterConfig): Promise<void> {
    await PrinterConfigService.save(config);
  },

  async setActivePrinter(name: string, address: string): Promise<void> {
    await PrinterConfigService.setLastPrinter(name, address);
  },
};

export { buildReceiptData, buildReceiptText, buildTestPrintText } from '../utils/receipt';
