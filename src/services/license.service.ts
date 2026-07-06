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

export type ActivationResult =
  | 'ok'
  | 'device_mismatch'
  | 'invalid'
  | 'expired'
  | 'no_internet';

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

  // ─── Premium Account fields ────────────────────────────────────────────
  /**
   * Sumber aktivasi:
   * - "trial" — trial default
   * - "local_device" — aktivasi via kode (Lifetime/Premium manual)
   * - "manual_fallback" — ADK-PREM-XXXX fallback
   * - "account" — login Premium Account
   */
  source?: 'trial' | 'local_device' | 'manual_fallback' | 'account';
  /** Premium Account ID (dari login) */
  premiumAccountId?: string | null;
  /** Email Premium Account */
  premiumEmail?: string | null;
  /** Nomor HP Premium Account */
  premiumPhone?: string | null;
  /** Nama pemilik Premium Account */
  premiumName?: string | null;
  /** Kapan terakhir dicek status Premium */
  lastPremiumCheckAt?: string | null;
  /** Kapan terakhir backup cloud */
  lastBackupAt?: string | null;
  /** Apakah ada backup cloud yang tersedia */
  hasCloudBackup?: boolean;
  /** Tanggal kedaluwarsa Premium (mirror expiresAt untuk mencegah mismatch) */
  premiumExpiresAt?: string | null;
  /** Apakah login via Premium Account (bukan manual fallback) */
  isPremiumAccountLogin?: boolean;

  // ─── Cloud Account fields ─────────────────────────────────────────
  /** User ID dari Supabase Auth session */
  cloudUserId?: string | null;
  /** Email akun cloud */
  cloudEmail?: string | null;
  /** Status login cloud */
  isCloudLoggedIn?: boolean;
  /** Kapan terakhir login cloud */
  lastCloudLoginAt?: string | null;
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
const LIFETIME_KEY_PATTERN = /^ADK-LIFE-([A-Z0-9]{4})-(\d{4})-([A-Z0-9]{8})$/;
const PREMIUM_KEY_PATTERN = /^ADK-PREM-([A-Z0-9]{4})-(\d{8})-([A-Z0-9]{8})$/;
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
      premiumExpiresAt: null,
    };
  },

  validateLicenseKey(licenseKey: string, deviceCode: string): LicenseValidationResult {
    // Fallback offline validation — format-only, no HMAC check
    return this.validateLicenseKeyOffline(licenseKey, deviceCode);
  },

  /** Validasi online via Supabase RPC: verifikasi HMAC, expired, device token */
  async validateOnlineLicenseKey(
    licenseKey: string,
    deviceCode: string,
    supabaseClient: any,
  ): Promise<LicenseValidationResult> {
    try {
      const { data, error } = await supabaseClient.rpc('verify_license', {
        p_license_code: licenseKey.trim().toUpperCase(),
        p_device_code: deviceCode.trim().toUpperCase(),
      });
      if (error) return { valid: false, reason: 'invalid_format' };
      if (!data || !data.valid) {
        const reason = data?.reason || 'invalid_format';
        if (reason === 'device_mismatch') return { valid: false, reason: 'device_mismatch' };
        if (reason === 'expired') return { valid: false, reason: 'expired' };
        return { valid: false, reason: 'invalid_format' };
      }
      return {
        valid: true,
        status: data.status,
        licenseKey: licenseKey.trim().toUpperCase(),
        expiresAt: data.expires_at || null,
      };
    } catch {
      return { valid: false, reason: 'invalid_format' };
    }
  },

  /** Validasi offline: cocokkan pola & token perangkat (format-only, tanpa HMAC) */
  validateLicenseKeyOffline(licenseKey: string, deviceCode: string): LicenseValidationResult {
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

    // Util: cek expiry valid
    const checkExpiry = (exp: string | null | undefined): boolean => {
      if (!exp) return false;
      const ms = new Date(exp).getTime();
      return Number.isFinite(ms) && ms >= nowMs;
    };

    // Priority 1: Lifetime tidak pernah expired
    if (data.hasLifetime || data.licenseKey?.startsWith('ADK-LIFE-')) {
      // Jika ada premium aktif (expired belum habis), tetap premium_active
      const exp = data.premiumExpiresAt ?? data.expiresAt;
      if (checkExpiry(exp)) return 'premium_active';
      return 'lifetime'; // Lifetime tetap lifetime, tidak pernah expired
    }

    // Priority 2: Premium Account login / manual fallback
    if (data.source === 'account' || data.source === 'manual_fallback') {
      const exp = data.premiumExpiresAt ?? data.expiresAt;
      if (checkExpiry(exp)) return 'premium_active';
      // Premium expired — tidak ada fallback ke lifetime karena tidak ada hasLifetime
      return 'premium_expired';
    }

    // Priority 3: Trial
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

  /** Export Excel / PDF — Premium only */
  canExportReport(status: LicenseStatus): boolean {
    return status === 'premium_active';
  },

  /** Fitur Premium khusus — Premium only */
  canUsePremiumFeatures(status: LicenseStatus): boolean {
    return status === 'premium_active';
  },

  /** Helper: Premium aktif — hanya premium_active */
  isPremiumAccess(status: LicenseStatus | null | undefined): boolean {
    return status === 'premium_active';
  },

  /** Lifetime aktif */
  isLifetime(status: LicenseStatus): boolean {
    return status === 'lifetime';
  },

  /** App usable (tidak read-only) */
  isAppUsable(status: LicenseStatus): boolean {
    return status === 'trial_active' || status === 'premium_active' || status === 'lifetime';
  },

  /** Mode read-only: data bisa dilihat tapi tidak bisa diubah */
  isReadOnlyMode(status: LicenseStatus): boolean {
    return status === 'trial_expired';
  },

  /** Shortcut cek trial expired */
  isTrialExpired(status: LicenseStatus): boolean {
    return status === 'trial_expired';
  },

  /** Cloud backup tersedia — Premium only + sudah login cloud */
  canUseCloudBackup(data: { status: LicenseStatus; isCloudLoggedIn: boolean; cloudUserId: string | null | undefined }): boolean {
    return data.status === 'premium_active' &&
      data.isCloudLoggedIn === true &&
      Boolean(data.cloudUserId);
  },

  /** Restore cloud — Premium only */
  canRestoreCloudBackup(data: { status: LicenseStatus; isCloudLoggedIn: boolean; cloudUserId: string | null | undefined }): boolean {
    return this.canUseCloudBackup(data);
  },

  // ─── WhatsApp message builders ──────────────────────────────────────────────

  /**
   * Pesan aktivasi Lifetime / trial-expired → hubungi admin.
   * Menerima Store agar semua data terkirim lengkap.
   */
  buildActivationMessage(
    storeName: string,
    deviceCode: string,
    ownerName?: string,
    phone?: string,
  ): string {
    const lines = [
      'Halo Admin AdaKasir, saya ingin aktivasi lisensi.',
      '',
      'Data lengkap toko:',
      '',
      `Nama Pemilik: ${ownerName || '-'}`,
      `Nama Toko: ${storeName}`,
      `No. Telepon: ${phone || '-'}`,
      `Kode Perangkat: ${deviceCode}`,
      'Paket: Lifetime',
      '',
      'Mohon dibuatkan kode lisensi. Terima kasih.',
    ];
    return lines.join('\n');
  },

  /**
   * Pesan upgrade Premium → hubungi admin.
   * Menerima Store agar semua data terkirim lengkap.
   */
  buildPremiumMessage(
    storeName: string,
    deviceCode: string,
    plan: string = 'Premium',
    ownerName?: string,
    phone?: string,
  ): string {
    const lines = [
      'Halo Admin AdaKasir, saya ingin mengaktifkan Premium.',
      '',
      'Data lengkap toko:',
      '',
      `Nama Pemilik: ${ownerName || '-'}`,
      `Nama Toko: ${storeName}`,
      `No. Telepon: ${phone || '-'}`,
      `Kode Perangkat: ${deviceCode}`,
      `Paket: ${plan}`,
      '',
      'Mohon dibuatkan kode lisensi. Terima kasih.',
    ];
    return lines.join('\n');
  },
};
