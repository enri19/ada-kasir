import { useState, useCallback } from 'react';
import { signIn, signUp, signOut, getUserId, getSession } from '../services/supabase.client';
import { BackupService } from '../services/backup.service';
import { useLicenseStore } from '../stores/license.store';
import { StoreRepository } from '../database/store.repo';
import { BackupData } from '../types/backup';

// ─── Types ────────────────────────────────────────────────────────────────

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

export interface CloudLoginResult {
  success: boolean;
  message: string;
  needsEmailConfirmation?: boolean;
}

export function useCloudAccount() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
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

  const setCloudAccount = useLicenseStore((s) => s.setCloudAccount);

  // ─── Check backup after login ───────────────────────────────────────────
  // Letakkan ini sebelum loginCloud agar bisa jadi dependency

  const checkCloudBackup = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;

    setRestoreState('checking_backup');
    try {
      const backups = await BackupService.listCloudBackups();
      if (backups.length === 0) {
        setRestoreState('no_backup');
        setRestoreMessage('Belum ada backup untuk akun cloud ini. Backup data Anda sekarang.');
        return;
      }

      const latest = backups[0];
      setBackupInfo({
        id: latest.id,
        createdAt: latest.createdAt,
        recordCounts: latest.recordCounts || {},
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
      setRestoreMessage('Gagal mengecek backup. Periksa koneksi internet lalu coba lagi.');
    }
  }, []);

  // ─── Login ──────────────────────────────────────────────────────────────

  const loginCloud = useCallback(async (email: string, password: string): Promise<CloudLoginResult> => {
    setIsLoggingIn(true);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        const msg = mapAuthError(result.error.message);
        return { success: false, message: msg };
      }

      const session = result.data?.session;
      const userId = session?.user?.id;
      const userEmail = session?.user?.email;
      if (!userId) {
        return { success: false, message: 'Gagal mendapatkan sesi pengguna.' };
      }

      await setCloudAccount({ userId, email: userEmail || email });
      // Tunggu checkCloudBackup selesai sebelum return
      await checkCloudBackup();
      return { success: true, message: 'Login berhasil.' };
    } finally {
      setIsLoggingIn(false);
    }
  }, [setCloudAccount, checkCloudBackup]);

  // ─── Register ───────────────────────────────────────────────────────────

  const registerCloud = useCallback(async (
    email: string,
    password: string,
  ): Promise<CloudLoginResult> => {
    setIsRegistering(true);
    try {
      const supabaseResult: any = await signUp(email, password);
      if (supabaseResult.error) {
        const msg = mapAuthError(supabaseResult.error.message);
        return { success: false, message: msg };
      }

      // Jika session langsung tersedia (email confirmation disabled)
      if (supabaseResult.data?.session) {
        const userId = supabaseResult.data.session.user?.id;
        const userEmail = supabaseResult.data.session.user?.email;
        if (userId) {
          await setCloudAccount({ userId, email: userEmail || email });
          await checkCloudBackup();
          return { success: true, message: 'Akun Cloud berhasil dibuat.' };
        }
      }

      // Jika perlu konfirmasi email
      return {
        success: true,
        message: 'Akun Cloud berhasil dibuat. Silakan cek email untuk konfirmasi, lalu login kembali.',
        needsEmailConfirmation: true,
      };
    } finally {
      setIsRegistering(false);
    }
  }, [setCloudAccount, checkCloudBackup]);

  // ─── Logout ─────────────────────────────────────────────────────────────

  const logoutCloud = useCallback(async () => {
    await signOut();
    useLicenseStore.getState().clearCloudAccount();
    setRestoreState('idle');
    setBackupInfo(null);
    setLatestBackupData(null);
    setRestoreMessage('');
  }, []);

  // ─── Execute restore ────────────────────────────────────────────────────

  const executeRestore = useCallback(async () => {
    if (isRestoring) return;
    setIsRestoring(true);
    setRestoreState('restoring');

    setRestoreProgress({
      visible: true,
      step: 'Menyiapkan restore...',
      percent: 5,
      detail: 'Mohon tunggu sebentar.',
    });

    try {
      // Gunakan restore standar by user_id (bukan restoreFromData)
      // restoreFromCloud sudah handle clear data + insert
      const result = await BackupService.restoreFromCloud();

      // Refresh state aplikasi
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
  }, [isRestoring]);

  // ─── Flow helpers ───────────────────────────────────────────────────────

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

  return {
    // State
    isLoggingIn,
    isRegistering,
    restoreState,
    restoreMessage,
    backupInfo,
    isRestoring,
    restoreProgress,

    // Actions
    loginCloud,
    registerCloud,
    logoutCloud,
    checkCloudBackup,
    executeRestore,
    skipRestore,
    resetRestoreFlow,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Email atau password salah.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Email belum dikonfirmasi. Silakan cek email Anda.';
  }
  if (message.includes('rate limit')) {
    return 'Terlalu banyak percobaan. Coba lagi nanti.';
  }
  if (message.includes('already registered')) {
    return 'Email sudah terdaftar. Silakan login.';
  }
  if (message.includes('Password should be')) {
    return 'Password minimal 6 karakter.';
  }
  return message || 'Terjadi kesalahan. Coba lagi.';
}

async function checkLocalData(): Promise<boolean> {
  try {
    const { ProductRepository } = await import('../database/product.repo');
    const { CustomerRepository } = await import('../database/customer.repo');
    const products = await ProductRepository.getAll();
    const customers = await CustomerRepository.getAll();
    const activeStore = await StoreRepository.getActiveStore();
    return products.length > 0 || customers.length > 0 || activeStore !== null;
  } catch {
    return false;
  }
}
