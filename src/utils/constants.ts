export const APP_NAME = 'WarungRapi';
export const APP_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: 'onboarding_complete',
  ACTIVE_STORE_ID: 'active_store_id',
  LICENSE_DATA: 'license_data',
  THEME_MODE: 'theme_mode',
} as const;

export const ADMIN_WHATSAPP = '6285156846242';

export const PAYMENT_METHODS = {
  CASH: 'cash',
  QRIS: 'qris',
  TRANSFER: 'transfer',
  DEBT: 'debt',
} as const;

export const TRANSACTION_STATUS = {
  PAID: 'paid',
  UNPAID: 'unpaid',
  CANCELLED: 'cancelled',
} as const;

export const DEBT_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
} as const;
