import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../../src/config/theme';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { useLicenseStore } from '../../../src/stores/license.store';
import Constants from 'expo-constants';
import { CustomHeader } from '../../../src/components/CustomHeader';

export default function DeviceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const deviceCode = useLicenseStore((state) => state.deviceCode);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <CustomHeader title="Perangkat" onBack={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Info Perangkat */}
        <Card style={styles.infoCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="hardware-chip-outline" size={28} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Informasi Perangkat</Text>
              <Text style={styles.headerSubtitle}>Detail teknis perangkat Anda</Text>
            </View>
          </View>

          <Text style={styles.infoLabel}>Nama Perangkat</Text>
          <Text style={styles.infoValue}>{Constants.deviceName || 'Perangkat'}</Text>

          <Text style={styles.infoLabel}>OS</Text>
          <Text style={styles.infoValue}>{Platform.OS.toUpperCase()}</Text>

          <Text style={styles.infoLabel}>Versi Aplikasi</Text>
          <Text style={styles.infoValue}>{Constants.expoConfig?.version || '1.0.0'}</Text>

          <Text style={styles.infoLabel}>Kode Perangkat</Text>
          <Text style={styles.infoValue}>{deviceCode || '-'}</Text>
        </Card>

        {/* Printer info — navigasi ke Printer Struk */}
        <Card style={styles.printerCard}>
          <View style={styles.printerHeader}>
            <View style={styles.printerIconCircle}>
              <Ionicons name="print-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.printerTextArea}>
              <Text style={styles.printerTitle}>Printer Struk</Text>
              <Text style={styles.printerDescription}>
                Atur printer thermal, ukuran kertas, auto print, dan test print di halaman Printer Struk.
              </Text>
            </View>
          </View>
          <Button
            title="Buka Pengaturan Printer"
            onPress={() => router.push('/settings/printer')}
            fullWidth
            size="sm"
            variant="outline"
            icon={<Ionicons name="print-outline" size={18} color={colors.primary} />}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile, paddingBottom: 32 },

  // ── Info card ──
  infoCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd, marginBottom: spacing.stackMd },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.headlineMobile, color: colors.onSurface, fontWeight: '700' },
  headerSubtitle: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  infoLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: spacing.stackLg },
  infoValue: { ...typography.bodyLg, color: colors.onSurface, marginTop: spacing.stackSm },

  // ── Printer card ──
  printerCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  printerHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.stackMd, marginBottom: spacing.stackMd },
  printerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printerTextArea: { flex: 1 },
  printerTitle: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700' },
  printerDescription: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4, lineHeight: 20 },
});
