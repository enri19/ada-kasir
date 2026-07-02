import React from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppModal } from './ui/AppModal';
import { ADMIN_WHATSAPP } from '../utils/constants';
import { LicenseService } from '../services/license.service';
import { useLicenseStore } from '../stores/license.store';
import { useAppStore } from '../stores/app.store';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function TrialExpiredModal({ visible, onClose }: Props) {
  const router = useRouter();
  const deviceCode = useLicenseStore((s) => s.deviceCode) ?? '';
  const store = useAppStore((s) => s.activeStore);

  function handleActivate() {
    onClose();
    router.push('/(tabs)/settings/lisensi' as never);
  }

  function handleWhatsApp() {
    const msg = LicenseService.buildActivationMessage(
      store?.name ?? '',
      deviceCode,
      store?.ownerName,
      store?.phone,
    );
    const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
  }

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      type="warning"
      title="Masa Trial Berakhir"
      icon="time-outline"
      message="Data Anda tetap aman dan masih bisa dilihat. Aktifkan lisensi AdaKasir untuk melanjutkan transaksi dan mengelola data."
      primaryAction={{
        label: 'Aktivasi Sekarang',
        onPress: handleActivate,
        variant: 'primary',
      }}
      secondaryAction={{
        label: 'Hubungi Admin',
        onPress: handleWhatsApp,
        variant: 'outline',
        icon: <Ionicons name="logo-whatsapp" size={16} color="gray" />,
      }}
    />
  );
}
