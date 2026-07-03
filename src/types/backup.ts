import { Category } from './category';
import { Customer } from './customer';
import { Product, StockMovement } from './product';
import { Sale, SaleItem } from './sale';
import { Debt, DebtPayment } from './debt';
import { Store } from './store';

/**
 * Schema version untuk validasi kompatibilitas backup.
 * Increment jika struktur data berubah secara breaking.
 */
export const BACKUP_SCHEMA_VERSION = 1;

/**
 * Data lengkap yang akan dibackup ke cloud.
 * Berisi semua record dari SQLite lokal, dibungkus dalam satu JSON.
 */
export interface BackupData {
  /** Versi skema backup untuk validasi saat restore */
  schemaVersion: number;
  /** ISO timestamp kapan backup dibuat */
  createdAt: string;
  /** Versi aplikasi saat backup */
  appVersion: string;
  /** Semua record dari database lokal */
  records: BackupRecords;
  /** Jumlah record per tabel untuk verifikasi */
  recordCounts: Record<string, number>;
  /** Nama toko (disimpan di root agar mudah dicari oleh RPC) */
  store_name?: string;
}

export interface BackupRecords {
  categories: Category[];
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  saleItems: SaleItem[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  stockMovements: StockMovement[];
  stores: Store[];
}

/**
 * Struktur backup yang disimpan di Supabase.
 */
export interface CloudBackup {
  id: string;
  userId: string;
  storeId: string | null;
  deviceId: string;
  backupData: BackupData;
  recordCounts: Record<string, number>;
  backupVersion: string;
  appVersion: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Metadata backup terakhir yang disimpan secara lokal.
 */
export interface BackupMetadata {
  lastBackupAt: string;
  recordCounts: Record<string, number>;
  appVersion: string;
}

/**
 * Ringkasan status untuk ditampilkan di UI.
 */
export interface BackupStatus {
  /** Apakah env Supabase sudah dikonfigurasi */
  isConfigured: boolean;
  /** Apakah user sudah login ke Supabase Auth */
  isLoggedIn: boolean;
  /** Email user yang login (jika ada) */
  userEmail: string | null;
  /** Apakah ada backup terakhir yang tersimpan */
  hasLastBackup: boolean;
  /** Info backup terakhir (jika ada) */
  lastBackup: BackupMetadata | null;
  /** Apakah device online */
  isOnline: boolean;
}
