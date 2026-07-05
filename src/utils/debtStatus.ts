/**
 * Debt / Piutang status label & colour utility.
 *
 * All date arithmetic uses local calendar days (year/month/date)
 * so that timezone offsets never affect the result.
 */

export type DebtDueStatus =
  | "paid"
  | "new"
  | "safe"
  | "urgent"
  | "due_today"
  | "overdue";

export interface DebtDueStatusResult {
  type: DebtDueStatus;
  label: string;
  diffDays: number | null;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Resolve the effective due date.
 *
 * 1. If an explicit `dueDate` is provided, use it.
 * 2. Otherwise fall back to `createdAt + defaultTermDays` (default 30).
 * 3. If neither is available, returns `null`.
 */
export function getDebtDueDate(params: {
  dueDate?: string | null;
  createdAt?: string | null;
  defaultTermDays?: number;
}): Date | null {
  const explicitDueDate = parseDate(params.dueDate);
  if (explicitDueDate) return explicitDueDate;

  const createdAt = parseDate(params.createdAt);
  if (!createdAt) return null;

  return addDays(createdAt, params.defaultTermDays ?? 30);
}

/**
 * Determine the debt status label & type based on due date.
 */
export function getDebtDueStatus(params: {
  status?: string | null;
  remainingAmount?: number | null;
  dueDate?: string | null;
  createdAt?: string | null;
  defaultTermDays?: number;
  today?: Date;
}): DebtDueStatusResult {
  const isPaid =
    params.status === "paid" ||
    params.status === "lunas" ||
    Number(params.remainingAmount ?? 0) <= 0;

  if (isPaid) {
    return {
      type: "paid",
      label: "LUNAS",
      diffDays: null,
    };
  }

  const today = startOfLocalDay(params.today ?? new Date());
  const due = getDebtDueDate({
    dueDate: params.dueDate,
    createdAt: params.createdAt,
    defaultTermDays: params.defaultTermDays ?? 30,
  });

  if (!due) {
    return {
      type: "safe",
      label: "AMAN",
      diffDays: null,
    };
  }

  const dueDay = startOfLocalDay(due);
  const diffDays = Math.round(
    (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const createdAt = parseDate(params.createdAt);
  const isCreatedToday =
    createdAt !== null &&
    startOfLocalDay(createdAt).getTime() === today.getTime();

  if (diffDays < 0) {
    return {
      type: "overdue",
      label: "JATUH TEMPO",
      diffDays,
    };
  }

  if (diffDays === 0) {
    return {
      type: "due_today",
      label: "JATUH TEMPO HARI INI",
      diffDays,
    };
  }

  if (diffDays <= 3) {
    return {
      type: "urgent",
      label: "MENDESAK",
      diffDays,
    };
  }

  if (isCreatedToday) {
    return {
      type: "new",
      label: "BARU",
      diffDays,
    };
  }

  return {
    type: "safe",
    label: "AMAN",
    diffDays,
  };
}

/**
 * Get badge colour mapping for a given status type.
 */
export function getDebtDueStatusColors(type: DebtDueStatus): {
  bg: string;
  color: string;
} {
  switch (type) {
    case "paid":
      return { bg: "#e8f5e9", color: "#2e7d32" }; // hijau muda
    case "new":
      return { bg: "#e0f2fe", color: "#0369a1" }; // biru muda
    case "safe":
      return { bg: "#e8f5e9", color: "#388e3c" }; // hijau
    case "urgent":
      return { bg: "#fff3e0", color: "#e65100" }; // oranye muda
    case "due_today":
      return { bg: "#fff9c4", color: "#f57f17" }; // kuning
    case "overdue":
      return { bg: "#ffebee", color: "#c62828" }; // merah muda
    default:
      return { bg: "#f5f5f5", color: "#757575" };
  }
}