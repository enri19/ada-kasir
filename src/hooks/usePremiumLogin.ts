import { useState, useCallback } from 'react';
import { PremiumAccountService, PremiumLoginInput } from '../services/premium-account.service';
import { getSupabaseClient } from '../services/supabase.client';
import { BackupService } from '../services/backup.service';
import { useLicenseStore } from '../stores/license.store';
import { CustomerRepository } from '../database/customer.repo';
import { ProductRepository } from '../database/product.repo';
import { StoreRepository } from '../database/store.repo';
import { BackupData } from '../types/backup';

// ─── Normalizers ─────────────────────────────────────────────────────────────

function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  let p = value.trim().replace(/[\s\-()+]/g, '');
  if (p.startsWith('0')) p = '62' + p.slice(1);
  else if (p.startsWith('8')) p = '62' + p;
  return p || null;
}

function normalizeEmail(value?: string | null): string | null {
  if (!value) return null;
  const e = value.trim().toLowerCase();
  return e || null;
}

// ─── RPC helper ──────────────────────────────────────────────────────────────

async function fetchBackupByKey(supabase: any, key: string): Promise<{
  backupData: BackupData;
  storeName?: string;
} | null> {
  try {
    const { data, error } = await supabase.rpc('premium_restore_get_backup', {
      p_email_or_phone: key,
    });
    if (error || !data) return null;
    const result = data as { found: boolean; backup_data?: BackupData; store_name?: string };
    if (!result.found || !result.backup_data) return null;
    return { backupData: result.backup_data, storeName: result.store_name };
  } catch {
    return null;
  }
}

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

  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress>({
    visible: false,
    step: '',
    percent: null,
    detail: '',
  });

  const setPremiumAccount = useLicenseStore((s) => s.setPremiumAccount);

  const checkBackupAfterLogin = useCallback(async (input: {
    accountId?: string | null;
    email?: string | null;
    phone?: string | null;
    rawInput?: string | null;
  }) => {
    setRestoreState('checking_backup');

    const candidates = [
      normalizePhone(input.phone),
      normalizeEmail(input.email),
      input.accountId?.trim() || null,
      input.rawInput?.trim() || null,
    ];
    const lookupKeys = candidates.filter((v, i, arr): v is string =>
      Boolean(v) && arr.indexOf(v) === i
    );

    if (lookupKeys.length === 0) {
      setRestoreState('no_backup');
      setRestoreMessage('Belum ada backup data yang ditemukan untuk akun Premium ini.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setRestoreState('no_backup');
      setRestoreMessage('Cloud backup belum dikonfigurasi.');
      return;
    }

    let rpcError = false;
    for (const key of lookupKeys) {
      try {
        const found = await fetchBackupByKey(supabase, key);

        if (found) {
          const { backupData, storeName } = found;
          setLatestBackupData(backupData);
          setBackupInfo({
            id: 'premium_backup',
            createdAt: backupData.createdAt,
            recordCounts: backupData.recordCounts || {},
            storeName,
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
          return;
        }
      } catch {
        rpcError = true;
      }
    }

    if (rpcError) {
      setRestoreState('no_backup');
      setRestoreMessage('Gagal mengecek backup. Periksa koneksi internet lalu coba lagi.');
    } else {
      setRestoreState('no_backup');
      setRestoreMessage('Belum ada backup data yang ditemukan untuk akun Premium ini.');
    }
  }, []);

  const executeRestore = useCallback(async () => {
    if (!latestBackupData || isRestoring) return;

    setIsRestoring(true);
    setRestoreState('restoring');

    setRestoreProgress({
      visible: true,
      step: 'Menyiapkan restore...',
      percent: 5,
      detail: 'Mohon tunggu sebentar.',
    });

    try {
      await BackupService.restoreFromData(latestBackupData, (progress) => {
        setRestoreProgress({
          visible: true,
          ...progress,
        });
      });

      const activeStore = await StoreRepository.getActiveStore();
      const { useAppStore } = await import('../stores/app.store');
      if (activeStore) {
        useAppStore.getState().setActiveStore(activeStore);
      }
      useAppStore.getState().setIsOnboardingComplete(true);

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

        await checkBackupAfterLogin({
          accountId: result.accountId,
          email: result.email,
          phone: result.phone,
          rawInput: input.phoneOrEmail,
        });

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
    checkBackupAfterLogin,
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
