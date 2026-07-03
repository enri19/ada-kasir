import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useLicenseStore } from '../stores/license.store';
import { AppModal } from '../components/ui/AppModal';

type ModalType = 'trial_expired' | 'premium_upsell' | null;

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
 */
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
   * Jika tidak boleh, tampilkan modal yang sesuai.
   * Jika boleh, jalankan `action`.
   */
  const guard = useCallback(
    (type: 'transaction' | 'product' | 'stock', action: () => void) => {
      let allowed = false;
      if (type === 'transaction') allowed = canCreateTransaction();
      else if (type === 'product') allowed = canManageProducts();
      else if (type === 'stock') allowed = canManageStock();

      if (!allowed) {
        setModalType('trial_expired');
        return;
      }
      action();
    },
    [canCreateTransaction, canManageProducts, canManageStock]
  );

  /**
   * Guard khusus export laporan — Premium only.
   */
  const guardExport = useCallback(
    (action: () => void) => {
      if (!canExportReport()) {
        setModalType('premium_upsell');
        return;
      }
      action();
    },
    [canExportReport]
  );

  /** Render AppModal based on modalType */
  const modal = modalType === 'trial_expired' ? (
    <AppModal
      visible
      onClose={closeModal}
      type="warning"
      title="Masa Trial Berakhir"
      icon="time-outline"
      message="Data Anda tetap aman dan masih bisa dilihat. Aktifkan lisensi AdaKasir untuk melanjutkan transaksi dan mengelola data."
      primaryAction={{
        label: 'Aktivasi Sekarang',
        onPress: () => {
          closeModal();
          router.push('/settings/account');
        },
        variant: 'primary',
      }}
      secondaryAction={{
        label: 'Nanti',
        onPress: closeModal,
        variant: 'ghost',
      }}
    />
  ) : modalType === 'premium_upsell' ? (
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
          router.push('/settings/account');
        },
        variant: 'primary',
      }}
      secondaryAction={{
        label: 'Nanti',
        onPress: closeModal,
        variant: 'ghost',
      }}
    />
  ) : null;

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
