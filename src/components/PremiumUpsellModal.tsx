import React from 'react';
import { useRouter } from 'expo-router';
import { AppModal } from './ui/AppModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  benefits?: string[];
}

export default function PremiumUpsellModal({ visible, onClose, title, description, benefits }: Props) {
  const router = useRouter();

  function handleUpgrade() {
    router.push('/settings/account');
    onClose();
  }

  const displayTitle = title || 'Export tersedia untuk Premium';
  const displayDescription = description || 'Aktifkan Premium untuk menyimpan laporan ke Excel/PDF, backup data, dan mendapatkan fitur lanjutan.';
  const displayBenefits = benefits || ['Export Excel & PDF', 'Backup & Restore data', 'Laporan bulanan', 'Support prioritas'];

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      type="premium"
      title={displayTitle}
      icon="diamond"
      message={displayDescription}
      benefits={displayBenefits}
      primaryAction={{
        label: 'Aktifkan Premium',
        onPress: handleUpgrade,
        variant: 'primary',
      }}
      secondaryAction={{
        label: 'Nanti',
        onPress: onClose,
        variant: 'ghost',
      }}
    />
  );
}
