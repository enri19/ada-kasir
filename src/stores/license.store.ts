import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import { LicenseData, LicenseService, LicenseStatus } from '../services/license.service';

export type { LicenseData, LicenseStatus } from '../services/license.service';

interface LicenseState {
  deviceCode: string | null;
  status: LicenseStatus;
  installedAt: string | null;
  trialEndsAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  licenseKey: string | null;
  hasLifetime: boolean;

  // Actions
  loadFromStorage: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  activateLicense: (licenseKey: string) => Promise<'ok' | 'device_mismatch' | 'invalid' | 'expired'>;

  // Permission helpers (computed from status)
  canUseBasicFeatures: () => boolean;
  canCreateTransaction: () => boolean;
  canManageProducts: () => boolean;
  canManageStock: () => boolean;
  canExportReport: () => boolean;
  canUsePremiumFeatures: () => boolean;
  isReadOnlyMode: () => boolean;
  isTrialExpired: () => boolean;
}

const VALID_STATUSES: LicenseStatus[] = [
  'trial_active',
  'trial_expired',
  'lifetime',
  'premium_active',
  'premium_expired',
];

function isDateString(v: unknown): v is string {
  return typeof v === 'string' && Number.isFinite(new Date(v).getTime());
}

function parseStoredLicense(raw: string | null): LicenseData | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<LicenseData>;
    if (
      typeof v.deviceCode !== 'string' ||
      !LicenseService.isValidDeviceCode(v.deviceCode) ||
      !v.status ||
      !VALID_STATUSES.includes(v.status) ||
      !isDateString(v.installedAt) ||
      !isDateString(v.trialEndsAt)
    ) {
      return null;
    }
    return {
      deviceCode: v.deviceCode.toUpperCase(),
      status: v.status,
      installedAt: v.installedAt,
      trialEndsAt: v.trialEndsAt,
      activatedAt: isDateString(v.activatedAt) ? v.activatedAt : null,
      expiresAt: isDateString(v.expiresAt) ? v.expiresAt : null,
      licenseKey: typeof v.licenseKey === 'string' ? v.licenseKey : null,
      hasLifetime: v.hasLifetime === true,
    };
  } catch {
    return null;
  }
}

async function saveLicense(data: LicenseData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.LICENSE_DATA, JSON.stringify(data));
}

function toState(data: LicenseData) {
  return {
    deviceCode: data.deviceCode,
    status: data.status,
    installedAt: data.installedAt,
    trialEndsAt: data.trialEndsAt,
    activatedAt: data.activatedAt,
    expiresAt: data.expiresAt,
    licenseKey: data.licenseKey,
    hasLifetime: data.hasLifetime,
  };
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  deviceCode: null,
  status: 'trial_active',
  installedAt: null,
  trialEndsAt: null,
  activatedAt: null,
  expiresAt: null,
  licenseKey: null,
  hasLifetime: false,

  loadFromStorage: async () => {
    const stored = parseStoredLicense(
      await AsyncStorage.getItem(STORAGE_KEYS.LICENSE_DATA)
    );
    const data = stored ?? LicenseService.createTrialLicense();
    data.status = LicenseService.resolveStatus(data);
    await saveLicense(data);
    set(toState(data));
  },

  refreshStatus: async () => {
    const s = get();
    if (!s.deviceCode || !s.installedAt || !s.trialEndsAt) return;
    const data: LicenseData = {
      deviceCode: s.deviceCode,
      status: s.status,
      installedAt: s.installedAt,
      trialEndsAt: s.trialEndsAt,
      activatedAt: s.activatedAt,
      expiresAt: s.expiresAt,
      licenseKey: s.licenseKey,
      hasLifetime: s.hasLifetime,
    };
    const status = LicenseService.resolveStatus(data);
    if (status === s.status) return;
    data.status = status;
    await saveLicense(data);
    set({ status });
  },

  activateLicense: async (licenseKey) => {
    if (!get().deviceCode) await get().loadFromStorage();
    const s = get();
    if (!s.deviceCode || !s.installedAt || !s.trialEndsAt) return 'invalid';

    const result = LicenseService.validateLicenseKey(licenseKey, s.deviceCode);
    if (!result.valid) {
      if (result.reason === 'device_mismatch') return 'device_mismatch';
      if (result.reason === 'expired') return 'expired';
      return 'invalid';
    }

    const data: LicenseData = {
      deviceCode: s.deviceCode,
      status: result.status,
      installedAt: s.installedAt,
      trialEndsAt: s.trialEndsAt,
      activatedAt: new Date().toISOString(),
      expiresAt: result.expiresAt,
      licenseKey: result.licenseKey,
      hasLifetime: result.status === 'lifetime' ? true : s.hasLifetime,
    };
    data.status = LicenseService.resolveStatus(data);
    await saveLicense(data);
    set(toState(data));
    return 'ok';
  },

  // ─── Permission helpers ───────────────────────────────────────────────────
  canUseBasicFeatures: () => LicenseService.canUseBasicFeatures(get().status),
  canCreateTransaction: () => LicenseService.canCreateTransaction(get().status),
  canManageProducts: () => LicenseService.canManageProducts(get().status),
  canManageStock: () => LicenseService.canManageStock(get().status),
  canExportReport: () => LicenseService.canExportReport(get().status),
  canUsePremiumFeatures: () => LicenseService.canUsePremiumFeatures(get().status),
  isReadOnlyMode: () => LicenseService.isReadOnlyMode(get().status),
  isTrialExpired: () => LicenseService.isTrialExpired(get().status),
}));
