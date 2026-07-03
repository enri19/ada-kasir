import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { PremiumAccountService, PremiumLoginInput } from '../services/premium-account.service';
import { getSupabaseClient } from '../services/supabase.client';
import { useLicenseStore } from '../stores/license.store';
import { CustomerRepository } from '../database/customer.repo';
import { ProductRepository } from '../database/product.repo';
import { StoreRepository } from '../database/store.repo';

type RestoreState =
  | 'idle'
  | 'checking_backup'
  | 'backup_found'
  | 'confirm_overwrite'
  | 'restoring'
  | 'restore_done'
  | 'restore_failed'
  | 'no_backup';

interface BackupInfo {
  id: string;
  createdAt: string;
  recordCounts: Record<string, number>;
  storeName?: string;
}

export function usePremiumLogin() {
  const [loginLoading, setLoginLoading] = useState(false);
  const [restoreState, setRestoreState] = useState<RestoreState>('idle');
  const [restoreMessage, setRestoreMessage] = useState('');
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [currentPhoneOrEmail, setCurrentPhoneOrEmail] = useState('');

  const setPremiumAccount = useLicenseStore((s) => s.setPremiumAccount);

  const checkBackupAfterLogin = useCallback(async (phoneOrEmail: string) => {
    setRestoreState('checking_backup');
    setCurrentPhoneOrEmail(phoneOrEmail);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setRestoreState('no_backup');
        return;
      }

      const { data, error } = await supabase.rpc('get_premium_backups', {
        p_email_or_phone: phoneOrEmail,
      });

      if (error || !data) {
        setRestoreState('no_backup');
        return;
      }

      const result = data as {
        found: boolean;
        backups: Array<{
          id: string;
          created_at: string;
          store_name?: string;
          record_counts: Record<string, number>;
        }>;
      };

      if (!result.found || !result.backups || result.backups.length === 0) {
        setRestoreState('no_backup');
        return;
      }

      const latest = result.backups[0];

      setBackupInfo({
        id: latest.id,
        createdAt: latest.created_at,
        recordCounts: latest.record_counts || {},
        storeName: latest.store_name,
      });

      // Cek apakah data lokal kosong
      const hasLocalData = await checkLocalData();

      if (hasLocalData) {
        setRestoreState('confirm_overwrite');
        setRestoreMessage(
          'Restore akan mengganti data lokal di perangkat ini dengan data dari backup cloud. Pastikan Anda ingin melanjutkan.'
        );
      } else {
        setRestoreState('backup_found');
        setRestoreMessage(
          'Backup ditemukan. Pulihkan data toko Anda sekarang?'
        );
      }
    } catch {
      setRestoreState('no_backup');
    }
  }, []);

  const executeRestore = useCallback(async () => {
    setRestoreLoading(true);
    setRestoreState('restoring');
    try {
      // Gunakan BackupService yang sudah ada — ini membutuhkan login Supabase Auth
      // Untuk Premium Account via email, kita perlu login dulu ke Supabase
      const { signIn } = await import('../services/supabase.client');
      const { BackupService } = await import('../services/backup.service');

      // Cari tahu email dari Premium Account yang login
      const account = await PremiumAccountService.getStoredAccount();
      const email = account?.email || currentPhoneOrEmail;

      // Coba login ke Supabase dengan email (password default untuk premium users)
      // Catatan: Ini membutuhkan user Supabase yang sudah dibuat untuk email ini
      // Jika belum ada, backup/restore akan gagal dan user bisa backup manual setelah login
      const loginResult = await signIn(email, 'premium_default');
      if (loginResult.error) {
        // Jika gagal login Supabase, restore tidak bisa dilakukan via service existing
        // Tapi kita bisa kasih tahu user untuk login cloud dulu
        setRestoreState('restore_failed');
        setRestoreMessage(
          'Restore membutuhkan login akun cloud. Silakan login di Pengaturan > Cadangan Data Cloud, lalu coba restore kembali.'
        );
        setRestoreLoading(false);
        return;
      }

      await BackupService.restoreFromCloud();
      setRestoreState('restore_done');
    } catch (error: any) {
      setRestoreState('restore_failed');
      setRestoreMessage(error?.message || 'Data belum berhasil dipulihkan.');
    } finally {
      setRestoreLoading(false);
    }
  }, [currentPhoneOrEmail]);

  const skipRestore = useCallback(() => {
    setRestoreState('idle');
    setBackupInfo(null);
  }, []);

  const resetRestore = useCallback(() => {
    setRestoreState('idle');
    setBackupInfo(null);
    setRestoreMessage('');
    setRestoreLoading(false);
  }, []);

  const login = useCallback(
    async (input: PremiumLoginInput) => {
      setLoginLoading(true);
      try {
        const result = await PremiumAccountService.login(input);
        if (!result.success) {
          return result;
        }

        // Login sukses — simpan Premium Account
        await setPremiumAccount({
          accountId: result.accountId!,
          name: result.name!,
          phone: result.phone!,
          email: result.email!,
          premiumExpiresAt: result.premiumExpiresAt!,
        });

        // Cek backup cloud via RPC (tidak perlu Supabase Auth)
        await checkBackupAfterLogin(input.phoneOrEmail.trim());

        return result;
      } finally {
        setLoginLoading(false);
      }
    },
    [setPremiumAccount, checkBackupAfterLogin]
  );

  return {
    /** Panggil untuk login Premium */
    login,
    loginLoading,
    /** State restore */
    restoreState,
    restoreMessage,
    backupInfo,
    restoreLoading,
    executeRestore,
    skipRestore,
    resetRestore,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function checkLocalData(): Promise<boolean> {
  try {
    const products = await ProductRepository.getAll();
    const customers = await CustomerRepository.getAll();
    const activeStore = await StoreRepository.getActiveStore();
    return products.length > 0 || customers.length > 0 || activeStore !== null;
  } catch {
    return false;
  }
}
