import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useLicenseStore } from '../stores/license.store';
import { AppModal } from '../components/ui/AppModal';

type ModalType =
  | 'trial_expired'           // trial_expired → basic write attempt
  | 'premium_expired'         // premium_expired → basic write attempt
  | 'premium_upsell'          // trial/non-premium → premium feature attempt
  | 'premium_expired_upsell'  // premium_expired → premium feature attempt
  | 'lifetime_upsell'         // lifetime → premium feature attempt
  | null;

/**
 * useLicenseGuard
 *
 * Gunakan hook ini di screen yang membutuhkan cek lisensi sebelum aksi.
 *
 * Contoh:
 *   const { guard, guardExport, modalType, closeModal } = useLicenseGuard();
 *
 *   // Sebelum buat transaksi:
 *   guard('transaction', () => router.push('/keranjang'));
 *
 *   // Sebelum export:
 *   guardExport(() => doExport());
 *
 * Modal ditampilkan berdasarkan status lisensi aktual:
 * - trial_expired → "Masa Trial Berakhir"
 * - premium_expired → "Premium Berakhir"
 * - lifetime → "Fitur Premium" (lifetime tidak bisa akses premium)
 */

/** Dapatkan status lisensi saat ini (di luar React render cycle — aman untuk callback) */
function getLicenseStatus() {
  return useLicenseStore.getState().status;
}

/** Dapatkan status read-only: trial_expired ATAU premium_expired */
function isLicenseReadOnly(): boolean {
  return useLicenseStore.getState().isReadOnlyMode();
}

export function useLicenseGuard() {
  const router = useRouter();
  const [modalType, setModalType] = useState<ModalType>(null);

  const canCreateTransaction = useLicenseStore((s) => s.canCreateTransaction);
  const canManageProducts = useLicenseStore((s) => s.canManageProducts);
  const canManageStock = useLicenseStore((s) => s.canManageStock);
  const canExportReport = useLicenseStore((s) => s.canExportReport);
  const isReadOnly = useLicenseStore((s) => s.isReadOnlyMode);

  const closeModal = useCallback(() => setModalType(null), []);

  /**
   * Guard untuk aksi Basic (transaksi, produk, stok).
   * Jika tidak boleh, tampilkan modal yang sesuai berdasarkan status aktual.
   * Jika boleh, jalankan `action`.
   */
  const guard = useCallback(
    (type: 'transaction' | 'product' | 'stock', action: () => void) => {
      let allowed = false;
      if (type === 'transaction') allowed = canCreateTransaction();
      else if (type === 'product') allowed = canManageProducts();
      else if (type === 'stock') allowed = canManageStock();

      if (!allowed) {
        const status = getLicenseStatus();
        if (status === 'premium_expired') {
          setModalType('premium_expired');
        } else {
          setModalType('trial_expired');
        }
        return;
      }
      action();
    },
    [canCreateTransaction, canManageProducts, canManageStock]
  );

  /**
   * Guard khusus export laporan / akses fitur Premium — Premium only.
   * Menampilkan modal berbeda untuk lifetime vs premium_expired vs trial.
   */
  const guardExport = useCallback(
    (action: () => void) => {
      if (!canExportReport()) {
        const status = getLicenseStatus();
        if (status === 'lifetime') {
          setModalType('lifetime_upsell');
        } else if (status === 'premium_expired') {
          setModalType('premium_expired_upsell');
        } else {
          setModalType('premium_upsell');
        }
        return;
      }
      action();
    },
    [canExportReport]
  );

  /** Render AppModal based on modalType */
  const modal = (() => {
    switch (modalType) {
      case 'trial_expired':
        return (
          <AppModal
            visible
            onClose={closeModal}
            type="warning"
            title="Masa Trial Berakhir"
            icon="time-outline"
            message="Masa trial Anda sudah berakhir. Data tetap dapat dilihat, tetapi perubahan data dinonaktifkan. Silakan aktifkan Premium untuk melanjutkan."
            primaryAction={{
              label: 'Aktifkan Premium',
              onPress: () => {
                closeModal();
                router.push('/settings/activation');
              },
              variant: 'primary',
            }}
            secondaryAction={{
              label: 'Tutup',
              onPress: closeModal,
              variant: 'ghost',
            }}
          />
        );

      case 'premium_expired':
        return (
          <AppModal
            visible
            onClose={closeModal}
            type="warning"
            title="Premium Berakhir"
            icon="time-outline"
            message="Masa aktif Premium sudah berakhir. Silakan perpanjang Premium untuk menggunakan fitur penuh kembali."
            primaryAction={{
              label: 'Perpanjang Premium',
              onPress: () => {
                closeModal();
                router.push('/settings/activation');
              },
              variant: 'primary',
            }}
            secondaryAction={{
              label: 'Tutup',
              onPress: closeModal,
              variant: 'ghost',
            }}
          />
        );

      case 'premium_upsell':
        return (
          <AppModal
            visible
            onClose={closeModal}
            type="premium"
            title="Export tersedia untuk Premium"
            icon="diamond"
            message="Aktifkan Premium untuk menyimpan laporan ke Excel/PDF, backup data, dan mendapatkan fitur lanjutan."
            benefits={[
              'Export Excel & PDF',
              'Backup & Restore data',
              'Laporan bulanan',
              'Support prioritas',
            ]}
            primaryAction={{
              label: 'Aktifkan Premium',
              onPress: () => {
                closeModal();
                router.push('/settings/activation');
              },
              variant: 'primary',
            }}
            secondaryAction={{
              label: 'Nanti',
              onPress: closeModal,
              variant: 'ghost',
            }}
          />
        );

      case 'premium_expired_upsell':
        return (
          <AppModal
            visible
            onClose={closeModal}
            type="warning"
            title="Premium Berakhir"
            icon="diamond"
            message="Masa aktif Premium sudah berakhir. Silakan perpanjang Premium untuk menggunakan fitur Premium kembali."
            primaryAction={{
              label: 'Perpanjang Premium',
              onPress: () => {
                closeModal();
                router.push('/settings/activation');
              },
              variant: 'primary',
            }}
            secondaryAction={{
              label: 'Tutup',
              onPress: closeModal,
              variant: 'ghost',
            }}
          />
        );

      case 'lifetime_upsell':
        return (
          <AppModal
            visible
            onClose={closeModal}
            type="premium"
            title="Fitur Premium"
            icon="diamond"
            message="Fitur ini tersedia untuk pengguna Premium aktif. Lisensi Lifetime hanya membuka akses aplikasi dasar seumur hidup."
            primaryAction={{
              label: 'Aktifkan Premium',
              onPress: () => {
                closeModal();
                router.push('/settings/activation');
              },
              variant: 'primary',
            }}
            secondaryAction={{
              label: 'Tutup',
              onPress: closeModal,
              variant: 'ghost',
            }}
          />
        );

      default:
        return null;
    }
  })();

  return {
    /** Tipe modal yang sedang aktif, null jika tidak ada */
    modalType,
    closeModal,
    /** Guard untuk aksi Basic (transaksi / produk / stok) */
    guard,
    /** Guard untuk export laporan (Premium only) */
    guardExport,
    /** Shortcut: apakah mode read-only saat ini */
    isReadOnly: isReadOnly(),
    /** Render AppModal — pasang di JSX screen */
    modal,
  };
}
