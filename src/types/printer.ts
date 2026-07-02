/** Ukuran printer thermal yang didukung */
export type PrinterSize = '58mm' | '80mm';

/** Status koneksi printer */
export type PrinterConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/** Sumber koneksi printer */
export type PrinterConnectionType = 'bluetooth' | 'network' | 'usb';

/** Perangkat printer yang ditemukan saat scanning */
export interface PrinterDevice {
  /** Nama perangkat (misal: "Xprinter XP-58IIH") */
  name: string;
  /** Alamat MAC untuk Bluetooth, atau IP untuk network */
  address: string;
  /** Tipe koneksi */
  connectionType: PrinterConnectionType;
  /** Status pasangan (Bluetooth) */
  isPaired?: boolean;
}

/** Konfigurasi printer yang disimpan */
export interface PrinterConfig {
  /** Nama printer terakhir yang terhubung */
  printerName: string;
  /** Alamat MAC / device ID printer */
  printerAddress: string;
  /** Tipe koneksi */
  connectionType: PrinterConnectionType;
  /** Ukuran printer: 58mm atau 80mm */
  printerSize: PrinterSize;
  /** Lebar karakter: 32 untuk 58mm, 48 untuk 80mm */
  characterWidth: number;
  /** Aktifkan auto reconnect */
  autoReconnect: boolean;
}

/** Konfigurasi default printer */
export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  printerName: '',
  printerAddress: '',
  connectionType: 'bluetooth',
  printerSize: '58mm',
  characterWidth: 32,
  autoReconnect: true,
};

/** Daftar ukuran printer yang didukung */
export const PRINTER_SIZES: { label: string; value: PrinterSize; chars: number }[] = [
  { label: '58 mm (struk kecil)', value: '58mm', chars: 32 },
  { label: '80 mm (struk besar)', value: '80mm', chars: 48 },
];

/** Hasil operasi print */
export interface PrintResult {
  success: boolean;
  message: string;
}

/** Data struk yang akan dicetak */
export interface ReceiptData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  invoiceNumber: string;
  date: string;
  time: string;
  cashierName?: string;
  customerName?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paidAmount: number;
  changeAmount: number;
  debtNote?: string;
  receiptNote?: string;
}

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}
