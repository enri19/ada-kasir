import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import { LicenseData, LicenseService, LicenseStatus, ActivationResult } from '../services/license.service';
import { getSupabaseClient, getSession } from '../services/supabase.client';

export type { LicenseData, LicenseStatus, ActivationResult } from '../services/license.service';

interface LicenseState {
  deviceCode: string | null;
  status: LicenseStatus;
  installedAt: string | null;
  trialEndsAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  licenseKey: string | null;
  hasLifetime: boolean;

  // ─── Premium Account fields (LEGACY — login via email/phone, bukan Supabase Auth) ───
  // @deprecated — Gunakan cloudUserId/cloudEmail untuk identitas cloud via Supabase Auth
  source: 'trial' | 'local_device' | 'manual_fallback' | 'account';
  premiumAccountId: string | null;
  premiumEmail: string | null;
  premiumPhone: string | null;
  premiumName: string | null;
  lastPremiumCheckAt: string | null;
  // Shared fields (dipakai oleh Cloud Account juga)
  lastBackupAt: string | null;
  hasCloudBackup: boolean;
  // @deprecated — Gunakan expiresAt dari verify_license
  premiumExpiresAt: string | null;
  // @deprecated — Gunakan isCloudLoggedIn
  isPremiumAccountLogin: boolean;
  isLicenseLoaded: boolean;

  // Actions
  loadFromStorage: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  activateLicense: (licenseKey: string) => Promise<ActivationResult>;
  // ─── Premium Account (LEGACY — login via email/phone tanpa Supabase Auth) ───
  /**
   * @deprecated LEGACY — Gunakan setCloudAccount untuk Cloud Account via Supabase Auth.
   * Method ini untuk flow login Premium Akun via email/phone ke tabel licenses.
   * Tidak dihapus untuk backward compatibility.
   */
  setPremiumAccount: (data: { accountId: string; name: string; phone: string; email: string; premiumExpiresAt: string }) => Promise<void>;
  /**
   * @deprecated LEGACY — Gunakan clearCloudAccount untuk Cloud Account.
   * Tidak dihapus untuk backward compatibility.
   */
  clearPremiumAccount: () => Promise<void>;

  // Cloud Account fields — separate from license
  cloudUserId: string | null;
  cloudEmail: string | null;
  isCloudLoggedIn: boolean;
  lastCloudLoginAt: string | null;

  // Permission helpers (computed from status)
  canUseBasicFeatures: () => boolean;
  canCreateTransaction: () => boolean;
  canManageProducts: () => boolean;
  canManageStock: () => boolean;
  canExportReport: () => boolean;
  canUsePremiumFeatures: () => boolean;
  isPremiumAccess: () => boolean;
  isLifetime: () => boolean;
  canUseCloudBackup: () => boolean;
  canRestoreCloudBackup: () => boolean;
  isReadOnlyMode: () => boolean;
  isTrialExpired: () => boolean;

  // Actions — cloud
  setCloudAccount: (data: { userId: string; email: string | null }) => void;
  clearCloudAccount: () => void;
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
      source: v.source || 'trial',
      premiumAccountId: typeof v.premiumAccountId === 'string' ? v.premiumAccountId : null,
      premiumEmail: typeof v.premiumEmail === 'string' ? v.premiumEmail : null,
      premiumPhone: typeof v.premiumPhone === 'string' ? v.premiumPhone : null,
      premiumName: typeof v.premiumName === 'string' ? v.premiumName : null,
      lastPremiumCheckAt: typeof v.lastPremiumCheckAt === 'string' ? v.lastPremiumCheckAt : null,
      lastBackupAt: typeof v.lastBackupAt === 'string' ? v.lastBackupAt : null,
      hasCloudBackup: v.hasCloudBackup === true,
      premiumExpiresAt: isDateString(v.premiumExpiresAt) ? v.premiumExpiresAt : null,
      isPremiumAccountLogin: v.isPremiumAccountLogin === true,
      cloudUserId: typeof v.cloudUserId === 'string' ? v.cloudUserId : null,
      cloudEmail: typeof v.cloudEmail === 'string' ? v.cloudEmail : null,
      isCloudLoggedIn: v.isCloudLoggedIn === true,
      lastCloudLoginAt: typeof v.lastCloudLoginAt === 'string' ? v.lastCloudLoginAt : null,
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
    source: data.source || 'trial',
    premiumAccountId: data.premiumAccountId || null,
    premiumEmail: data.premiumEmail || null,
    premiumPhone: data.premiumPhone || null,
    premiumName: data.premiumName || null,
    lastPremiumCheckAt: data.lastPremiumCheckAt || null,
    lastBackupAt: data.lastBackupAt || null,
    hasCloudBackup: data.hasCloudBackup || false,
    premiumExpiresAt: data.premiumExpiresAt || null,
    isPremiumAccountLogin: data.isPremiumAccountLogin === true,
    cloudUserId: data.cloudUserId || null,
    cloudEmail: data.cloudEmail || null,
    isCloudLoggedIn: data.isCloudLoggedIn === true,
    lastCloudLoginAt: data.lastCloudLoginAt || null,
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
  source: 'trial',
  premiumAccountId: null,
  premiumEmail: null,
  premiumPhone: null,
  premiumName: null,
  lastPremiumCheckAt: null,
  lastBackupAt: null,
  hasCloudBackup: false,
  premiumExpiresAt: null,
  isPremiumAccountLogin: false,
  isLicenseLoaded: false,
  cloudUserId: null,
  cloudEmail: null,
  isCloudLoggedIn: false,
  lastCloudLoginAt: null,

  loadFromStorage: async () => {
    try {
      const [licenseRaw, backupMetaRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LICENSE_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.BACKUP_METADATA),
      ]);
      const stored = parseStoredLicense(licenseRaw);
      const data = stored ?? LicenseService.createTrialLicense();
      data.status = LicenseService.resolveStatus(data);
      // Sync lastBackupAt dari BACKUP_METADATA jika store belum punya
      if (!data.lastBackupAt && backupMetaRaw) {
        try {
          const meta = JSON.parse(backupMetaRaw);
          if (meta?.lastBackupAt) data.lastBackupAt = meta.lastBackupAt;
        } catch {}
      }
      // Cloud state hanya valid untuk user Premium
      // Trial/Lifetime user TIDAK BOLEH punya cloud state — paksa clear
      const hasPremiumAccess = data.status === 'premium_active';

      if (hasPremiumAccess && data.isCloudLoggedIn && data.cloudUserId) {
        try {
          const session = await getSession();
          if (session?.user && session.user.id === data.cloudUserId) {
            data.cloudEmail = session.user.email || data.cloudEmail;
            data.isCloudLoggedIn = true;
          } else {
            // Session expired / beda user → clear
            data.cloudUserId = null;
            data.cloudEmail = null;
            data.isCloudLoggedIn = false;
            data.lastCloudLoginAt = null;
          }
        } catch {}
      } else if (!hasPremiumAccess) {
        // Trial / expired — paksa clear cloud state dari data lama
        data.cloudUserId = null;
        data.cloudEmail = null;
        data.isCloudLoggedIn = false;
        data.lastCloudLoginAt = null;
      }
      await saveLicense(data);
      set(toState(data));
    } catch (error) {
      const data = LicenseService.createTrialLicense();
      data.status = LicenseService.resolveStatus(data);
      set(toState(data));
    } finally {
      set({ isLicenseLoaded: true });
    }
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
      source: s.source,
      premiumAccountId: s.premiumAccountId,
      premiumEmail: s.premiumEmail,
      premiumPhone: s.premiumPhone,
      premiumName: s.premiumName,
      lastPremiumCheckAt: s.lastPremiumCheckAt,
      lastBackupAt: s.lastBackupAt,
      hasCloudBackup: s.hasCloudBackup,
      premiumExpiresAt: s.premiumExpiresAt,
      isPremiumAccountLogin: s.isPremiumAccountLogin,
      cloudUserId: s.cloudUserId,
      cloudEmail: s.cloudEmail,
      isCloudLoggedIn: s.isCloudLoggedIn,
      lastCloudLoginAt: s.lastCloudLoginAt,
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

    // Cek koneksi internet — verifikasi lisensi butuh online
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return 'no_internet';

    const supabase = getSupabaseClient();
    if (!supabase) return 'no_internet';

    const result = await LicenseService.validateOnlineLicenseKey(licenseKey, s.deviceCode, supabase);
    if (!result.valid) {
      if (result.reason === 'device_mismatch') return 'device_mismatch';
      if (result.reason === 'expired') return 'expired';
      return 'invalid';
    }

    const source: 'local_device' | 'manual_fallback' =
      result.licenseKey?.startsWith('ADK-PREM-') ? 'manual_fallback' : 'local_device';
    const data: LicenseData = {
      deviceCode: s.deviceCode,
      status: result.status,
      installedAt: s.installedAt,
      trialEndsAt: s.trialEndsAt,
      activatedAt: new Date().toISOString(),
      expiresAt: result.expiresAt,
      licenseKey: result.licenseKey,
      hasLifetime: result.status === 'lifetime' ? true : s.hasLifetime,
      source,
      premiumAccountId: null,
      premiumEmail: null,
      premiumPhone: null,
      premiumName: null,
      lastPremiumCheckAt: null,
      lastBackupAt: null,
      hasCloudBackup: false,
      premiumExpiresAt: result.expiresAt,
      isPremiumAccountLogin: false,
      // Preserve cloud login state
      cloudUserId: s.cloudUserId,
      cloudEmail: s.cloudEmail,
      isCloudLoggedIn: s.isCloudLoggedIn,
      lastCloudLoginAt: s.lastCloudLoginAt,
    };
    data.status = LicenseService.resolveStatus(data);
    await saveLicense(data);
    set(toState(data));
    return 'ok';
  },

  // ─── Premium Account (LEGACY) ───────────────────────────────────────────────

  /**
   * @deprecated LEGACY — Gunakan setCloudAccount untuk Cloud Account via Supabase Auth.
   * Method ini untuk flow login Premium via email/phone ke tabel licenses.
   * Tidak dihapus untuk backward compatibility.
   */
  setPremiumAccount: async (accountData) => {
    const s = get();
    const now = new Date().toISOString();
    const data: LicenseData = {
      deviceCode: s.deviceCode || LicenseService.generateDeviceCode(),
      status: 'premium_active',
      installedAt: s.installedAt || now,
      trialEndsAt: s.trialEndsAt || now,
      activatedAt: s.activatedAt || now,
      expiresAt: accountData.premiumExpiresAt || null,
      premiumExpiresAt: accountData.premiumExpiresAt || null,
      // Jangan hapus licenseKey Lifetime jika sudah punya
      licenseKey: s.licenseKey,
      hasLifetime: s.hasLifetime,
      source: 'account',
      premiumAccountId: accountData.accountId,
      premiumEmail: accountData.email || null,
      premiumPhone: accountData.phone || null,
      premiumName: accountData.name || null,
      lastPremiumCheckAt: now,
      lastBackupAt: s.lastBackupAt || null,
      hasCloudBackup: s.hasCloudBackup || false,
      isPremiumAccountLogin: true,
    };
    await saveLicense(data);
    set(toState(data));
  },

  /**
   * @deprecated LEGACY — Gunakan clearCloudAccount.
   * Tidak dihapus untuk backward compatibility.
   */
  clearPremiumAccount: async () => {
    const s = get();

    // Jika punya manual_fallback Premium yang masih valid, kembali ke manual_fallback
    if (
      s.licenseKey?.startsWith('ADK-PREM-') &&
      s.expiresAt &&
      new Date(s.expiresAt).getTime() > Date.now()
    ) {
      const data: LicenseData = {
        deviceCode: s.deviceCode || LicenseService.generateDeviceCode(),
        status: 'premium_active',
        installedAt: s.installedAt || new Date().toISOString(),
        trialEndsAt: s.trialEndsAt || new Date().toISOString(),
        activatedAt: s.activatedAt || new Date().toISOString(),
        expiresAt: s.expiresAt,
        premiumExpiresAt: s.expiresAt,
        licenseKey: s.licenseKey,
        hasLifetime: false,
        source: 'manual_fallback',
        premiumAccountId: null,
        premiumEmail: null,
        premiumPhone: null,
        premiumName: null,
        lastPremiumCheckAt: null,
        lastBackupAt: null,
        hasCloudBackup: false,
        isPremiumAccountLogin: false,
      };
      await saveLicense(data);
      set(toState(data));
      return;
    }

    // Jika punya Lifetime, kembali ke status lifetime
    if (s.hasLifetime || (s.licenseKey && s.licenseKey.startsWith('ADK-LIFE-'))) {
      const data: LicenseData = {
        deviceCode: s.deviceCode || LicenseService.generateDeviceCode(),
        status: 'lifetime',
        installedAt: s.installedAt || new Date().toISOString(),
        trialEndsAt: s.trialEndsAt || new Date().toISOString(),
        activatedAt: s.activatedAt || new Date().toISOString(),
        expiresAt: null,
        premiumExpiresAt: null,
        licenseKey: s.licenseKey?.startsWith('ADK-LIFE-') ? s.licenseKey : null,
        hasLifetime: true,
        source: 'local_device',
        premiumAccountId: null,
        premiumEmail: null,
        premiumPhone: null,
        premiumName: null,
        lastPremiumCheckAt: null,
        lastBackupAt: null,
        hasCloudBackup: false,
      };
      await saveLicense(data);
      set(toState(data));
      return;
    }

    // Tanpa Lifetime — hitung status trial yang benar
    const trialEndsAt = s.trialEndsAt || LicenseService.createTrialLicense().trialEndsAt;
    const trialExpiry = new Date(trialEndsAt).getTime();
    const trialStatus: LicenseStatus = trialExpiry >= Date.now() ? 'trial_active' : 'trial_expired';

    const data: LicenseData = {
      deviceCode: s.deviceCode || LicenseService.generateDeviceCode(),
      status: trialStatus,
      installedAt: s.installedAt || new Date().toISOString(),
      trialEndsAt: trialEndsAt,
      activatedAt: null,
      expiresAt: null,
      premiumExpiresAt: null,
      licenseKey: null,
      hasLifetime: false,
      source: 'trial',
      premiumAccountId: null,
      premiumEmail: null,
      premiumPhone: null,
      premiumName: null,
      lastPremiumCheckAt: null,
      lastBackupAt: null,
      hasCloudBackup: false,
    };
    await saveLicense(data);
    set(toState(data));
  },

  // ─── Cloud Account ─────────────────────────────────────────────────────

  setCloudAccount: async (data) => {
    const s = get();
    const now = new Date().toISOString();
    const licenseData: LicenseData = {
      deviceCode: s.deviceCode || LicenseService.generateDeviceCode(),
      status: s.status,
      installedAt: s.installedAt || now,
      trialEndsAt: s.trialEndsAt || now,
      activatedAt: s.activatedAt,
      expiresAt: s.expiresAt,
      licenseKey: s.licenseKey,
      hasLifetime: s.hasLifetime,
      source: s.source,
      premiumAccountId: s.premiumAccountId,
      premiumEmail: s.premiumEmail,
      premiumPhone: s.premiumPhone,
      premiumName: s.premiumName,
      lastPremiumCheckAt: s.lastPremiumCheckAt,
      lastBackupAt: s.lastBackupAt,
      hasCloudBackup: s.hasCloudBackup,
      premiumExpiresAt: s.premiumExpiresAt,
      isPremiumAccountLogin: s.isPremiumAccountLogin,
      cloudUserId: data.userId,
      cloudEmail: data.email,
      isCloudLoggedIn: true,
      lastCloudLoginAt: now,
    };
    await saveLicense(licenseData);
    set({
      cloudUserId: data.userId,
      cloudEmail: data.email,
      isCloudLoggedIn: true,
      lastCloudLoginAt: now,
    });
  },

  clearCloudAccount: async () => {
    const s = get();
    const licenseData: LicenseData = {
      deviceCode: s.deviceCode || LicenseService.generateDeviceCode(),
      status: s.status,
      installedAt: s.installedAt || new Date().toISOString(),
      trialEndsAt: s.trialEndsAt || new Date().toISOString(),
      activatedAt: s.activatedAt,
      expiresAt: s.expiresAt,
      licenseKey: s.licenseKey,
      hasLifetime: s.hasLifetime,
      source: s.source,
      premiumAccountId: s.premiumAccountId,
      premiumEmail: s.premiumEmail,
      premiumPhone: s.premiumPhone,
      premiumName: s.premiumName,
      lastPremiumCheckAt: s.lastPremiumCheckAt,
      lastBackupAt: s.lastBackupAt,
      hasCloudBackup: false,
      premiumExpiresAt: s.premiumExpiresAt,
      isPremiumAccountLogin: false,
      cloudUserId: null,
      cloudEmail: null,
      isCloudLoggedIn: false,
      lastCloudLoginAt: null,
    };
    await saveLicense(licenseData);
    set({
      cloudUserId: null,
      cloudEmail: null,
      isCloudLoggedIn: false,
      lastCloudLoginAt: null,
      hasCloudBackup: false,
    });
  },

  // ─── Permission helpers ───────────────────────────────────────────────────
  canUseBasicFeatures: () => LicenseService.canUseBasicFeatures(get().status),
  canCreateTransaction: () => LicenseService.canCreateTransaction(get().status),
  canManageProducts: () => LicenseService.canManageProducts(get().status),
  canManageStock: () => LicenseService.canManageStock(get().status),
  canExportReport: () => LicenseService.canExportReport(get().status),
  canUsePremiumFeatures: () => LicenseService.canUsePremiumFeatures(get().status),
  isPremiumAccess: () => LicenseService.isPremiumAccess(get().status),
  isLifetime: () => LicenseService.isLifetime(get().status),
  canUseCloudBackup: () => {
    const s = get();
    return (
      LicenseService.isPremiumAccess(s.status) &&
      s.isCloudLoggedIn === true &&
      Boolean(s.cloudUserId)
    );
  },
  canRestoreCloudBackup: () => {
    const s = get();
    return (
      LicenseService.isPremiumAccess(s.status) &&
      s.isCloudLoggedIn === true &&
      Boolean(s.cloudUserId)
    );
  },
  isReadOnlyMode: () => LicenseService.isReadOnlyMode(get().status),
  isTrialExpired: () => LicenseService.isTrialExpired(get().status),
}));
