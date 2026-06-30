import { getDatabase } from './db';
import { Store, StoreFormData } from '../types/store';

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const StoreRepository = {
  async create(data: StoreFormData): Promise<Store> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    const store: Store = {
      id,
      ...data,
      logoUri: data.logoUri ?? null,
      qrisImageUri: null,
      qrisName: null,
      qrisNote: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.runAsync(
      `INSERT INTO stores (id, name, owner_name, phone, address, receipt_note, logo_uri, qris_image_uri, qris_name, qris_note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [store.id, store.name, store.ownerName, store.phone, store.address, store.receiptNote, store.logoUri, store.qrisImageUri, store.qrisName, store.qrisNote, store.createdAt, store.updatedAt]
    );
    return store;
  },

  async getById(id: string): Promise<Store | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<Store>(
      `SELECT id, name, owner_name as ownerName, phone, address, receipt_note as receiptNote, logo_uri as logoUri, qris_image_uri as qrisImageUri, qris_name as qrisName, qris_note as qrisNote, created_at as createdAt, updated_at as updatedAt FROM stores WHERE id = ?`,
      [id]
    );
    return result || null;
  },

  async getActiveStore(): Promise<Store | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<Store>(
      `SELECT id, name, owner_name as ownerName, phone, address, receipt_note as receiptNote, logo_uri as logoUri, qris_image_uri as qrisImageUri, qris_name as qrisName, qris_note as qrisNote, created_at as createdAt, updated_at as updatedAt FROM stores ORDER BY created_at DESC LIMIT 1`
    );
    return result || null;
  },

  async update(
    id: string,
    data: Partial<StoreFormData> & { qrisImageUri?: string | null; qrisName?: string | null; qrisNote?: string | null; logoUri?: string | null }
  ): Promise<Store | null> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: (string | null)[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.ownerName !== undefined) { fields.push('owner_name = ?'); values.push(data.ownerName); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
    if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address); }
    if (data.receiptNote !== undefined) { fields.push('receipt_note = ?'); values.push(data.receiptNote); }
    if (data.logoUri !== undefined) { fields.push('logo_uri = ?'); values.push(data.logoUri); }
    if (data.qrisImageUri !== undefined) { fields.push('qris_image_uri = ?'); values.push(data.qrisImageUri); }
    if (data.qrisName !== undefined) { fields.push('qris_name = ?'); values.push(data.qrisName); }
    if (data.qrisNote !== undefined) { fields.push('qris_note = ?'); values.push(data.qrisNote); }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    await db.runAsync(
      `UPDATE stores SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return this.getById(id);
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM stores WHERE id = ?`, [id]);
  },
};
