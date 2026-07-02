import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
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
 */
function validateBackupData(data: BackupData): string | null {
  if (!data || typeof data !== 'object') {
    return 'Data backup tidak valid.';
  }

  if (data.schemaVersion === undefined || data.schemaVersion === null) {
    return 'Data backup tidak memiliki versi skema.';
  }

  if (data.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return `Versi skema backup (${data.schemaVersion}) tidak dikenal. Versi saat ini: ${BACKUP_SCHEMA_VERSION}.`;
  }

  if (!data.records || typeof data.records !== 'object') {
    return 'Data backup tidak memiliki data records.';
  }

  // Validasi minimal: pastikan ada array-arrays
  const requiredTables = ['categories', 'products', 'customers', 'sales', 'saleItems', 'debts'];
  for (const table of requiredTables) {
    if (!Array.isArray((data.records as any)[table])) {
      return `Data backup tidak valid: tabel ${table} tidak ditemukan.`;
    }
  }

  return null;
}

/**
 * Membersihkan data lokal sebelum restore.
 * Semua data dihapus dalam satu transaksi SQLite.
 */
async function clearLocalData(): Promise<void> {
  const db = await getDatabase();
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
 * Insert data kategori ke SQLite.
 */
async function restoreCategories(categories: Category[]): Promise<void> {
  const db = await getDatabase();
  for (const cat of categories) {
    await db.runAsync(
      `INSERT OR REPLACE INTO categories (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [cat.id, cat.name, cat.sortOrder, cat.createdAt, cat.updatedAt]
    );
  }
}

/**
 * Insert data produk ke SQLite.
 */
async function restoreProducts(products: Product[]): Promise<void> {
  const db = await getDatabase();
  for (const p of products) {
    await db.runAsync(
      `INSERT OR REPLACE INTO products (id, category_id, name, sku, barcode, cost_price, sell_price, stock, min_stock, track_stock, allow_negative_stock, unit, image_uri, image_key, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id,
        p.categoryId,
        p.name,
        p.sku,
        p.barcode,
        p.costPrice,
        p.sellPrice,
        p.stock,
        p.minStock,
        p.trackStock ? 1 : 0,
        p.allowNegativeStock ? 1 : 0,
        p.unit,
        p.imageUri,
        p.imageKey,
        p.isActive ? 1 : 0,
        p.createdAt,
        p.updatedAt,
      ]
    );
  }
}

/**
 * Insert data pelanggan ke SQLite.
 */
async function restoreCustomers(customers: Customer[]): Promise<void> {
  const db = await getDatabase();
  for (const c of customers) {
    await db.runAsync(
      `INSERT OR REPLACE INTO customers (id, name, phone, address, note, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.name, c.phone, c.address, c.note, c.isActive ?? 1, c.createdAt, c.updatedAt]
    );
  }
}

/**
 * Insert data penjualan ke SQLite.
 */
async function restoreSales(sales: Sale[]): Promise<void> {
  const db = await getDatabase();
  for (const s of sales) {
    await db.runAsync(
      `INSERT OR REPLACE INTO sales (id, invoice_number, customer_id, total_amount, paid_amount, change_amount, payment_method, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.invoiceNumber,
        s.customerId,
        s.totalAmount,
        s.paidAmount,
        s.changeAmount,
        s.paymentMethod,
        s.status,
        s.createdAt,
        s.updatedAt,
      ]
    );
  }
}

/**
 * Insert data item penjualan ke SQLite.
 */
async function restoreSaleItems(items: SaleItem[]): Promise<void> {
  const db = await getDatabase();
  for (const item of items) {
    await db.runAsync(
      `INSERT OR REPLACE INTO sale_items (id, sale_id, product_id, product_name, qty, price, cost_price, subtotal, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.saleId, item.productId, item.productName, item.qty, item.price, item.costPrice, item.subtotal, item.createdAt]
    );
  }
}

/**
 * Insert data hutang ke SQLite.
 */
async function restoreDebts(debts: Debt[]): Promise<void> {
  const db = await getDatabase();
  for (const d of debts) {
    await db.runAsync(
      `INSERT OR REPLACE INTO debts (id, customer_id, sale_id, source, amount, paid_amount, remaining_amount, status, due_date, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.id, d.customerId, d.saleId, d.source, d.amount, d.paidAmount, d.remainingAmount, d.status, d.dueDate, d.note, d.createdAt, d.updatedAt]
    );
  }
}

/**
 * Insert data pembayaran hutang ke SQLite.
 */
async function restoreDebtPayments(payments: DebtPayment[]): Promise<void> {
  const db = await getDatabase();
  for (const p of payments) {
    await db.runAsync(
      `INSERT OR REPLACE INTO debt_payments (id, debt_id, customer_id, amount, payment_method, note, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.debtId, p.customerId, p.amount, p.paymentMethod, p.note, p.paidAt, p.createdAt]
    );
  }
}

/**
 * Insert data pergerakan stok ke SQLite.
 */
async function restoreStockMovements(movements: StockMovement[]): Promise<void> {
  const db = await getDatabase();
  for (const m of movements) {
    await db.runAsync(
      `INSERT OR REPLACE INTO stock_movements (id, product_id, type, qty, stock_before, stock_after, reference_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [m.id, m.productId, m.type, m.qty, m.stockBefore, m.stockAfter, m.referenceId, m.note, m.createdAt]
    );
  }
}

/**
 * Insert data toko ke SQLite.
 */
async function restoreStores(stores: Store[]): Promise<void> {
  const db = await getDatabase();
  for (const s of stores) {
    await db.runAsync(
      `INSERT OR REPLACE INTO stores (id, name, owner_name, phone, address, receipt_note, logo_uri, qris_image_uri, qris_name, qris_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.name, s.ownerName, s.phone, s.address, s.receiptNote, s.logoUri, s.qrisImageUri, s.qrisName, s.qrisNote, s.createdAt, s.updatedAt]
    );
  }
}

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

      // 2. Bungkus dalam format BackupData
      const backupData: BackupData = {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        records,
        recordCounts,
      };

      // 3. Dapatkan device ID dan store ID
      const deviceId = await getDeviceId();
      const activeStore = await StoreRepository.getActiveStore();
      const storeId = activeStore?.id ?? null;

      // 4. Simpan ke Supabase (upsert: satu backup per user + device)
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

      // Upsert: cari dulu apakah sudah ada backup untuk user+device ini
      const { data: existing } = await supabase
        .from('cloud_backups')
        .select('id')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
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

      // 5. Simpan metadata ke lokal
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
      // 1. Ambil backup terbaru dari Supabase
      const deviceId = await getDeviceId();

      const { data: backups, error } = await supabase
        .from('cloud_backups')
        .select('backup_data')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!backups || backups.length === 0) {
        throw new Error('Data backup tidak ditemukan.');
      }

      const backupData = backups[0].backup_data as BackupData;

      // 2. Validasi data backup
      const validationError = validateBackupData(backupData);
      if (validationError) {
        throw new Error(validationError);
      }

      // 3. Restore data dalam urutan yang benar
      //    Gunakan urutan yang aman untuk foreign key
      const { records } = backupData;

      await clearLocalData();

      // Urutan restore (parent table dulu, baru child table)
      if (records.categories.length > 0) await restoreCategories(records.categories);
      if (records.products.length > 0) await restoreProducts(records.products);
      if (records.customers.length > 0) await restoreCustomers(records.customers);
      if (records.sales.length > 0) await restoreSales(records.sales);
      if (records.saleItems.length > 0) await restoreSaleItems(records.saleItems);
      if (records.debts.length > 0) await restoreDebts(records.debts);
      if (records.debtPayments.length > 0) await restoreDebtPayments(records.debtPayments);
      if (records.stockMovements.length > 0) await restoreStockMovements(records.stockMovements);
      if (records.stores.length > 0) await restoreStores(records.stores);

      // 4. Update metadata backup
      await saveBackupMetadata(backupData.recordCounts);

      return true;
    } catch (error: any) {
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('Network')) {
        throw new Error('Restore gagal. Periksa koneksi internet.');
      }
      // Re-throw jika sudah punya pesan sendiri
      if (
        error?.message?.includes('Cloud belum dikonfigurasi') ||
        error?.message?.includes('Anda belum login') ||
        error?.message?.includes('tidak ditemukan') ||
        error?.message?.includes('tidak valid')
      ) {
        throw error;
      }
      throw new Error(`Restore gagal: ${error?.message || 'Terjadi kesalahan.'}`);
    }
  },

  /**
   * Mendapatkan daftar backup yang tersedia di cloud.
   * Berguna untuk memilih backup mana yang akan di-restore.
   *
   * @returns Promise dengan array metadata backup (id, createdAt, recordCounts)
   */
  async listCloudBackups(): Promise<
    { id: string; createdAt: string; recordCounts: Record<string, number>; appVersion: string }[]
  > {
    const userId = await getUserId();
    if (!userId) return [];

    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const deviceId = await getDeviceId();

    const { data } = await supabase
      .from('cloud_backups')
      .select('id, created_at, record_counts, app_version')
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
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

    const deviceId = await getDeviceId();

    const { error } = await supabase
      .from('cloud_backups')
      .delete()
      .eq('user_id', userId)
      .eq('device_id', deviceId);

    if (error) throw error;

    // Hapus juga metadata lokal
    await AsyncStorage.removeItem(STORAGE_KEYS.BACKUP_METADATA);

    return true;
  },
};
