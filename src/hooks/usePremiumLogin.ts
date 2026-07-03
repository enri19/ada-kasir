import { useState, useCallback } from 'react';
import { PremiumAccountService, PremiumLoginInput } from '../services/premium-account.service';
import { getSupabaseClient } from '../services/supabase.client';
import { BackupService } from '../services/backup.service';
import { useLicenseStore } from '../stores/license.store';
import { CustomerRepository } from '../database/customer.repo';
import { ProductRepository } from '../database/product.repo';
import { StoreRepository } from '../database/store.repo';
import { BackupData } from '../types/backup';

export type RestoreState =
  | 'idle'
  | 'checking_backup'
  | 'backup_found'
  | 'confirm_overwrite'
  | 'restoring'
  | 'restore_success'
  | 'restore_error'
  | 'no_backup'
  | 'skipped';

export interface BackupInfo {
  id: string;
  createdAt: string;
  recordCounts: Record<string, number>;
  storeName?: string;
}

export interface RestoreProgress {
  visible: boolean;
  step: string;
  percent?: number | null;
  detail?: string;
}

export function usePremiumLogin() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [restoreState, setRestoreState] = useState<RestoreState>('idle');
  const [restoreMessage, setRestoreMessage] = useState('');
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [latestBackupData, setLatestBackupData] = useState<BackupData | null>(null);
  const [currentPhoneOrEmail, setCurrentPhoneOrEmail] = useState('');

  // Progress modal state
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress>({
    visible: false,
    step: '',
    percent: null,
    detail: '',
  });

  const setPremiumAccount = useLicenseStore((s) => s.setPremiumAccount);

  const checkBackupAfterLogin = useCallback(async (phoneOrEmail: string) => {
    setRestoreState('checking_backup');
    setCurrentPhoneOrEmail(phoneOrEmail);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setRestoreState('no_backup');
        setRestoreMessage('Cloud backup belum dikonfigurasi.');
        return;
      }

      const { data, error } = await supabase.rpc('get_premium_backup_data', {
        p_email_or_phone: phoneOrEmail,
      });

      if (error || !data) {
        setRestoreState('no_backup');
        setRestoreMessage('Belum ada backup data yang ditemukan.');
        return;
      }

      const result = data as {
        found: boolean;
        backup_data?: BackupData;
        store_name?: string;
        message?: string;
      };

      if (!result.found || !result.backup_data) {
        setRestoreState('no_backup');
        setRestoreMessage(result?.message || 'Belum ada backup data yang ditemukan.');
        return;
      }

      const backupData = result.backup_data;
      setLatestBackupData(backupData);

      const recordCounts = backupData.recordCounts || {};

      setBackupInfo({
        id: 'premium_backup',
        createdAt: backupData.createdAt,
        recordCounts,
        storeName: result.store_name,
      });

      const hasLocalData = await checkLocalData();

      if (hasLocalData) {
        setRestoreState('confirm_overwrite');
        setRestoreMessage(
          'Restore akan mengganti data lokal di perangkat ini dengan data dari backup cloud. Pastikan Anda ingin melanjutkan.'
        );
      } else {
        setRestoreState('backup_found');
        setRestoreMessage('Backup ditemukan. Pulihkan data toko Anda sekarang?');
      }
    } catch {
      setRestoreState('no_backup');
      setRestoreMessage('Gagal memeriksa backup. Coba lagi nanti.');
    }
  }, []);

  const executeRestore = useCallback(async () => {
    if (!latestBackupData || isRestoring) return;

    setIsRestoring(true);
    setRestoreState('restoring');

    // Tampilkan modal progress
    setRestoreProgress({
      visible: true,
      step: 'Menyiapkan restore...',
      percent: 5,
      detail: 'Mohon tunggu sebentar.',
    });

    try {
      // Validasi & mulai restore
      await BackupService.restoreFromData(latestBackupData, (progress) => {
        setRestoreProgress({
          visible: true,
          ...progress,
        });
      });

      // Refresh state aplikasi
      const activeStore = await StoreRepository.getActiveStore();
      const { useAppStore } = await import('../stores/app.store');
      if (activeStore) {
        useAppStore.getState().setActiveStore(activeStore);
      }
      useAppStore.getState().setIsOnboardingComplete(true);

      // Sembunyikan progress, tampilkan success
      setRestoreProgress({ visible: false, step: '', percent: null, detail: '' });
      setRestoreState('restore_success');
      setRestoreMessage('Data toko berhasil dipulihkan ke perangkat ini.');
    } catch (error: any) {
      setRestoreProgress({ visible: false, step: '', percent: null, detail: '' });
      setRestoreState('restore_error');
      setRestoreMessage(
        error?.message || 'Data belum berhasil dipulihkan. Coba lagi atau hubungi admin AdaKasir.'
      );
    } finally {
      setIsRestoring(false);
    }
  }, [latestBackupData, isRestoring]);

  const skipRestore = useCallback(() => {
    setRestoreState('skipped');
    setBackupInfo(null);
    setLatestBackupData(null);
  }, []);

  const resetRestoreFlow = useCallback(() => {
    setRestoreState('idle');
    setBackupInfo(null);
    setLatestBackupData(null);
    setRestoreMessage('');
    setIsRestoring(false);
    setRestoreProgress({ visible: false, step: '', percent: null, detail: '' });
  }, []);

  const login = useCallback(
    async (input: PremiumLoginInput) => {
      setIsLoggingIn(true);
      try {
        const result = await PremiumAccountService.login(input);
        if (!result.success) {
          return result;
        }

        await setPremiumAccount({
          accountId: result.accountId!,
          name: result.name!,
          phone: result.phone!,
          email: result.email!,
          premiumExpiresAt: result.premiumExpiresAt!,
        });

        await checkBackupAfterLogin(input.phoneOrEmail.trim());

        return result;
      } finally {
        setIsLoggingIn(false);
      }
    },
    [setPremiumAccount, checkBackupAfterLogin]
  );

  return {
    login,
    isLoggingIn,
    restoreState,
    restoreMessage,
    backupInfo,
    isRestoring,
    executeRestore,
    skipRestore,
    resetRestoreFlow,
    restoreProgress,
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
