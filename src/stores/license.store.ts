import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import {
  LicenseData,
  LicenseService,
  LicenseStatus,
} from '../services/license.service';

export type { LicenseData, LicenseStatus } from '../services/license.service';

interface LicenseState {
  deviceCode: string | null;
  status: LicenseStatus;
  installedAt: string | null;
  trialEndsAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  licenseKey: string | null;
  loadFromStorage: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  activateLicense: (licenseKey: string) => Promise<boolean>;
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}

function parseStoredLicense(rawValue: string | null): LicenseData | null {
  if (!rawValue) return null;

  try {
    const value = JSON.parse(rawValue) as Partial<LicenseData>;
    const validStatuses: LicenseStatus[] = ['trial', 'lifetime', 'premium', 'expired'];

    if (
      typeof value.deviceCode !== 'string' ||
      !LicenseService.isValidDeviceCode(value.deviceCode) ||
      !value.status ||
      !validStatuses.includes(value.status) ||
      !isDateString(value.installedAt) ||
      !isDateString(value.trialEndsAt)
    ) {
      return null;
    }

    return {
      deviceCode: value.deviceCode.toUpperCase(),
      status: value.status,
      installedAt: value.installedAt,
      trialEndsAt: value.trialEndsAt,
      activatedAt: isDateString(value.activatedAt) ? value.activatedAt : null,
      expiresAt: isDateString(value.expiresAt) ? value.expiresAt : null,
      licenseKey: typeof value.licenseKey === 'string' ? value.licenseKey : null,
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
  };
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  deviceCode: null,
  status: 'trial',
  installedAt: null,
  trialEndsAt: null,
  activatedAt: null,
  expiresAt: null,
  licenseKey: null,

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
    const state = get();
    if (!state.deviceCode || !state.installedAt || !state.trialEndsAt) return;

    const data: LicenseData = {
      deviceCode: state.deviceCode,
      status: state.status,
      installedAt: state.installedAt,
      trialEndsAt: state.trialEndsAt,
      activatedAt: state.activatedAt,
      expiresAt: state.expiresAt,
      licenseKey: state.licenseKey,
    };
    const status = LicenseService.resolveStatus(data);
    if (status === state.status) return;

    data.status = status;
    await saveLicense(data);
    set({ status });
  },

  activateLicense: async (licenseKey) => {
    if (!get().deviceCode) {
      await get().loadFromStorage();
    }

    const state = get();
    if (!state.deviceCode || !state.installedAt || !state.trialEndsAt) return false;

    const validation = LicenseService.validateLicenseKey(licenseKey, state.deviceCode);
    if (!validation.valid) return false;

    const data: LicenseData = {
      deviceCode: state.deviceCode,
      status: validation.status,
      installedAt: state.installedAt,
      trialEndsAt: state.trialEndsAt,
      activatedAt: new Date().toISOString(),
      expiresAt: validation.expiresAt,
      licenseKey: validation.licenseKey,
    };

    data.status = LicenseService.resolveStatus(data);
    await saveLicense(data);
    set(toState(data));
    return true;
  },
}));
