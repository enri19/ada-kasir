import { getDatabase, generateId } from './db';
import { Customer, CustomerDebtSummary, CustomerFormData } from '../types/customer';

const SELECT_CUSTOMER = `
  SELECT id, name, phone, address, note,
         COALESCE(is_active, 1) as isActive,
         created_at as createdAt, updated_at as updatedAt
  FROM customers
`;

export const CustomerRepository = {
  async create(data: CustomerFormData): Promise<Customer> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO customers (id, name, phone, address, note, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, data.name, data.phone || null, data.address || null, data.note || null, now, now]
    );
    return (await this.getById(id))!;
  },

  async getAll(): Promise<Customer[]> {
    const db = await getDatabase();
    return db.getAllAsync<Customer>(`${SELECT_CUSTOMER} ORDER BY name ASC`);
  },

  async getActive(): Promise<Customer[]> {
    const db = await getDatabase();
    return db.getAllAsync<Customer>(
      `${SELECT_CUSTOMER} WHERE COALESCE(is_active, 1) = 1 ORDER BY name ASC`
    );
  },

  async getById(id: string): Promise<Customer | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<Customer>(
      `${SELECT_CUSTOMER} WHERE id = ?`,
      [id]
    );
    return result ?? null;
  },

  async search(query: string): Promise<Customer[]> {
    const db = await getDatabase();
    return db.getAllAsync<Customer>(
      `${SELECT_CUSTOMER} WHERE (name LIKE ? OR phone LIKE ?) AND COALESCE(is_active, 1) = 1 ORDER BY name ASC`,
      [`%${query}%`, `%${query}%`]
    );
  },

  async update(id: string, data: Partial<CustomerFormData>): Promise<Customer | null> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: (string | null)[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone || null); }
    if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address || null); }
    if (data.note !== undefined) { fields.push('note = ?'); values.push(data.note || null); }
    fields.push('updated_at = ?');
    values.push(now, id);
    await db.runAsync(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },

  async deactivate(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
  },

  async activate(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE customers SET is_active = 1, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
  },

  async getCustomerDebtSummary(customerId: string): Promise<CustomerDebtSummary> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ totalDebt: number; totalBon: number }>(
      `SELECT COALESCE(SUM(remaining_amount), 0) as totalDebt, COUNT(*) as totalBon
       FROM debts WHERE customer_id = ? AND status != 'paid'`,
      [customerId]
    );
    return { totalDebt: result?.totalDebt ?? 0, totalBon: result?.totalBon ?? 0 };
  },

  /** Hapus permanen hanya jika tidak punya riwayat bon */
  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const hasDebt = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM debts WHERE customer_id = ?`,
      [id]
    );
    if ((hasDebt?.count ?? 0) > 0) return false;
    await db.runAsync(`DELETE FROM customers WHERE id = ?`, [id]);
    return true;
  },
};
