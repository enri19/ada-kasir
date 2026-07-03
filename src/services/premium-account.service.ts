import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getSupabaseClient } from './supabase.client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PremiumLoginInput = {
  phoneOrEmail: string;
  pinOrCode?: string;
};

export type PremiumAccountResult = {
  success: boolean;
  accountId?: string;
  name?: string;
  phone?: string;
  email?: string;
  premiumExpiresAt?: string;
  message?: string;
};

export interface PremiumAccountData {
  accountId: string;
  name: string;
  phone: string;
  email: string;
  premiumExpiresAt: string;
  lastBackupAt: string | null;
  hasCloudBackup: boolean;
  lastPremiumCheckAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PREMIUM_STORAGE_KEY = 'premium_account_data';

// ─── Storage helpers ─────────────────────────────────────────────────────────

async function savePremiumAccountData(data: PremiumAccountData): Promise<void> {
  await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(data));
}

async function loadPremiumAccountData(): Promise<PremiumAccountData | null> {
  try {
    const raw = await AsyncStorage.getItem(PREMIUM_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PremiumAccountData;
  } catch {
    return null;
  }
}

async function clearPremiumAccountData(): Promise<void> {
  await AsyncStorage.removeItem(PREMIUM_STORAGE_KEY);
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const PremiumAccountService = {
  /**
   * Login ke akun Premium dengan memeriksa email/nomor HP
   * ke tabel licenses di Supabase melalui RPC check_premium_account.
   *
   * Prasyarat:
   * - Supabase sudah dikonfigurasi (URL + Anon Key)
   * - Tabel licenses sudah ada dan berisi data Premium user
   * - RPC function check_premium_account sudah di-deploy
   */
  async login(input: PremiumLoginInput): Promise<PremiumAccountResult> {
    // Cek koneksi internet
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return {
        success: false,
        message: 'Tidak ada koneksi internet. Periksa jaringan Anda dan coba lagi.',
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        message: 'Cloud belum dikonfigurasi. Periksa Supabase URL dan Anon Key.',
      };
    }

    try {
      const { data, error } = await supabase.rpc('check_premium_account', {
        p_email_or_phone: input.phoneOrEmail.trim(),
      });

      if (error) {
        return {
          success: false,
          message: 'Gagal memeriksa akun Premium. Coba lagi atau hubungi admin AdaKasir.',
        };
      }

      const result = data as {
        found: boolean;
        active?: boolean;
        account_id?: string;
        customer_name?: string;
        store_name?: string;
        phone?: string;
        email?: string;
        plan?: string;
        expired_date?: string | null;
        license_code?: string;
        message?: string;
      };

      if (!result || !result.found) {
        return {
          success: false,
          message: result?.message || 'Email atau nomor HP tidak ditemukan sebagai pelanggan Premium.',
        };
      }

      if (!result.active) {
        return {
          success: false,
          message: result?.message || 'Masa Premium sudah berakhir.',
        };
      }

      // Premium aktif — simpan data
      const premiumExpiresAt = result.expired_date
        ? new Date(result.expired_date + 'T23:59:59Z').toISOString()
        : '';

      const accountData: PremiumAccountData = {
        accountId: result.account_id || '',
        name: result.customer_name || '',
        phone: result.phone || '',
        email: result.email || '',
        premiumExpiresAt,
        lastBackupAt: null,
        hasCloudBackup: false,
        lastPremiumCheckAt: new Date().toISOString(),
      };

      await savePremiumAccountData(accountData);

      return {
        success: true,
        accountId: result.account_id,
        name: result.customer_name || input.phoneOrEmail,
        phone: result.phone || '',
        email: result.email || '',
        premiumExpiresAt,
        message: 'Login Premium berhasil.',
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'Gagal terhubung ke server. Coba lagi atau hubungi admin AdaKasir.',
      };
    }
  },

  /**
   * Mendapatkan data akun Premium yang tersimpan.
   */
  async getStoredAccount(): Promise<PremiumAccountData | null> {
    return loadPremiumAccountData();
  },

  /**
   * Menyimpan data akun Premium setelah login sukses.
   */
  async saveAccount(data: PremiumAccountData): Promise<void> {
    await savePremiumAccountData(data);
  },

  /**
   * Menghapus data akun Premium (logout).
   */
  async clearAccount(): Promise<void> {
    await clearPremiumAccountData();
  },

  /**
   * Memeriksa apakah user sudah login Premium account.
   */
  async isLoggedIn(): Promise<boolean> {
    const data = await loadPremiumAccountData();
    return data !== null;
  },
};
