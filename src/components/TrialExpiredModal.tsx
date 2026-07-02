import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '../config/theme';
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="time-outline" size={32} color={colors.primary} />
          </View>

          <Text style={styles.title}>Masa Trial Berakhir</Text>
          <Text style={styles.message}>
            Data Anda tetap aman dan masih bisa dilihat. Aktifkan lisensi AdaKasir untuk
            melanjutkan transaksi dan mengelola data.
          </Text>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleActivate}>
            <Text style={styles.btnPrimaryText}>Aktivasi Sekarang</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={handleWhatsApp}>
            <Ionicons name="logo-whatsapp" size={16} color={colors.secondary} />
            <Text style={styles.btnSecondaryText}>Hubungi Admin</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnGhost} onPress={onClose}>
            <Text style={styles.btnGhostText}>Nanti</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    ...typography.headlineMobile,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  btnPrimary: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrimaryText: {
    ...typography.bodyLg,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  btnSecondary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    marginBottom: 10,
  },
  btnSecondaryText: {
    ...typography.bodyLg,
    color: colors.secondary,
    fontWeight: '600',
  },
  btnGhost: {
    paddingVertical: 10,
  },
  btnGhostText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
