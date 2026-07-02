import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { CustomHeader } from '../../src/components/CustomHeader';
import { useLicenseStore } from '../../src/stores/license.store';

// ============================================================
// Data fitur Premium
// ============================================================

interface PremiumFeature {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Status di halaman Fitur Premium */
  getStatus: (isPremium: boolean) => 'aktif' | 'premium' | 'coming_soon' | 'tahap1';
  /** Route tujuan saat tombol navigasi diklik (hanya untuk Premium) */
  route?: string;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    key: 'backup',
    label: 'Backup Cloud',
    icon: 'cloud-outline',
    getStatus: (p) => p ? 'aktif' : 'premium',
    route: '/settings/cloud-backup',
  },
  {
    key: 'export',
    label: 'Export Excel/PDF',
    icon: 'download-outline',
    getStatus: (p) => p ? 'aktif' : 'premium',
  },
  {
    key: 'report',
    label: 'Laporan Otomatis',
    icon: 'analytics-outline',
    getStatus: () => 'coming_soon',
  },
  {
    key: 'multi_device',
    label: 'Multi Perangkat',
    icon: 'phone-portrait-outline',
    getStatus: () => 'coming_soon',
  },
  {
    key: 'support',
    label: 'Support Prioritas',
    icon: 'chatbubble-ellipses-outline',
    getStatus: (p) => p ? 'aktif' : 'premium',
  },
  {
    key: 'printer',
    label: 'Printer Struk',
    icon: 'print-outline',
    getStatus: (p) => p ? 'tahap1' : 'premium',
    route: '/settings/printer',
  },
];

// ============================================================
// Helper tampilan status
// ============================================================

function StatusBadge({ status }: { status: 'aktif' | 'premium' | 'coming_soon' | 'tahap1' }) {
  const config = {
    aktif: { icon: 'checkmark-circle' as const, color: colors.secondary, label: 'Aktif' },
    premium: { icon: 'lock-closed-outline' as const, color: colors.onSurfaceVariant, label: 'Premium' },
    coming_soon: { icon: 'time-outline' as const, color: '#FFA000', label: 'Segera Hadir' },
    tahap1: { icon: 'construct-outline' as const, color: '#FFA000', label: 'Tahap 1' },
  }[status];

  return (
    <View style={[styles.statusBadge, { borderColor: config.color + '40' }]}>
      <Ionicons name={config.icon} size={14} color={config.color} />
      <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================================
// Component
// ============================================================

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const deviceCode = useLicenseStore((s) => s.deviceCode);
  const status = useLicenseStore((s) => s.status);
  const activatedAt = useLicenseStore((s) => s.activatedAt);
  const expiresAt = useLicenseStore((s) => s.expiresAt);
  const refreshStatus = useLicenseStore((s) => s.refreshStatus);

  // Refresh status setiap halaman difokuskan
  useFocusEffect(
    useCallback(() => {
      refreshStatus();
    }, [refreshStatus])
  );

const isPremium = status === 'premium_active';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader title="Fitur Premium" onBack={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* ── Card status paket ── */}
        <Card style={styles.statusCard}>
          {isPremium ? (
            <View>
              <View style={styles.statusHeader}>
                <View style={styles.statusIconCircle}>
                  <Ionicons name="checkmark-circle" size={32} color={colors.secondary} />
                </View>
                <View style={styles.statusTextArea}>
                  <Text style={styles.statusTitle}>Premium Aktif</Text>
                  <Text style={styles.statusDescription}>
                    Semua fitur Premium yang tersedia sudah aktif untuk akun ini.
                  </Text>
                </View>
              </View>

              <View style={styles.statusMetaRow}>
                <Text style={styles.statusMetaLabel}>Kode Perangkat</Text>
                <Text selectable style={styles.statusMetaValue}>{deviceCode || '-'}</Text>
              </View>

              {activatedAt && (
                <View style={styles.statusMetaRow}>
                  <Text style={styles.statusMetaLabel}>Diaktifkan</Text>
                  <Text style={styles.statusMetaValue}>{formatDate(activatedAt)}</Text>
                </View>
              )}

              {expiresAt && (
                <View style={styles.statusMetaRow}>
                  <Text style={styles.statusMetaLabel}>Berakhir</Text>
                  <Text style={styles.statusMetaValue}>{formatDate(expiresAt)}</Text>
                </View>
              )}
            </View>
          ) : (
            <View>
              <View style={styles.statusHeader}>
                <View style={styles.statusIconCircle}>
                  <Ionicons name="diamond-outline" size={32} color={colors.primary} />
                </View>
                <View style={styles.statusTextArea}>
                  <Text style={styles.statusTitle}>Aktifkan Premium</Text>
                  <Text style={styles.statusDescription}>
                    Aktifkan Premium untuk membuka fitur seperti Cadangan Data Cloud, Export
                    Laporan, dan lainnya.
                  </Text>
                </View>
              </View>

              <Button
                title="Aktifkan Premium"
                onPress={() => router.push('/settings/account')}
                fullWidth
                icon={<Ionicons name="diamond-outline" size={18} color={colors.onPrimary} />}
              />
            </View>
          )}
        </Card>

        {/* ── Daftar fitur Premium ── */}
        <Text style={styles.sectionTitle}>Fitur Tersedia</Text>

        {PREMIUM_FEATURES.map((feature) => {
          const featureStatus = feature.getStatus(isPremium);
          return (
            <TouchableOpacity
              key={feature.key}
              style={styles.featureCard}
              onPress={() => {
                if (isPremium && feature.route) {
                  router.push(feature.route as any);
                }
              }}
              disabled={!isPremium || !feature.route}
              activeOpacity={feature.route ? 0.7 : 1}
            >
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.featureLabel}>{feature.label}</Text>
              <StatusBadge status={featureStatus} />
              {isPremium && feature.route && (
                <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile, paddingBottom: 32 },

  // ── Status card ──
  statusCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  statusHeader: { flexDirection: 'row', gap: spacing.stackMd, marginBottom: spacing.stackMd },
  statusIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextArea: { flex: 1, justifyContent: 'center' },
  statusTitle: { ...typography.headlineMobile, color: colors.onSurface, fontWeight: '700' },
  statusDescription: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4, lineHeight: 20 },
  statusMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.stackSm },
  statusMetaLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  statusMetaValue: { ...typography.labelSm, color: colors.onSurface, fontWeight: '600' },

  // ── Section title ──
  sectionTitle: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackMd },

  // ── Feature list ──
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.stackMd,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.stackSm,
    gap: spacing.stackSm,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: { flex: 1, ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.stackSm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusBadgeText: { ...typography.labelSm, fontSize: 11, fontWeight: '700' },
});
