import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as SQLite from 'expo-sqlite';
import { getDatabase } from '../database/db';
import { CategoryRepository } from '../database/category.repo';
import { ProductRepository } from '../database/product.repo';
import { CustomerRepository } from '../database/customer.repo';
import { SaleRepository } from '../database/sales.repo';
import { DebtRepository } from '../database/debt.repo';
import { StockMovementRepository } from '../database/stock-movement.repo';
import { StoreRepository } from '../database/store.repo';
import { getSupabaseClient, isCloudConfigured, getUserId, getUserEmail } from './supabase.client';
import { getDeviceId } from './device-id';
import {
  BackupData,
  BackupMetadata,
  BackupRecords,
  BackupStatus,
  BACKUP_SCHEMA_VERSION,
} from '../types/backup';
import { STORAGE_KEYS } from '../utils/constants';
import { Category } from '../types/category';
import { Product, StockMovement } from '../types/product';
import { Customer } from '../types/customer';
import { SaleItem, Sale } from '../types/sale';
import { Debt, DebtPayment } from '../types/debt';
import { Store } from '../types/store';

const APP_VERSION = '1.0.0';
const BACKUP_VERSION = '1';

// ============================================================
// Internal helpers
// ============================================================

/**
 * Normalisasi nilai untuk SQLite - undefined/null menjadi null
 */
function dbValue<T>(value: T | null | undefined, fallback?: any): any {
  return value === undefined || value === null ? (fallback ?? null) : value;
}

/**
 * Normalisasi string - undefined/null menjadi fallback (default '')
 */
function dbText(value: unknown, fallback = ''): string {
  return value === undefined || value === null ? fallback : String(value);
}

/**
 * Normalisasi number - undefined/null menjadi fallback (default 0)
 */
function dbNumber(value: unknown, fallback = 0): number {
  if (value === undefined || value === null) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Normalisasi boolean - true=1, false=0, undefined/null menjadi fallback (default 1)
 */
function dbBool(value: unknown, fallback = true): number {
  if (value === undefined || value === null) return fallback ? 1 : 0;
  return value ? 1 : 0;
}

/**
 * Mengecek koneksi internet.
 */
async function checkConnection(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch {
    return false;
  }
}

/**
 * Menyimpan metadata backup terakhir ke AsyncStorage.
 */
async function saveBackupMetadata(recordCounts: Record<string, number>): Promise<void> {
  const metadata: BackupMetadata = {
    lastBackupAt: new Date().toISOString(),
    recordCounts,
    appVersion: APP_VERSION,
  };
  await AsyncStorage.setItem(STORAGE_KEYS.BACKUP_METADATA, JSON.stringify(metadata));
}

/**
 * Membaca metadata backup terakhir dari AsyncStorage.
 */
async function loadBackupMetadata(): Promise<BackupMetadata | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BACKUP_METADATA);
    if (!raw) return null;
    return JSON.parse(raw) as BackupMetadata;
  } catch {
    return null;
  }
}

// ============================================================
// Data collection helpers
// ============================================================

async function collectAllData(): Promise<{
  records: BackupRecords;
  recordCounts: Record<string, number>;
}> {
  const db = await getDatabase();

  // categories
  const categories = await CategoryRepository.getAll();
  // products
  const products = await ProductRepository.getAll();
  // customers
  const customers = await CustomerRepository.getAll();
  // sales + items
  const salesWithItems = await SaleRepository.getAll();
  const sales: Sale[] = salesWithItems.map(({ items: _items, ...sale }) => sale);
  const saleItems: SaleItem[] = salesWithItems.flatMap((s) => s.items);
  // debts + payments
  const debts = await db.getAllAsync<Debt>(
    `SELECT id, customer_id as customerId, sale_id as saleId, source, amount, paid_amount as paidAmount, remaining_amount as remainingAmount, status, due_date as dueDate, note, created_at as createdAt, updated_at as updatedAt FROM debts`
  );
  const debtPayments = await db.getAllAsync<DebtPayment>(
    `SELECT id, debt_id as debtId, customer_id as customerId, amount, payment_method as paymentMethod, note, paid_at as paidAt, created_at as createdAt FROM debt_payments`
  );
  // stock movements
  const stockMovements = await db.getAllAsync<StockMovement>(
    `SELECT id, product_id as productId, type, qty, stock_before as stockBefore, stock_after as stockAfter, reference_id as referenceId, note, created_at as createdAt FROM stock_movements`
  );
  // stores (settings toko)
  const stores = await db.getAllAsync<Store>(
    `SELECT id, name, owner_name as ownerName, phone, address, receipt_note as receiptNote, logo_uri as logoUri, qris_image_uri as qrisImageUri, qris_name as qrisName, qris_note as qrisNote, created_at as createdAt, updated_at as updatedAt FROM stores`
  );

  const records: BackupRecords = {
    categories,
    products,
    customers,
    sales,
    saleItems,
    debts,
    debtPayments,
    stockMovements,
    stores,
  };

  const recordCounts: Record<string, number> = {};
  for (const [key, arr] of Object.entries(records)) {
    recordCounts[key] = arr.length;
  }

  return { records, recordCounts };
}

// ============================================================
// Restore helpers
// ============================================================

/**
 * Validasi data backup sebelum restore.
 * Memastikan field penting tersedia dan schema version dikenal.
 * Untuk kompatibilitas dengan backup lama, validasi dibuat lebih lenient.
 */
function validateBackupData(data: BackupData): string | null {
  if (!data || typeof data !== 'object') {
    return 'Data backup tidak valid.';
  }

  // Validasi schema version (wajib)
  if (data.schemaVersion === undefined || data.schemaVersion === null) {
    return 'Data backup tidak memiliki versi skema.';
  }

  if (data.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return `Versi skema backup (${data.schemaVersion}) tidak dikenal. Versi saat ini: ${BACKUP_SCHEMA_VERSION}.`;
  }

  // Validasi records object (wajib)
  if (!data.records || typeof data.records !== 'object') {
    return 'Data backup tidak memiliki data records.';
  }

  // Validasi minimal: pastikan ada array-arrays penting
  // Kita hanya wajibkan tabel-tabel kritis, yang lain bisa kosong
  const criticalTables = ['categories', 'products', 'customers', 'sales', 'saleItems', 'debts'];
  for (const table of criticalTables) {
    const value = (data.records as any)[table];
    if (value === undefined || !Array.isArray(value)) {
      // Jika tidak ada, default ke array kosong (tidak fail)
      (data.records as any)[table] = [];
    }
  }

  // Pastikan tabel-tabel opsional ada (jika tidak ada, buat array kosong)
  const optionalTables = ['debtPayments', 'stockMovements', 'stores'];
  for (const table of optionalTables) {
    if ((data.records as any)[table] === undefined) {
      (data.records as any)[table] = [];
    }
  }

  return null;
}

/**
 * Membersihkan data lokal sebelum restore — tanpa PRAGMA.
 * Gunakan ketika sudah di dalam transaction (PRAGMA harus di luar transaction).
 * Data dihapus dengan urutan aman untuk foreign key (child table dulu).
 */
async function clearLocalDataInTransaction(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    DELETE FROM stock_movements;
    DELETE FROM debt_payments;
    DELETE FROM debts;
    DELETE FROM sale_items;
    DELETE FROM sales;
    DELETE FROM customers;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM stores;
  `);
}

/**
 * Membersihkan data lokal sebelum restore (dengan PRAGMA).
 * Hanya untuk dipakai di luar transaction.
 * Data dihapus dengan urutan aman untuk foreign key.
 */
async function clearLocalData(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = OFF');
  try {
    await clearLocalDataInTransaction(db);
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }
}

/**
 * Insert data kategori ke SQLite. Menerima db instance langsung.
 */
async function restoreCategories(db: SQLite.SQLiteDatabase, categories: Category[]): Promise<void> {
  const now = new Date().toISOString();
  for (const cat of categories) {
    const safeCreatedAt = dbText(cat.createdAt, now);
    const safeUpdatedAt = dbText(cat.updatedAt, safeCreatedAt);
    await db.runAsync(
      `INSERT OR REPLACE INTO categories (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [
        dbText(cat.id),
        dbText(cat.name, ''),
        dbNumber(cat.sortOrder, 0),
        safeCreatedAt,
        safeUpdatedAt,
      ]
    );
  }
}

/**
 * Insert data produk ke SQLite. Menerima db instance langsung.
 */
async function restoreProducts(db: SQLite.SQLiteDatabase, products: Product[]): Promise<void> {
  const now = new Date().toISOString();
  for (const p of products) {
    await db.runAsync(
      `INSERT OR REPLACE INTO products (id, category_id, name, sku, barcode, cost_price, sell_price, stock, min_stock, track_stock, allow_negative_stock, unit, image_uri, image_key, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbText(p.id),
        dbText(p.categoryId),
        dbText(p.name, ''),
        dbText(p.sku),
        dbText(p.barcode),
        dbNumber(p.costPrice, 0),
        dbNumber(p.sellPrice, 0),
        dbNumber(p.stock, 0),
        dbNumber(p.minStock, 0),
        dbBool(p.trackStock, true),
        dbBool(p.allowNegativeStock, true),
        dbText(p.unit, 'pcs'),
        dbText(p.imageUri),
        dbText(p.imageKey, 'default'),
        dbBool(p.isActive, true),
        dbText(p.createdAt, now),
        dbText(p.updatedAt, now),
      ]
    );
  }
}

/**
 * Insert data pelanggan ke SQLite. Menerima db instance langsung.
 */
async function restoreCustomers(db: SQLite.SQLiteDatabase, customers: Customer[]): Promise<void> {
  const now = new Date().toISOString();
  for (const c of customers) {
    await db.runAsync(
      `INSERT OR REPLACE INTO customers (id, name, phone, address, note, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbText(c.id),
        dbText(c.name, ''),
        dbText(c.phone),
        dbText(c.address),
        dbText(c.note),
        dbBool(c.isActive, true),
        dbText(c.createdAt, now),
        dbText(c.updatedAt, now),
      ]
    );
  }
}

/**
 * Insert data penjualan ke SQLite. Menerima db instance langsung.
 */
async function restoreSales(db: SQLite.SQLiteDatabase, sales: Sale[]): Promise<void> {
  const now = new Date().toISOString();
  for (const s of sales) {
    await db.runAsync(
      `INSERT OR REPLACE INTO sales (id, invoice_number, customer_id, total_amount, paid_amount, change_amount, payment_method, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbText(s.id),
        dbText(s.invoiceNumber, ''),
        dbText(s.customerId),
        dbNumber(s.totalAmount, 0),
        dbNumber(s.paidAmount, 0),
        dbNumber(s.changeAmount, 0),
        dbText(s.paymentMethod, 'cash'),
        dbText(s.status, 'paid'),
        dbText(s.createdAt, now),
        dbText(s.updatedAt, now),
      ]
    );
  }
}

/**
 * Insert data item penjualan ke SQLite. Menerima db instance langsung.
 */
async function restoreSaleItems(db: SQLite.SQLiteDatabase, items: SaleItem[]): Promise<void> {
  const now = new Date().toISOString();
  for (const item of items) {
    const safeSubtotal = dbNumber(item.subtotal, dbNumber(item.qty) * dbNumber(item.price));
    await db.runAsync(
      `INSERT OR REPLACE INTO sale_items (id, sale_id, product_id, product_name, qty, price, cost_price, subtotal, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbText(item.id),
        dbText(item.saleId),
        dbText(item.productId),
        dbText(item.productName, 'Produk'),
        dbNumber(item.qty, 1),
        dbNumber(item.price, 0),
        dbNumber(item.costPrice, 0),
        safeSubtotal,
        dbText(item.createdAt, now),
      ]
    );
  }
}

/**
 * Insert data hutang ke SQLite. Menerima db instance langsung.
 */
async function restoreDebts(db: SQLite.SQLiteDatabase, debts: Debt[]): Promise<void> {
  const now = new Date().toISOString();
  for (const d of debts) {
    const safeRemaining = dbNumber(d.remainingAmount, dbNumber(d.amount) - dbNumber(d.paidAmount));
    const safeDueDate = dbText(d.dueDate, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
    const safeStatus = dbText(d.status, safeRemaining <= 0 ? 'paid' : 'unpaid');

    await db.runAsync(
      `INSERT OR REPLACE INTO debts (id, customer_id, sale_id, source, amount, paid_amount, remaining_amount, status, due_date, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbText(d.id),
        dbText(d.customerId),
        dbText(d.saleId),
        dbText(d.source, 'transaction'),
        dbNumber(d.amount, 0),
        dbNumber(d.paidAmount, 0),
        safeRemaining,
        safeStatus,
        safeDueDate,
        dbText(d.note),
        dbText(d.createdAt, now),
        dbText(d.updatedAt, now),
      ]
    );
  }
}

/**
 * Insert data pembayaran hutang ke SQLite. Menerima db instance langsung.
 */
async function restoreDebtPayments(db: SQLite.SQLiteDatabase, payments: DebtPayment[]): Promise<void> {
  const now = new Date().toISOString();
  for (const p of payments) {
    await db.runAsync(
      `INSERT OR REPLACE INTO debt_payments (id, debt_id, customer_id, amount, payment_method, note, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbText(p.id),
        dbText(p.debtId),
        dbText(p.customerId),
        dbNumber(p.amount, 0),
        dbText(p.paymentMethod, 'cash'),
        dbText(p.note),
        dbText(p.paidAt, now),
        dbText(p.createdAt, now),
      ]
    );
  }
}

/**
 * Insert data pergerakan stok ke SQLite. Menerima db instance langsung.
 */
async function restoreStockMovements(db: SQLite.SQLiteDatabase, movements: StockMovement[]): Promise<void> {
  const now = new Date().toISOString();
  for (const m of movements) {
    await db.runAsync(
      `INSERT OR REPLACE INTO stock_movements (id, product_id, type, qty, stock_before, stock_after, reference_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbText(m.id),
        dbText(m.productId),
        dbText(m.type, 'adjustment'),
        dbNumber(m.qty, 0),
        dbNumber(m.stockBefore, 0),
        dbNumber(m.stockAfter, 0),
        dbText(m.referenceId),
        dbText(m.note),
        dbText(m.createdAt, now),
      ]
    );
  }
}

/**
 * Insert data toko ke SQLite. Menerima db instance langsung.
 */
async function restoreStores(db: SQLite.SQLiteDatabase, stores: Store[]): Promise<void> {
  const now = new Date().toISOString();
  for (const s of stores) {
    await db.runAsync(
      `INSERT OR REPLACE INTO stores (id, name, owner_name, phone, address, receipt_note, logo_uri, qris_image_uri, qris_name, qris_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbText(s.id),
        dbText(s.name, 'Warung Saya'),
        dbText(s.ownerName),
        dbText(s.phone),
        dbText(s.address),
        dbText(s.receiptNote),
        dbText(s.logoUri),
        dbText(s.qrisImageUri),
        dbText(s.qrisName),
        dbText(s.qrisNote),
        dbText(s.createdAt, now),
        dbText(s.updatedAt, now),
      ]
    );
  }
}

export type RestoreProgressCallback = (progress: {
  step: string;
  percent?: number;
  detail?: string;
}) => void;

// ============================================================
// BackupService — Public API
// ============================================================

export const BackupService = {
  /**
   * Memeriksa apakah semua prasyarat cloud backup terpenuhi.
   * TODO: Integrasikan ke UI sebelum memanggil backup/restore.
   */
  async getBackupStatus(): Promise<BackupStatus> {
    const isConfigured = isCloudConfigured();
    const isOnline = await checkConnection();
    const isLoggedIn = !!(await getUserId());
    const userEmail = await getUserEmail();
    const lastBackup = await loadBackupMetadata();

    return {
      isConfigured,
      isLoggedIn,
      userEmail,
      hasLastBackup: lastBackup !== null,
      lastBackup,
      isOnline,
    };
  },

  /**
   * Mengecek apakah cloud backup tersedia (sudah konfigurasi + ada koneksi).
   */
  async isCloudAvailable(): Promise<boolean> {
    if (!isCloudConfigured()) return false;
    return checkConnection();
  },

  /**
   * Mendapatkan waktu backup terakhir.
   * Mengembalikan ISO string atau null jika belum pernah backup.
   */
  async getLastBackupTime(): Promise<string | null> {
    const metadata = await loadBackupMetadata();
    return metadata?.lastBackupAt ?? null;
  },

  /**
   * Melakukan backup semua data lokal ke Supabase.
   *
   * Prasyarat:
   * - Supabase sudah dikonfigurasi (URL + Anon Key)
   * - User sudah login ke Supabase Auth
   * - Ada koneksi internet
   *
   * Semua data dari SQLite lokal akan dikumpulkan, dibungkus dalam JSON,
   * dan di-upload ke tabel cloud_backups di Supabase.
   *
   * Data yang dibackup: categories, products, customers, sales, sale_items,
   * debts, debt_payments, stock_movements, stores (pengaturan toko).
   *
   * @returns Promise<boolean> true jika backup berhasil
   * @throws Error dengan pesan Bahasa Indonesia jika gagal
   */
  async backupToCloud(): Promise<boolean> {
    // Cek konfigurasi
    if (!isCloudConfigured()) {
      throw new Error('Cloud belum dikonfigurasi. Periksa Supabase URL dan Anon Key.');
    }

    // Cek login
    const userId = await getUserId();
    if (!userId) {
      throw new Error('Anda belum login ke akun cloud.');
    }

    // Cek koneksi
    const isOnline = await checkConnection();
    if (!isOnline) {
      throw new Error('Backup cloud gagal. Periksa koneksi internet.');
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Cloud belum dikonfigurasi. Periksa Supabase URL dan Anon Key.');
    }

    try {
      // 1. Kumpulkan semua data dari SQLite
      const { records, recordCounts } = await collectAllData();

      // 2. Dapatkan store, device ID, dan store ID
      const activeStore = await StoreRepository.getActiveStore();
      const deviceId = await getDeviceId();
      const storeId = activeStore?.id ?? null;

      // 3. Dapatkan user email dari session untuk metadata
      const userEmail = await getUserEmail();

      // 4. Bungkus dalam format BackupData
      const backupData: BackupData = {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        records,
        recordCounts,
        // Metadata untuk identifikasi backup (disarankan untuk query)
        metadata: {
          user_id: userId,
          email: userEmail || undefined,
          device_id: deviceId,
          store_name: activeStore?.name || '',
          created_at: new Date().toISOString(),
        },
        // @deprecated — tetap disimpan untuk backward compatibility,
        // tapi query restore utama berdasarkan cloud_backups.user_id
        store_name: activeStore?.name || '',
      };

      // 5. Simpan ke Supabase (satu backup terbaru per user)
      const payload = {
        user_id: userId,
        store_id: storeId,
        device_id: deviceId,
        backup_data: backupData,
        record_counts: recordCounts,
        backup_version: BACKUP_VERSION,
        app_version: APP_VERSION,
        updated_at: new Date().toISOString(),
      };

      // Upsert: cari backup terbaru untuk user ini
      const { data: existing } = await supabase
        .from('cloud_backups')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update backup yang sudah ada
        const { error } = await supabase
          .from('cloud_backups')
          .update(payload)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert backup baru
        const { error } = await supabase
          .from('cloud_backups')
          .insert(payload);

        if (error) throw error;
      }

      // 6. Simpan metadata ke lokal
      await saveBackupMetadata(recordCounts);

      return true;
    } catch (error: any) {
      // Tangani error dengan pesan ramah
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('Network')) {
        throw new Error('Backup cloud gagal. Periksa koneksi internet.');
      }
      throw new Error(`Backup cloud gagal: ${error?.message || 'Terjadi kesalahan.'}`);
    }
  },

  /**
   * Melakukan restore data dari Supabase ke SQLite lokal.
   *
   * PERINGATAN: Proses ini akan MENGHAPUS semua data lokal yang ada
   * dan menggantinya dengan data dari cloud backup.
   *
   * Urutan restore:
   *   1. categories (kategori)
   *   2. products (produk — tergantung kategori)
   *   3. customers (pelanggan)
   *   4. sales (transaksi — tergantung customer)
   *   5. sale_items (item transaksi — tergantung sales)
   *   6. debts (hutang — tergantung customer & sales)
   *   7. debt_payments (pembayaran — tergantung debts)
   *   8. stock_movements (pergerakan stok — tergantung produk)
   *   9. stores (pengaturan toko)
   *
   * @returns Promise<boolean> true jika restore berhasil
   * @throws Error dengan pesan Bahasa Indonesia jika gagal
   */
  async restoreFromCloud(): Promise<boolean> {
    // Cek konfigurasi
    if (!isCloudConfigured()) {
      throw new Error('Cloud belum dikonfigurasi. Periksa Supabase URL dan Anon Key.');
    }

    // Cek login
    const userId = await getUserId();
    if (!userId) {
      throw new Error('Anda belum login ke akun cloud.');
    }

    // Cek koneksi
    const isOnline = await checkConnection();
    if (!isOnline) {
      throw new Error('Restore gagal. Periksa koneksi internet.');
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Cloud belum dikonfigurasi. Periksa Supabase URL dan Anon Key.');
    }

    try {
      // 1. Ambil backup terbaru dari Supabase (berdasarkan user_id saja)
      const { data: backups, error } = await supabase
        .from('cloud_backups')
        .select('backup_data')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!backups || backups.length === 0) {
        throw new Error('Data backup tidak ditemukan.');
      }

      const backupData = backups[0].backup_data as BackupData;

      // 2. Validasi dan normalisasi data backup SEBELUM transaksi dimulai
      const validationError = validateBackupData(backupData);
      if (validationError) {
        throw new Error(validationError);
      }

      // Normalisasi records - pastikan semua array ada
      const normalizedRecords = {
        categories: Array.isArray(backupData.records.categories) ? backupData.records.categories : [],
        products: Array.isArray(backupData.records.products) ? backupData.records.products : [],
        customers: Array.isArray(backupData.records.customers) ? backupData.records.customers : [],
        sales: Array.isArray(backupData.records.sales) ? backupData.records.sales : [],
        saleItems: Array.isArray(backupData.records.saleItems) ? backupData.records.saleItems : [],
        debts: Array.isArray(backupData.records.debts) ? backupData.records.debts : [],
        debtPayments: Array.isArray(backupData.records.debtPayments) ? backupData.records.debtPayments : [],
        stockMovements: Array.isArray(backupData.records.stockMovements) ? backupData.records.stockMovements : [],
        stores: Array.isArray(backupData.records.stores) ? backupData.records.stores : [],
      };

      const db = await getDatabase();

      // 3. Restore dalam SQLite transaction — atomic, rollback jika gagal
      // PRAGMA foreign_keys harus di luar transaction untuk Android compatibility
      await db.execAsync('PRAGMA foreign_keys = OFF');
      try {
        await db.execAsync('BEGIN TRANSACTION');

        // Hapus data lokal dengan urutan aman (child table dulu) - tanpa PRAGMA di dalam transaction
        await clearLocalDataInTransaction(db);

        // Insert ulang dengan urutan aman (parent table dulu)
        if (normalizedRecords.categories.length > 0) await restoreCategories(db, normalizedRecords.categories);
        if (normalizedRecords.products.length > 0) await restoreProducts(db, normalizedRecords.products);
        if (normalizedRecords.customers.length > 0) await restoreCustomers(db, normalizedRecords.customers);
        if (normalizedRecords.sales.length > 0) await restoreSales(db, normalizedRecords.sales);
        if (normalizedRecords.saleItems.length > 0) await restoreSaleItems(db, normalizedRecords.saleItems);
        if (normalizedRecords.debts.length > 0) await restoreDebts(db, normalizedRecords.debts);
        if (normalizedRecords.debtPayments.length > 0) await restoreDebtPayments(db, normalizedRecords.debtPayments);
        if (normalizedRecords.stockMovements.length > 0) await restoreStockMovements(db, normalizedRecords.stockMovements);
        if (normalizedRecords.stores.length > 0) await restoreStores(db, normalizedRecords.stores);

        await db.execAsync('COMMIT');
      } catch (txError) {
        // Rollback jika ada error selama transaksi
        try {
          await db.execAsync('ROLLBACK');
        } catch {
          // Jika rollback pun gagal, database mungkin dalam state buruk
        }
        throw new Error('Restore gagal dan perubahan dibatalkan. Data lokal tidak diubah.');
      } finally {
        await db.execAsync('PRAGMA foreign_keys = ON').catch(() => {});
      }

      // 4. Update metadata backup hanya jika COMMIT sukses
      await saveBackupMetadata(backupData.recordCounts);

      return true;
    } catch (error: unknown) {
      if (error instanceof Error && (
        error.message.includes('tidak ditemukan') ||
        error.message.includes('tidak valid') ||
        error.message.includes('dibatalkan')
      )) {
        throw error;
      }
      throw new Error(`Restore gagal. Data backup tidak dapat dipulihkan. Data lokal tidak diubah.`);
    }
  },

  /**
   * Mendapatkan daftar backup yang tersedia di cloud.
   * Berguna untuk memilih backup mana yang akan di-restore.
   *
   * @returns Promise dengan array metadata backup (id, createdAt, recordCounts)
   */
  async listCloudBackups(): Promise<
    { id: string; createdAt: string; updatedAt: string; recordCounts: Record<string, number>; appVersion: string }[]
  > {
    const userId = await getUserId();
    if (!userId) return [];

    const supabase = getSupabaseClient();
    if (!supabase) return [];



    const { data } = await supabase
      .from('cloud_backups')
      .select('id, created_at, updated_at, record_counts, app_version')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      recordCounts: row.record_counts || {},
      appVersion: row.app_version || '',
    }));
  },

  /**
   * Menghapus semua backup cloud untuk user dan device saat ini.
   *
   * PERINGATAN: Tindakan ini tidak bisa dibatalkan.
   * Pastikan user sudah memiliki backup lokal atau data masih utuh.
   */
  async clearCloudBackup(): Promise<boolean> {
    const userId = await getUserId();
    if (!userId) {
      throw new Error('Anda belum login ke akun cloud.');
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Cloud belum dikonfigurasi.');
    }

    

    const { error } = await supabase
      .from('cloud_backups')
      .delete()
      .eq('user_id', userId)

    if (error) throw error;

    // Hapus juga metadata lokal
    await AsyncStorage.removeItem(STORAGE_KEYS.BACKUP_METADATA);

    return true;
  },

  /**
   * Restore dari data backup langsung (tanpa Supabase Auth).
   * Digunakan oleh Premium Account yang login via email/phone
   * tanpa perlu login Supabase Auth.
   *
   * @param backupData Data backup lengkap (BackupData)
   * @param onProgress Callback opsional untuk progress restore
   * @returns Promise<boolean> true jika restore berhasil
   * @throws Error dengan pesan Bahasa Indonesia jika gagal
   */
  async restoreFromData(
    backupData: BackupData,
    onProgress?: RestoreProgressCallback,
  ): Promise<boolean> {
    // Validasi data
    onProgress?.({ step: 'Memvalidasi data...', percent: 10, detail: 'Memastikan file backup dapat dipulihkan.' });
    const validationError = validateBackupData(backupData);
    if (validationError) {
      throw new Error(validationError);
    }

    // Normalisasi records - pastikan semua array ada
    const normalizedRecords = {
      categories: Array.isArray(backupData.records.categories) ? backupData.records.categories : [],
      products: Array.isArray(backupData.records.products) ? backupData.records.products : [],
      customers: Array.isArray(backupData.records.customers) ? backupData.records.customers : [],
      sales: Array.isArray(backupData.records.sales) ? backupData.records.sales : [],
      saleItems: Array.isArray(backupData.records.saleItems) ? backupData.records.saleItems : [],
      debts: Array.isArray(backupData.records.debts) ? backupData.records.debts : [],
      debtPayments: Array.isArray(backupData.records.debtPayments) ? backupData.records.debtPayments : [],
      stockMovements: Array.isArray(backupData.records.stockMovements) ? backupData.records.stockMovements : [],
      stores: Array.isArray(backupData.records.stores) ? backupData.records.stores : [],
    };

    const db = await getDatabase();

    // Restore dalam SQLite transaction — atomic, rollback jika gagal
    // PRAGMA foreign_keys harus di luar transaction untuk Android compatibility
    await db.execAsync('PRAGMA foreign_keys = OFF');
    try {
      onProgress?.({ step: 'Memulihkan data toko...', percent: 25, detail: 'Mengembalikan pengaturan toko.' });
      await db.execAsync('BEGIN TRANSACTION');

      onProgress?.({ step: 'Membersihkan data lama...', percent: 30, detail: 'Menghapus data lokal yang ada.' });
      await clearLocalDataInTransaction(db);

      onProgress?.({ step: 'Memulihkan produk dan stok...', percent: 50, detail: 'Mengembalikan daftar produk, kategori, dan stok.' });
      if (normalizedRecords.categories.length > 0) await restoreCategories(db, normalizedRecords.categories);
      if (normalizedRecords.products.length > 0) await restoreProducts(db, normalizedRecords.products);

      onProgress?.({ step: 'Memulihkan pelanggan dan bon...', percent: 65, detail: 'Mengembalikan data pelanggan dan piutang.' });
      if (normalizedRecords.customers.length > 0) await restoreCustomers(db, normalizedRecords.customers);
      if (normalizedRecords.debts.length > 0) await restoreDebts(db, normalizedRecords.debts);
      if (normalizedRecords.debtPayments.length > 0) await restoreDebtPayments(db, normalizedRecords.debtPayments);

      onProgress?.({ step: 'Memulihkan transaksi...', percent: 80, detail: 'Mengembalikan riwayat penjualan.' });
      if (normalizedRecords.sales.length > 0) await restoreSales(db, normalizedRecords.sales);
      if (normalizedRecords.saleItems.length > 0) await restoreSaleItems(db, normalizedRecords.saleItems);

      onProgress?.({ step: 'Memulihkan pergerakan stok...', percent: 90, detail: 'Mengembalikan riwayat stok.' });
      if (normalizedRecords.stockMovements.length > 0) await restoreStockMovements(db, normalizedRecords.stockMovements);
      if (normalizedRecords.stores.length > 0) await restoreStores(db, normalizedRecords.stores);

      onProgress?.({ step: 'Menyelesaikan restore...', percent: 95, detail: 'Menyimpan perubahan.' });
      await db.execAsync('COMMIT');

      onProgress?.({ step: 'Menyelesaikan restore...', percent: 100, detail: 'Restore selesai.' });
      await saveBackupMetadata(backupData.recordCounts);

      return true;
    } catch (txError) {
      try {
        await db.execAsync('ROLLBACK');
      } catch {}
      throw new Error('Restore gagal dan perubahan dibatalkan. Data lokal tidak diubah.');
    } finally {
      await db.execAsync('PRAGMA foreign_keys = ON').catch(() => {});
    }
  },
};
