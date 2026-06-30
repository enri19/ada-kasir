export type LicenseStatus = 'trial' | 'lifetime' | 'premium' | 'expired';

export interface LicenseData {
  deviceCode: string;
  status: LicenseStatus;
  installedAt: string;
  trialEndsAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  licenseKey: string | null;
}

export type LicenseValidationResult =
  | {
      valid: true;
      status: 'lifetime' | 'premium';
      licenseKey: string;
      expiresAt: string | null;
    }
  | { valid: false };

const DEVICE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEVICE_CODE_PATTERN = /^WRG-([A-Z0-9]{4})-([A-Z0-9]{4})$/;
const LIFETIME_KEY_PATTERN = /^WRG-LIFE-([A-Z0-9]{4})-(\d{4})$/;
const PREMIUM_KEY_PATTERN = /^WRG-PREM-([A-Z0-9]{4})-(\d{8})$/;
const TRIAL_DAYS = 14;

function generateSegment(): string {
  let result = '';
  for (let index = 0; index < 4; index += 1) {
    result += DEVICE_CHARACTERS[Math.floor(Math.random() * DEVICE_CHARACTERS.length)];
  }
  return result;
}

function addTrialPeriod(installedAt: Date): Date {
  return new Date(installedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

function parsePremiumExpiry(value: string): Date | null {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const expiry = new Date(year, month - 1, day, 23, 59, 59, 999);

  if (
    expiry.getFullYear() !== year ||
    expiry.getMonth() !== month - 1 ||
    expiry.getDate() !== day
  ) {
    return null;
  }

  return expiry;
}

export const LicenseService = {
  generateDeviceCode(): string {
    return `WRG-${generateSegment()}-${generateSegment()}`;
  },

  isValidDeviceCode(deviceCode: string): boolean {
    return DEVICE_CODE_PATTERN.test(deviceCode.trim().toUpperCase());
  },

  createTrialLicense(now = new Date()): LicenseData {
    return {
      deviceCode: this.generateDeviceCode(),
      status: 'trial',
      installedAt: now.toISOString(),
      trialEndsAt: addTrialPeriod(now).toISOString(),
      activatedAt: null,
      expiresAt: null,
      licenseKey: null,
    };
  },

  validateLicenseKey(licenseKey: string, deviceCode: string): LicenseValidationResult {
    const normalizedKey = licenseKey.trim().toUpperCase();
    const normalizedDeviceCode = deviceCode.trim().toUpperCase();
    const deviceMatch = normalizedDeviceCode.match(DEVICE_CODE_PATTERN);

    if (!deviceMatch) return { valid: false };

    const deviceIdentifier = deviceMatch[1];
    const lifetimeMatch = normalizedKey.match(LIFETIME_KEY_PATTERN);
    if (lifetimeMatch) {
      if (lifetimeMatch[1] !== deviceIdentifier) return { valid: false };
      return {
        valid: true,
        status: 'lifetime',
        licenseKey: normalizedKey,
        expiresAt: null,
      };
    }

    const premiumMatch = normalizedKey.match(PREMIUM_KEY_PATTERN);
    if (premiumMatch) {
      if (premiumMatch[1] !== deviceIdentifier) return { valid: false };
      const expiry = parsePremiumExpiry(premiumMatch[2]);
      if (!expiry) return { valid: false };

      return {
        valid: true,
        status: 'premium',
        licenseKey: normalizedKey,
        expiresAt: expiry.toISOString(),
      };
    }

    return { valid: false };
  },

  resolveStatus(data: LicenseData, now = new Date()): LicenseStatus {
    if (data.status === 'lifetime' || data.licenseKey?.startsWith('WRG-LIFE-')) {
      return 'lifetime';
    }

    if (data.status === 'premium' || data.licenseKey?.startsWith('WRG-PREM-')) {
      const expiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : Number.NaN;
      return Number.isFinite(expiresAt) && expiresAt >= now.getTime() ? 'premium' : 'expired';
    }

    const trialEndsAt = new Date(data.trialEndsAt).getTime();
    return Number.isFinite(trialEndsAt) && trialEndsAt >= now.getTime() ? 'trial' : 'expired';
  },
};
