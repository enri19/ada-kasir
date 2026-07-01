import { useState, useCallback } from 'react';
import { useLicenseStore } from '../stores/license.store';

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
   *
   * @param type  'transaction' | 'product' | 'stock'
   * @param action  callback yang dijalankan jika izin OK
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
   * Jika tidak boleh, tampilkan modal Premium upsell.
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
  };
}
