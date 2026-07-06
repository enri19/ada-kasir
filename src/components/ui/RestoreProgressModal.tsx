import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, typography } from '../../config/theme';
import { AppModal } from './AppModal';
import type { RestoreProgress } from '../../hooks/useCloudAccount';

interface Props {
  progress: RestoreProgress;
}

export function RestoreProgressModal({ progress }: Props) {
  return (
    <AppModal
      visible={progress.visible}
      onClose={() => {}}
      type="info"
      title="Memulihkan Backup"
      icon="cloud-download"
      message=""
    >
      <View style={styles.content}>
        {/* Spinner */}
        <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />

        {/* Step teks */}
        <Text style={styles.step}>{progress.step || 'Memproses...'}</Text>

        {/* Detail */}
        {progress.detail && (
          <Text style={styles.detail}>{progress.detail}</Text>
        )}

        {/* Progress bar */}
        {progress.percent != null && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.max(0, progress.percent))}%` },
                ]}
              />
            </View>
            <Text style={styles.percentText}>{Math.round(progress.percent)}%</Text>
          </View>
        )}

        {/* Info */}
        <Text style={styles.info}>
          Proses ini dapat memakan waktu beberapa menit tergantung ukuran backup dan koneksi
          internet.
        </Text>
        <Text style={styles.warning}>Jangan tutup aplikasi sampai proses selesai.</Text>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 4,
  },
  spinner: {
    marginBottom: 16,
  },
  step: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  detail: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  percentText: {
    ...typography.labelSm,
    fontWeight: '700',
    color: colors.primary,
    minWidth: 36,
    textAlign: 'right',
  },
  info: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 16,
  },
  warning: {
    ...typography.labelSm,
    color: colors.error,
    fontWeight: '600',
    textAlign: 'center',
  },
});
