// ─── Status Types ────────────────────────────────────────────────────────────
// trial_active   : dalam masa trial 14 hari
// trial_expired  : trial habis, mode read-only
// lifetime       : Lifetime Basic aktif selamanya
// premium_active : Premium aktif (belum expired)
// premium_expired: Premium habis; Basic aktif jika punya Lifetime, else read-only

export type LicenseStatus =
  | 'trial_active'
  | 'trial_expired'
  | 'lifetime'
  | 'premium_active'
  | 'premium_expired';

export interface LicenseData {
  deviceCode: string;
  status: LicenseStatus;
  installedAt: string;
  trialEndsAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  licenseKey: string | null;
  /** true jika user pernah aktivasi Lifetime (dipakai saat premium_expired) */
  hasLifetime: boolean;
}

export type LicenseValidationResult =
  | {
      valid: true;
      status: 'lifetime' | 'premium_active';
      licenseKey: string;
      expiresAt: string | null;
    }
  | { valid: false; reason: 'device_mismatch' | 'invalid_format' | 'expired' };

// ─── Constants ───────────────────────────────────────────────────────────────

const DEVICE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEVICE_CODE_PATTERN = /^ADK-([A-Z0-9]{4})-([A-Z0-9]{4})$/;
const LIFETIME_KEY_PATTERN = /^ADK-LIFE-([A-Z0-9]{4})-(\d{4})$/;
const PREMIUM_KEY_PATTERN = /^ADK-PREM-([A-Z0-9]{4})-(\d{8})$/;
const TRIAL_DAYS = 14;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function generateSegment(): string {
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += DEVICE_CHARACTERS[Math.floor(Math.random() * DEVICE_CHARACTERS.length)];
  }
  return result;
}

function addTrialPeriod(from: Date): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

function parsePremiumExpiry(value: string): Date | null {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const d = new Date(year, month - 1, day, 23, 59, 59, 999);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

/** Ambil token perangkat (bagian tengah deviceCode, misal ADK-8F3K-29XA → "8F3K") */
function extractDeviceToken(deviceCode: string): string | null {
  const match = deviceCode.trim().toUpperCase().match(DEVICE_CODE_PATTERN);
  return match ? match[1] : null;
}

// ─── LicenseService ───────────────────────────────────────────────────────────

export const LicenseService = {
  generateDeviceCode(): string {
    return `ADK-${generateSegment()}-${generateSegment()}`;
  },

  isValidDeviceCode(deviceCode: string): boolean {
    return DEVICE_CODE_PATTERN.test(deviceCode.trim().toUpperCase());
  },

  createTrialLicense(now = new Date()): LicenseData {
    return {
      deviceCode: this.generateDeviceCode(),
      status: 'trial_active',
      installedAt: now.toISOString(),
      trialEndsAt: addTrialPeriod(now).toISOString(),
      activatedAt: null,
      expiresAt: null,
      licenseKey: null,
      hasLifetime: false,
    };
  },

  validateLicenseKey(licenseKey: string, deviceCode: string): LicenseValidationResult {
    const key = licenseKey.trim().toUpperCase();
    const deviceToken = extractDeviceToken(deviceCode);
    if (!deviceToken) return { valid: false, reason: 'invalid_format' };

    const lifetimeMatch = key.match(LIFETIME_KEY_PATTERN);
    if (lifetimeMatch) {
      if (lifetimeMatch[1] !== deviceToken) return { valid: false, reason: 'device_mismatch' };
      return { valid: true, status: 'lifetime', licenseKey: key, expiresAt: null };
    }

    const premiumMatch = key.match(PREMIUM_KEY_PATTERN);
    if (premiumMatch) {
      if (premiumMatch[1] !== deviceToken) return { valid: false, reason: 'device_mismatch' };
      const expiry = parsePremiumExpiry(premiumMatch[2]);
      if (!expiry) return { valid: false, reason: 'invalid_format' };
      if (expiry.getTime() < Date.now()) return { valid: false, reason: 'expired' };
      return {
        valid: true,
        status: 'premium_active',
        licenseKey: key,
        expiresAt: expiry.toISOString(),
      };
    }

    return { valid: false, reason: 'invalid_format' };
  },

  /**
   * Hitung status aktual berdasarkan data tersimpan + waktu sekarang.
   * Dipanggil setiap kali app dibuka / resume.
   */
  resolveStatus(data: LicenseData, now = new Date()): LicenseStatus {
    const nowMs = now.getTime();

    // Lifetime tidak pernah expired
    if (data.hasLifetime || data.licenseKey?.startsWith('ADK-LIFE-')) {
      // Cek apakah ada Premium aktif di atasnya
      if (data.licenseKey?.startsWith('ADK-PREM-') && data.expiresAt) {
        const premExpiry = new Date(data.expiresAt).getTime();
        if (Number.isFinite(premExpiry) && premExpiry >= nowMs) return 'premium_active';
        return 'lifetime'; // Premium expired, fallback ke Lifetime
      }
      return 'lifetime';
    }

    // Premium tanpa Lifetime
    if (data.licenseKey?.startsWith('ADK-PREM-')) {
      const premExpiry = data.expiresAt ? new Date(data.expiresAt).getTime() : NaN;
      if (Number.isFinite(premExpiry) && premExpiry >= nowMs) return 'premium_active';
      return 'premium_expired';
    }

    // Trial
    const trialExpiry = new Date(data.trialEndsAt).getTime();
    if (Number.isFinite(trialExpiry) && trialExpiry >= nowMs) return 'trial_active';
    return 'trial_expired';
  },

  // ─── Permission helpers ─────────────────────────────────────────────────────

  /** Basic features aktif (kasir, produk, stok, laporan, dll) */
  canUseBasicFeatures(status: LicenseStatus): boolean {
    return status === 'trial_active' || status === 'lifetime' || status === 'premium_active';
  },

  /** Boleh membuat transaksi baru */
  canCreateTransaction(status: LicenseStatus): boolean {
    return this.canUseBasicFeatures(status);
  },

  /** Boleh tambah / edit / hapus produk */
  canManageProducts(status: LicenseStatus): boolean {
    return this.canUseBasicFeatures(status);
  },

  /** Boleh tambah / koreksi stok */
  canManageStock(status: LicenseStatus): boolean {
    return this.canUseBasicFeatures(status);
  },

  /** Boleh export Excel / PDF — hanya Premium */
  canExportReport(status: LicenseStatus): boolean {
    return status === 'premium_active';
  },

  /** Fitur Premium aktif */
  canUsePremiumFeatures(status: LicenseStatus): boolean {
    return status === 'premium_active';
  },

  /** Mode read-only: data bisa dilihat tapi tidak bisa diubah */
  isReadOnlyMode(status: LicenseStatus): boolean {
    return status === 'trial_expired' || status === 'premium_expired';
  },

  /** Shortcut cek trial expired */
  isTrialExpired(status: LicenseStatus): boolean {
    return status === 'trial_expired';
  },

  // ─── WhatsApp message builders ──────────────────────────────────────────────

  buildActivationMessage(storeName: string, deviceCode: string): string {
    return (
      `Halo Admin AdaKasir, saya ingin aktivasi lisensi.\n\n` +
      `Nama Warung: ${storeName}\n` +
      `Kode Perangkat: ${deviceCode}\n` +
      `Paket: Lifetime`
    );
  },

  buildPremiumMessage(storeName: string, deviceCode: string): string {
    return (
      `Halo Admin AdaKasir, saya ingin mengaktifkan Premium.\n\n` +
      `Nama Warung: ${storeName}\n` +
      `Kode Perangkat: ${deviceCode}\n` +
      `Paket: Premium`
    );
  },
};
