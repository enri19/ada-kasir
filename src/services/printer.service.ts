/**
 * PrinterService — Layanan cetak struk thermal via Bluetooth.
 *
 * ── Arsitektur ────────────────────────────────────────────
 * Service ini memiliki dua mode:
 *   1. **Mock mode** — berjalan di Expo Go / development.
 *      Semua output lewat console.log, tidak ada hardware nyata.
 *   2. **Native mode** — berjalan di development build / APK.
 *      Menggunakan library `react-native-bluetooth-escpos-printer`
 *      untuk ESC/POS communication via Bluetooth.
 *
 * Service auto-switch: jika native module tersedia, native dipakai;
 * jika tidak (Expo Go), mock mode sebagai fallback.
 *
 * ── Catatan Penting ───────────────────────────────────────
 * ⚠️ FITUR INI TIDAK BERJALAN DI EXPO GO.
 *    Untuk mencetak struk nyata, butuh development build atau
 *    APK langsung via `npx expo prebuild` / `npx expo run:android`.
 *
 * ⚠️ Library native yang dibutuhkan:
 *    ```
 *    npx expo install react-native-bluetooth-escpos-printer
 *    ```
 *    atau
 *    ```
 *    npm install react-native-bluetooth-escpos-printer
 *    npx expo prebuild
 *    npx expo run:android
 *    ```
 *
 * ── Penggunaan ────────────────────────────────────────────
 *   import { PrinterService } from '../services/printer.service';
 *
 *   // Scan printer
 *   const printers = await PrinterService.getAvailablePrinters();
 *
 *   // Connect
 *   await PrinterService.connectPrinter(deviceAddress);
 *
 *   // Cetak struk
 *   await PrinterService.printReceipt(receiptText);
 *
 *   // Test print
 *   await PrinterService.testPrint();
 * ────────────────────────────────────────────────────────────
 */
import { Platform } from 'react-native';
import {
  PrinterDevice,
  PrintResult,
  PrinterConnectionStatus,
  PrinterConfig,
  PrinterSize,
  PrinterSettings,
  PrinterPaperSize,
  PrinterStatus,
} from '../types/printer';
import { PrinterConfigService } from './printer-config.service';
import { buildReceiptData, buildReceiptText, buildTestPrintText } from '../utils/receipt';
import { formatTestReceipt } from '../utils/receipt-printer-format';

// ─── Type untuk native module ─────────────────────────────
// Definisi type yang diharapkan dari react-native-bluetooth-escpos-printer
interface NativeBluetoothPrinter {
  BluetoothManager: {
    scan: () => Promise<any>;
    connect: (address: string) => Promise<any>;
    disconnect: () => Promise<any>;
    isConnected: () => Promise<boolean>;
  };
  BluetoothEscposPrinter: {
    printerPage: (options: { width: number }) => Promise<any>;
    printText: (text: string, options: {}) => Promise<any>;
    printColumn: (columns: { width: number; align: number; text: string }[]) => Promise<any>;
    printBarCode: (text: string, options: {}) => Promise<any>;
  };
}

// ─── Status koneksi ──────────────────────────────────────
let connectionStatus: PrinterConnectionStatus = 'disconnected';
let connectedDevice: PrinterDevice | null = null;

// ─── Helper pesan error bahasa Indonesia ─────────────────
const ERROR_MESSAGES = {
  BLUETOOTH_OFF: 'Bluetooth tidak aktif. Silakan aktifkan Bluetooth di pengaturan perangkat.',
  BLUETOOTH_PERMISSION: 'Izin Bluetooth belum diberikan. Berikan izin di pengaturan aplikasi.',
  NO_PRINTER_FOUND: 'Tidak ada printer Bluetooth yang ditemukan.',
  CONNECTION_FAILED: 'Gagal menghubungkan ke printer. Periksa koneksi Bluetooth.',
  PRINTER_DISCONNECTED: 'Printer terputus. Periksa koneksi Bluetooth printer.',
  PRINTER_NOT_CONNECTED: 'Printer belum terhubung. Silakan pilih dan hubungkan printer terlebih dahulu.',
  PRINT_FAILED: 'Struk gagal dicetak. Periksa koneksi printer.',
  TEST_PRINT_FAILED: 'Test print gagal. Periksa koneksi printer.',
  INVALID_TRANSACTION: 'Data transaksi tidak valid.',
  EMPTY_ITEMS: 'Tidak ada item dalam transaksi.',
  NO_INVOICE: 'Nomor invoice tidak ditemukan.',
  PLATFORM_UNSUPPORTED: 'Fitur printer hanya tersedia di Android.',
  NATIVE_MODULE_MISSING:
    'Modul printer Bluetooth tidak tersedia. Gunakan development build, bukan Expo Go.',
};

// ─── Deteksi native module ───────────────────────────────
let nativeModule: NativeBluetoothPrinter | null = null;

function isNativeModuleAvailable(): boolean {
  if (nativeModule) return true;
  try {
    // Dynamic require — hanya akan throw jika module tidak terinstall
    const module = require('react-native-bluetooth-escpos-printer') as NativeBluetoothPrinter;
    if (module && module.BluetoothManager) {
      nativeModule = module;
      return true;
    }
  } catch {
    // Module tidak tersedia — pakai mock mode
  }
  return false;
}

// Cek apakah platform didukung
function isPlatformSupported(): boolean {
  return Platform.OS === 'android';
}

// ─── Mock implementation (Expo Go fallback) ──────────────
const MockPrinter = {
  async scan(): Promise<PrinterDevice[]> {
    console.log('[Printer Mock] Scan Bluetooth devices...');
    // Simulasi scan
    await new Promise((r) => setTimeout(r, 1500));

    // Kembalikan data dummy untuk development
    return [
      {
        name: 'Mock Printer 58mm',
        address: '00:11:22:33:44:55',
        connectionType: 'bluetooth',
        isPaired: true,
      },
      {
        name: 'Mock Printer 80mm',
        address: 'AA:BB:CC:DD:EE:FF',
        connectionType: 'bluetooth',
        isPaired: false,
      },
    ];
  },

  async connect(address: string): Promise<boolean> {
    console.log(`[Printer Mock] Connect to ${address}...`);
    await new Promise((r) => setTimeout(r, 1000));
    connectionStatus = 'connected';
    connectedDevice = { name: 'Mock Printer', address, connectionType: 'bluetooth' };
    console.log('[Printer Mock] Connected successfully');
    return true;
  },

  async disconnect(): Promise<boolean> {
    console.log('[Printer Mock] Disconnect...');
    await new Promise((r) => setTimeout(r, 500));
    connectionStatus = 'disconnected';
    connectedDevice = null;
    console.log('[Printer Mock] Disconnected');
    return true;
  },

  async isConnected(): Promise<boolean> {
    return connectionStatus === 'connected';
  },

  async printText(text: string): Promise<boolean> {
    console.log('[Printer Mock] Print text:');
    console.log(text);
    await new Promise((r) => setTimeout(r, 500));
    console.log('[Printer Mock] Print complete');
    return true;
  },

  async testPrint(): Promise<boolean> {
    const testText = buildTestPrintText('58mm');
    return this.printText(testText);
  },
};

// ─── Native implementation ────────────────────────────────
const NativePrinter = {
  async scan(): Promise<PrinterDevice[]> {
    if (!nativeModule) throw new Error(ERROR_MESSAGES.NATIVE_MODULE_MISSING);
    console.log('[Printer Native] Scanning for Bluetooth devices...');

    try {
      const result = await nativeModule.BluetoothManager.scan();
      // Response: array of {name, address, isPaired}
      const devices: PrinterDevice[] = (result || []).map((d: any) => ({
        name: d.name || 'Unknown Printer',
        address: d.address || '',
        connectionType: 'bluetooth' as const,
        isPaired: d.isPaired || false,
      }));
      return devices;
    } catch (error: any) {
      if (error?.message?.includes('bluetooth is not enabled') || error?.code === 1) {
        throw new Error(ERROR_MESSAGES.BLUETOOTH_OFF);
      }
      if (error?.message?.includes('permission') || error?.code === 2) {
        throw new Error(ERROR_MESSAGES.BLUETOOTH_PERMISSION);
      }
      throw new Error(ERROR_MESSAGES.NO_PRINTER_FOUND);
    }
  },

  async connect(address: string): Promise<boolean> {
    if (!nativeModule) throw new Error(ERROR_MESSAGES.NATIVE_MODULE_MISSING);

    try {
      connectionStatus = 'connecting';
      await nativeModule.BluetoothManager.connect(address);
      connectionStatus = 'connected';
      connectedDevice = { name: '', address, connectionType: 'bluetooth' };
      return true;
    } catch (error) {
      connectionStatus = 'error';
      throw new Error(ERROR_MESSAGES.CONNECTION_FAILED);
    }
  },

  async disconnect(): Promise<boolean> {
    if (!nativeModule) return true;
    try {
      await nativeModule.BluetoothManager.disconnect();
    } catch {
      // ignore disconnect errors
    } finally {
      connectionStatus = 'disconnected';
      connectedDevice = null;
    }
    return true;
  },

  async isConnected(): Promise<boolean> {
    if (!nativeModule) return false;
    try {
      return await nativeModule.BluetoothManager.isConnected();
    } catch {
      return false;
    }
  },

  async printText(text: string, characterWidth: number = 32): Promise<boolean> {
    if (!nativeModule) throw new Error(ERROR_MESSAGES.NATIVE_MODULE_MISSING);

    try {
      // Set ukuran halaman sesuai lebar karakter
      await nativeModule.BluetoothEscposPrinter.printerPage({ width: characterWidth });

      // Kirim teks ke printer
      await nativeModule.BluetoothEscposPrinter.printText(text, {
        encoding: 'UTF-8',
        codepage: 0,
        widthtimes: 0,
        heigthtimes: 0,
        fonttype: 1,
      });

      // Feed dan potong kertas
      await nativeModule.BluetoothEscposPrinter.printText('\n\n\n\n\n', {});
      return true;
    } catch (error) {
      if (connectionStatus === 'disconnected') {
        throw new Error(ERROR_MESSAGES.PRINTER_DISCONNECTED);
      }
      throw new Error(ERROR_MESSAGES.PRINT_FAILED);
    }
  },

  async testPrint(): Promise<boolean> {
    const config = await PrinterConfigService.load();
    const testText = buildTestPrintText(config.printerSize);
    return this.printText(testText, config.characterWidth);
  },
};

// ─── Public API ──────────────────────────────────────────

export const PrinterService = {
  /**
   * Pindai printer Bluetooth yang tersedia di sekitar.
   * @returns Daftar perangkat printer yang ditemukan
   * @throws Error dengan pesan bahasa Indonesia jika gagal
   */
  async getAvailablePrinters(): Promise<PrinterDevice[]> {
    if (!isPlatformSupported()) {
      throw new Error(ERROR_MESSAGES.PLATFORM_UNSUPPORTED);
    }

    if (isNativeModuleAvailable()) {
      return NativePrinter.scan();
    }

    // Mock mode — berikan dummy untuk development
    console.warn('[PrinterService] Native module tidak tersedia. Gunakan mock mode.');
    return MockPrinter.scan();
  },

  /**
   * Hubungkan ke printer Bluetooth berdasarkan alamat MAC.
   * @param printerId Alamat MAC printer (contoh: "00:11:22:33:44:55")
   * @returns true jika berhasil terhubung
   * @throws Error dengan pesan bahasa Indonesia jika gagal
   */
  async connectPrinter(printerId: string): Promise<boolean> {
    if (!printerId || printerId.trim().length === 0) {
      throw new Error('Alamat printer tidak valid.');
    }

    if (!isPlatformSupported()) {
      throw new Error(ERROR_MESSAGES.PLATFORM_UNSUPPORTED);
    }

    if (isNativeModuleAvailable()) {
      return NativePrinter.connect(printerId);
    }

    return MockPrinter.connect(printerId);
  },

  /**
   * Putuskan koneksi dari printer saat ini.
   * @returns true jika berhasil terputus
   */
  async disconnectPrinter(): Promise<boolean> {
    if (isNativeModuleAvailable()) {
      return NativePrinter.disconnect();
    }
    return MockPrinter.disconnect();
  },

  /**
   * Cek status koneksi printer saat ini.
   * @returns Status koneksi: 'connected', 'disconnected', 'connecting', 'error'
   */
  async getConnectionStatus(): Promise<PrinterConnectionStatus> {
    // Jika status lokal disconnected, langsung return
    if (connectionStatus === 'disconnected') return 'disconnected';

    if (isNativeModuleAvailable()) {
      const connected = await NativePrinter.isConnected();
      connectionStatus = connected ? 'connected' : 'disconnected';
      return connectionStatus;
    }

    return connectionStatus;
  },

  /**
   * Cetak struk transaksi.
   *
   * @param receiptText - Teks struk yang sudah diformat (dari receipt.ts)
   * @returns PrintResult — {success, message}
   */
  async printReceipt(receiptText: string): Promise<PrintResult> {
    try {
      if (!receiptText || receiptText.trim().length === 0) {
        return { success: false, message: ERROR_MESSAGES.INVALID_TRANSACTION };
      }

      // Cek koneksi dulu
      const status = await this.getConnectionStatus();
      if (status !== 'connected') {
        return { success: false, message: ERROR_MESSAGES.PRINTER_NOT_CONNECTED };
      }

      const config = await PrinterConfigService.load();

      if (isNativeModuleAvailable()) {
        await NativePrinter.printText(receiptText, config.characterWidth);
      } else {
        await MockPrinter.printText(receiptText);
      }

      return { success: true, message: 'Struk berhasil dicetak.' };
    } catch (error: any) {
      const message = error?.message || ERROR_MESSAGES.PRINT_FAILED;
      return { success: false, message };
    }
  },

  /**
   * Cetak halaman uji coba untuk memastikan printer berfungsi.
   * @returns PrintResult — {success, message}
   */
  async testPrint(): Promise<PrintResult> {
    try {
      const status = await this.getConnectionStatus();
      if (status !== 'connected') {
        return { success: false, message: ERROR_MESSAGES.PRINTER_NOT_CONNECTED };
      }

      if (isNativeModuleAvailable()) {
        await NativePrinter.testPrint();
      } else {
        await MockPrinter.testPrint();
      }

      return { success: true, message: 'Test print berhasil.' };
    } catch (error: any) {
      const message = error?.message || ERROR_MESSAGES.TEST_PRINT_FAILED;
      return { success: false, message };
    }
  },

  /**
   * Cetak struk dari data transaksi lengkap.
   * Method high-level ini:
   *   1. Membaca konfigurasi printer
   *   2. Membangun teks struk dari data transaksi
   *   3. Mencetaknya
   *
   * @param receiptData - Data transaksi untuk struk (dari receipt.ts buildReceiptData)
   * @returns PrintResult — {success, message}
   */
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
    // Validasi
    if (!params.invoiceNumber) {
      return { success: false, message: ERROR_MESSAGES.NO_INVOICE };
    }
    if (!params.items || params.items.length === 0) {
      return { success: false, message: ERROR_MESSAGES.EMPTY_ITEMS };
    }

    const config = await PrinterConfigService.load();
    const receiptData = buildReceiptData(params);
    const receiptText = buildReceiptText(receiptData, config.printerSize);

    return this.printReceipt(receiptText);
  },

  /**
   * Set printer yang terhubung sebagai default untuk sesi berikutnya.
   */
  async setActivePrinter(name: string, address: string): Promise<void> {
    await PrinterConfigService.setLastPrinter(name, address);
  },

  /**
   * Dapatkan konfigurasi printer yang tersimpan.
   */
  async getConfig(): Promise<PrinterConfig> {
    return PrinterConfigService.load();
  },

  /**
   * Simpan konfigurasi printer.
   */
  async saveConfig(config: PrinterConfig): Promise<void> {
    await PrinterConfigService.save(config);
  },

  // ─── Method tambahan untuk Printer Struk settings page ───

  /**
   * Dapatkan pengaturan printer yang disederhanakan (PrinterSettings).
   */
  async getPrinterSettings(): Promise<PrinterSettings> {
    const config = await PrinterConfigService.load();
    return {
      paperSize: config.printerSize,
      autoPrintAfterSale: config.autoReconnect,
      lastPrinterName: config.printerName || null,
      lastPrinterAddress: config.printerAddress || null,
    };
  },

  /**
   * Simpan pengaturan printer dari halaman Printer Struk.
   */
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

  /**
   * Pindai printer Bluetooth (Tahap 1: placeholder ramah).
   */
  async scanPrinters(): Promise<PrinterDevice[]> {
    if (!isPlatformSupported()) {
      throw new Error('Fitur printer Bluetooth hanya tersedia di Android.');
    }
    if (!isNativeModuleAvailable()) {
      throw new Error('Fitur scan printer Bluetooth membutuhkan development build dan belum tersedia di Expo Go.');
    }
    return NativePrinter.scan();
  },

  /**
   * Dapatkan status printer saat ini.
   */
  async getPrinterStatus(): Promise<PrinterStatus> {
    const config = await PrinterConfigService.load();
    const nativeAvailable = isNativeModuleAvailable();
    const platformSupported = isPlatformSupported();
    const status = await this.getConnectionStatus();

    return {
      available: nativeAvailable && platformSupported,
      connected: status === 'connected',
      message: !platformSupported
        ? 'Fitur printer hanya tersedia di Android.'
        : !nativeAvailable
          ? 'Printer Bluetooth membutuhkan development build dan belum tersedia di Expo Go.'
          : status === 'connected'
            ? 'Printer terhubung dan siap digunakan.'
            : status === 'connecting'
              ? 'Menghubungkan ke printer...'
              : 'Printer belum terhubung. Silakan scan dan pilih printer.',
      device: config.printerName
        ? { name: config.printerName, address: config.printerAddress, connectionType: config.connectionType, isPaired: status === 'connected' }
        : null,
    };
  },

  /**
   * Cetak test print (Tahap 1: preview jika native tidak tersedia).
   */
  async printTest(): Promise<string> {
    if (isNativeModuleAvailable()) {
      const status = await this.getConnectionStatus();
      if (status !== 'connected') {
        const cfg = await PrinterConfigService.load();
        return 'Preview test print:\n\n' + formatTestReceipt({ paperSize: cfg.printerSize });
      }
      await NativePrinter.testPrint();
      return 'Test print berhasil dikirim ke printer.';
    }
    const config = await PrinterConfigService.load();
    const preview = formatTestReceipt({ paperSize: config.printerSize });
    return '\n── Preview Test Print ──\n' + preview + '\n── Akhir Preview ──\n\nCatatan: Printer Bluetooth membutuhkan development build.';
  },

  /**
   * Cetak struk transaksi (Tahap 1: preview jika native tidak tersedia).
   * Untuk preview/fallback — beda dari printReceipt(text) yang untuk cetak mentah.
   */
  async printReceiptPreview(receiptData: any): Promise<string> {
    if (!receiptData || !receiptData.invoiceNumber) {
      throw new Error('Data transaksi tidak valid untuk dicetak.');
    }
    if (isNativeModuleAvailable()) {
      const result = await this.printReceiptFromData(receiptData);
      if (!result.success) throw new Error(result.message);
      return 'Struk berhasil dikirim ke printer.';
    }
    const config = await PrinterConfigService.load();
    const date = receiptData.createdAt ? new Date(receiptData.createdAt) : new Date();
    const { formatReceiptForPrinter } = require('../utils/receipt-printer-format');
    const preview = formatReceiptForPrinter({
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
    }, { paperSize: config.printerSize });
    return '\n── Preview Struk ──\n' + preview + '\n── Akhir Preview ──\n\nCatatan: Printer Bluetooth membutuhkan development build.';
  },

  /**
   * Cek apakah printer native module tersedia.
   */
  isPrinterNativeAvailable(): boolean {
    return isNativeModuleAvailable() && isPlatformSupported();
  },
};

/**
 * Helper untuk mengambil data dari ReceiptData \& langsung mencetak.
 * Import ini jika ingin menyusun ReceiptData secara manual.
 */
// Re-export untuk kemudahan akses
export { buildReceiptData, buildReceiptText, buildTestPrintText } from '../utils/receipt';
