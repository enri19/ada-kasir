import * as SQLite from 'expo-sqlite';
import { ALL_MIGRATIONS } from './migrations';

const DATABASE_NAME = 'AdaKasir.db';

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  if (dbPromise) return dbPromise;

  dbPromise = initDatabase();
  try {
    return await dbPromise;
  } finally {
    dbPromise = null;
  }
};

const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  try {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await runMigrations();
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    db = null;
    // Try to reset and reinitialize
    try {
      db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await db.execAsync(`
        DROP TABLE IF EXISTS stock_movements;
        DROP TABLE IF EXISTS debt_payments;
        DROP TABLE IF EXISTS debts;
        DROP TABLE IF EXISTS sale_items;
        DROP TABLE IF EXISTS sales;
        DROP TABLE IF EXISTS customers;
        DROP TABLE IF EXISTS products;
        DROP TABLE IF EXISTS categories;
        DROP TABLE IF EXISTS stores;
      `);
      await runMigrations();
      return db;
    } catch (retryError) {
      console.error('Database retry failed:', retryError);
      db = null;
      throw retryError;
    }
  }
};

const runMigrations = async () => {
  if (!db) throw new Error('Database not initialized');
  for (const migration of ALL_MIGRATIONS) {
    try {
      await db.execAsync(migration);
    } catch (error) {
      // Ignore errors for ALTER TABLE if column already exists
      if (!migration.includes('ALTER TABLE')) {
        console.error('Migration error:', error);
        throw error;
      }
    }
  }
};

export const resetDatabase = async () => {
  const database = await getDatabase();
  await database.execAsync(`
    DROP TABLE IF EXISTS stock_movements;
    DROP TABLE IF EXISTS debt_payments;
    DROP TABLE IF EXISTS debts;
    DROP TABLE IF EXISTS sale_items;
    DROP TABLE IF EXISTS sales;
    DROP TABLE IF EXISTS customers;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS stores;
  `);
  await runMigrations();
};
