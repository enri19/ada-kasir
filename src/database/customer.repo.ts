import { getDatabase, generateId } from './db';
import { Customer, CustomerFormData } from '../types/customer';

export const CustomerRepository = {
  async create(data: CustomerFormData): Promise<Customer> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    const customer: Customer = {
      id,
      name: data.name,
      phone: data.phone || null,
      address: data.address || null,
      note: data.note || null,
      createdAt: now,
      updatedAt: now,
    };
    await db.runAsync(
      `INSERT INTO customers (id, name, phone, address, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [customer.id, customer.name, customer.phone, customer.address, customer.note, customer.createdAt, customer.updatedAt]
    );
    return customer;
  },

  async getAll(): Promise<Customer[]> {
    const db = await getDatabase();
    return await db.getAllAsync<Customer>(
      `SELECT id, name, phone, address, note, created_at as createdAt, updated_at as updatedAt FROM customers ORDER BY name ASC`
    );
  },

  async getById(id: string): Promise<Customer | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<Customer>(
      `SELECT id, name, phone, address, note, created_at as createdAt, updated_at as updatedAt FROM customers WHERE id = ?`,
      [id]
    );
    return result || null;
  },

  async search(query: string): Promise<Customer[]> {
    const db = await getDatabase();
    return await db.getAllAsync<Customer>(
      `SELECT id, name, phone, address, note, created_at as createdAt, updated_at as updatedAt FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name ASC`,
      [`%${query}%`, `%${query}%`]
    );
  },

  async update(id: string, data: Partial<CustomerFormData>): Promise<Customer | null> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: (string | null)[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
    if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address); }
    if (data.note !== undefined) { fields.push('note = ?'); values.push(data.note); }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    await db.runAsync(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM customers WHERE id = ?`, [id]);
  },
};
