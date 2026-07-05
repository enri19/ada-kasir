/**
 * Debt / Piutang date helpers.
 *
 * Separates the concept of "tanggal bon dibuat" (created_at)
 * from "tanggal jatuh tempo" (due_date) so the UI can display
 * both clearly and calculate status badges correctly.
 */

/**
 * Parse a date string into a Date using local time components.
 * Returns null for falsy / invalid input.
 */
export function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Add `days` calendar days to a Date and return a new Date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format a date for display: "5 Jul 2026"
 */
export function formatDebtDate(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date + time for display: "5 Jul 2026 · 01.17"
 */
export function formatDebtDateTime(date: Date): string {
  return `${formatDebtDate(date)} · ${date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/**
 * Resolve the effective due date for a debt.
 *
 * 1. If an explicit `dueDate` is stored, use it → not estimated.
 * 2. Otherwise, fall back to `createdAt + defaultTermDays` (30) → estimated.
 * 3. If neither is available, returns `{ date: null, isEstimated: false }`.
 */
export function getEffectiveDueDate(params: {
  dueDate?: string | null;
  createdAt?: string | null;
  defaultTermDays?: number;
}): { date: Date | null; isEstimated: boolean } {
  // 1. Explicit due date stored
  if (params.dueDate) {
    const parsed = parseDateOnly(params.dueDate);
    if (parsed) return { date: parsed, isEstimated: false };
  }

  // 2. Fallback: created_at + 30 hari
  if (params.createdAt) {
    const created = parseDateOnly(params.createdAt);
    if (created) {
      return {
        date: addDays(created, params.defaultTermDays ?? 30),
        isEstimated: true,
      };
    }
  }

  return { date: null, isEstimated: false };
}

/**
 * Get a human-readable due-date label.
 *
 * When the due date is estimated (fallback), prefix with "Jatuh tempo estimasi:".
 * When it's explicit, prefix with "Jatuh tempo:".
 * Returns empty string when no date is available.
 */
export function getDueDateLabel(params: {
  dueDate?: string | null;
  createdAt?: string | null;
  defaultTermDays?: number;
}): string {
  const { date, isEstimated } = getEffectiveDueDate(params);
  if (!date) return '';
  const formatted = formatDebtDate(date);
  return isEstimated
    ? `Jatuh tempo estimasi: ${formatted}`
    : `Jatuh tempo: ${formatted}`;
}

/**
 * Find the nearest (earliest) effective due date among unpaid debts.
 *
 * - Returns `null` when there are no unpaid debts.
 * - Skips debts that are paid / lunas / have no remaining amount.
 * - Uses the same fallback logic (createdAt + 30) when dueDate is absent.
 */
export function getNearestDueDate(
  debts: Array<{
    status?: string;
    remainingAmount?: number;
    dueDate?: string | null;
    createdAt?: string | null;
  }>
): Date | null {
  let nearest: Date | null = null;

  for (const debt of debts) {
    const isPaid =
      debt.status === 'paid' ||
      debt.status === 'lunas' ||
      (debt.remainingAmount ?? 0) <= 0;
    if (isPaid) continue;

    const { date } = getEffectiveDueDate({
      dueDate: debt.dueDate,
      createdAt: debt.createdAt,
    });
    if (date && (!nearest || date.getTime() < nearest.getTime())) {
      nearest = date;
    }
  }

  return nearest;
}

/**
 * Determine the debt status label & type based on due date.
 *
 * Mirrors getDebtDueStatus from debtStatus.ts but is kept separate
 * so that debtDate.ts has no UI-file dependency — consumers can
 * pick whichever fits their module boundary.
 */
export type DebtDueStatus =
  | 'paid'
  | 'new'
  | 'safe'
  | 'urgent'
  | 'due_today'
  | 'overdue';

export interface DebtDueStatusResult {
  type: DebtDueStatus;
  label: string;
  diffDays: number | null;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getDebtDueStatus(params: {
  status?: string | null;
  remainingAmount?: number | null;
  dueDate?: string | null;
  createdAt?: string | null;
  defaultTermDays?: number;
  today?: Date;
}): DebtDueStatusResult {
  const isPaid =
    params.status === 'paid' ||
    params.status === 'lunas' ||
    Number(params.remainingAmount ?? 0) <= 0;

  if (isPaid) {
    return { type: 'paid', label: 'LUNAS', diffDays: null };
  }

  const today = startOfLocalDay(params.today ?? new Date());
  const { date: due } = getEffectiveDueDate({
    dueDate: params.dueDate,
    createdAt: params.createdAt,
    defaultTermDays: params.defaultTermDays ?? 30,
  });

  if (!due) {
    return { type: 'safe', label: 'AMAN', diffDays: null };
  }

  const dueDay = startOfLocalDay(due);
  const diffDays = Math.round(
    (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const createdAt = parseDateOnly(params.createdAt);
  const isCreatedToday =
    createdAt !== null &&
    startOfLocalDay(createdAt).getTime() === today.getTime();

  if (diffDays < 0) {
    return { type: 'overdue', label: 'JATUH TEMPO', diffDays };
  }

  if (diffDays === 0) {
    return { type: 'due_today', label: 'JATUH TEMPO HARI INI', diffDays };
  }

  if (diffDays <= 3) {
    return { type: 'urgent', label: 'MENDESAK', diffDays };
  }

  if (isCreatedToday) {
    return { type: 'new', label: 'BARU', diffDays };
  }

  return { type: 'safe', label: 'AMAN', diffDays };
}

/**
 * Badge colour mapping for a given status type.
 */
export function getDebtDueStatusColors(type: DebtDueStatus): {
  bg: string;
  color: string;
} {
  switch (type) {
    case 'paid':
      return { bg: '#e8f5e9', color: '#2e7d32' };
    case 'new':
      return { bg: '#e0f2fe', color: '#0369a1' };
    case 'safe':
      return { bg: '#e8f5e9', color: '#388e3c' };
    case 'urgent':
      return { bg: '#fff3e0', color: '#e65100' };
    case 'due_today':
      return { bg: '#fff9c4', color: '#f57f17' };
    case 'overdue':
      return { bg: '#ffebee', color: '#c62828' };
    default:
      return { bg: '#f5f5f5', color: '#757575' };
  }
}
