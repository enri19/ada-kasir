import { getDatabase, generateId } from './db';
import { Debt, DebtPayment, DebtSource, DebtWithCustomer } from '../types/debt';

export const DebtRepository = {
  async createDebt(
    customerId: string,
    saleId: string | null,
    amount: number,
    paidAmount: number,
    remainingAmount: number,
    status: string,
    dueDate: string | null,
    note: string | null,
    source: DebtSource,
    createdAt?: string
  ): Promise<Debt> {
    const db = await getDatabase();
    const id = generateId();
    const now = createdAt ? new Date(createdAt).toISOString() : new Date().toISOString();
    const debt: Debt = {
      id,
      customerId,
      saleId,
      source,
      amount,
      paidAmount,
      remainingAmount,
      status: status as any,
      dueDate,
      note,
      createdAt: now,
      updatedAt: now,
    };
    await db.runAsync(
      `INSERT INTO debts (id, customer_id, sale_id, source, amount, paid_amount, remaining_amount, status, due_date, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [debt.id, debt.customerId, debt.saleId, debt.source, debt.amount, debt.paidAmount, debt.remainingAmount, debt.status, debt.dueDate, debt.note, debt.createdAt, debt.updatedAt]
    );
    return debt;
  },

  async getAll(): Promise<DebtWithCustomer[]> {
    const db = await getDatabase();
    const debts = await db.getAllAsync<any>(
      `SELECT d.id, d.customer_id as customerId, d.sale_id as saleId, d.source as source, d.amount, d.paid_amount as paidAmount, d.remaining_amount as remainingAmount, d.status, d.due_date as dueDate, d.note, d.created_at as createdAt, d.updated_at as updatedAt, c.name as customerName, c.phone as customerPhone
       FROM debts d JOIN customers c ON d.customer_id = c.id ORDER BY d.created_at DESC`
    );
    return debts;
  },

  async getByCustomerId(customerId: string): Promise<Debt[]> {
    const db = await getDatabase();
    return await db.getAllAsync<Debt>(
      `SELECT id, customer_id as customerId, sale_id as saleId, source as source, amount, paid_amount as paidAmount, remaining_amount as remainingAmount, status, due_date as dueDate, note, created_at as createdAt, updated_at as updatedAt FROM debts WHERE customer_id = ? ORDER BY created_at DESC`,
      [customerId]
    );
  },

  async getById(id: string): Promise<DebtWithCustomer | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<any>(
      `SELECT d.id, d.customer_id as customerId, d.sale_id as saleId, d.source as source, d.amount, d.paid_amount as paidAmount, d.remaining_amount as remainingAmount, d.status, d.due_date as dueDate, d.note, d.created_at as createdAt, d.updated_at as updatedAt, c.name as customerName, c.phone as customerPhone
       FROM debts d JOIN customers c ON d.customer_id = c.id WHERE d.id = ?`,
      [id]
    );
    return result || null;
  },

  async addPayment(debtId: string, amount: number, note: string | null): Promise<DebtPayment> {
    // Deprecated: use createDebtPayment / payDebt instead
    return this.createDebtPayment({ debtId, customerId: '', amount, paymentMethod: 'cash', note, paidAt: new Date().toISOString() });
  },

  async getDebtPaymentsByDebtId(debtId: string): Promise<DebtPayment[]> {
    const db = await getDatabase();
    return await db.getAllAsync<DebtPayment>(
      `SELECT id, debt_id as debtId, customer_id as customerId, amount, payment_method as paymentMethod, note, paid_at as paidAt, created_at as createdAt
       FROM debt_payments WHERE debt_id = ? ORDER BY paid_at DESC`,
      [debtId]
    );
  },

  async getDebtPaymentsByCustomerId(customerId: string): Promise<DebtPayment[]> {
    const db = await getDatabase();
    return await db.getAllAsync<DebtPayment>(
      `SELECT id, debt_id as debtId, customer_id as customerId, amount, payment_method as paymentMethod, note, paid_at as paidAt, created_at as createdAt
       FROM debt_payments WHERE customer_id = ? ORDER BY paid_at DESC`,
      [customerId]
    );
  },

  async createDebtPayment(data: { debtId: string; customerId: string; amount: number; paymentMethod: 'cash' | 'qris_static'; note?: string | null; paidAt?: string; createdAt?: string; }): Promise<DebtPayment> {
    const db = await getDatabase();
    const id = generateId();
    const now = data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString();
    const paidAt = data.paidAt ? new Date(data.paidAt).toISOString() : now;
    const payment: DebtPayment = {
      id,
      debtId: data.debtId,
      customerId: data.customerId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      note: data.note ?? null,
      paidAt,
      createdAt: now,
    };
    await db.runAsync(
      `INSERT INTO debt_payments (id, debt_id, customer_id, amount, payment_method, note, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [payment.id, payment.debtId, payment.customerId, payment.amount, payment.paymentMethod, payment.note, payment.paidAt, payment.createdAt]
    );
    return payment;
  },

  async payDebt(debtId: string, amount: number, paymentMethod: 'cash' | 'qris_static', note: string | null, paidAt?: string): Promise<DebtPayment> {
    const db = await getDatabase();
    const debt = await this.getById(debtId);
    if (!debt) throw new Error('Debt not found');
    if (amount <= 0) throw new Error('Nominal pembayaran harus lebih dari 0.');
    if (amount > debt.remainingAmount) throw new Error('Nominal pembayaran melebihi sisa bon.');

    // insert payment
    const payment = await this.createDebtPayment({ debtId, customerId: debt.customerId, amount, paymentMethod, note, paidAt });

    // update debt totals
    const now = new Date().toISOString();
    const newPaid = debt.paidAmount + amount;
    const newRemaining = Math.max(0, debt.amount - newPaid);
    let newStatus: string = 'unpaid';
    if (newRemaining <= 0) newStatus = 'paid';
    else if (newPaid > 0) newStatus = 'partial';

    await db.runAsync(
      `UPDATE debts SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = ? WHERE id = ?`,
      [newPaid, newRemaining, newStatus, now, debtId]
    );

    return payment;
  },

  async updateStatus(id: string, status: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`UPDATE debts SET status = ?, updated_at = ? WHERE id = ?`, [status, new Date().toISOString(), id]);
  },
};
