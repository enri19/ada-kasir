import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '../config/theme';

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="star" size={28} color={colors.tertiary} />
          </View>

          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.message}>{displayDescription}</Text>

          <View style={styles.featureList}>
            {displayBenefits.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.secondary} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleUpgrade}>
            <Ionicons name="diamond-outline" size={16} color={colors.onPrimary} />
            <Text style={styles.btnPrimaryText}>Aktifkan Premium</Text>
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
    backgroundColor: colors.tertiaryFixed,
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
    marginBottom: 16,
    lineHeight: 22,
  },
  featureList: {
    width: '100%',
    gap: 8,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  btnPrimary: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    marginBottom: 10,
  },
  btnPrimaryText: {
    ...typography.bodyLg,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  btnGhost: {
    paddingVertical: 10,
  },
  btnGhostText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
