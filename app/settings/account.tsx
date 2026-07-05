import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/stores/app.store';
import { useLicenseStore } from '../../src/stores/license.store';
import { LicenseService, LicenseStatus } from '../../src/services/license.service';
import { StoreRepository } from '../../src/database/store.repo';
import { colors, spacing, typography } from '../../src/config/theme';
import { Card } from '../../src/components/Card';
import { CustomHeader } from '../../src/components/CustomHeader';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { AppButton } from '../../src/components/ui/AppButton';

// ─── Helpers ──────────────────────────────────────────────────────────
function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('id-ID') : '-';
}

function getBadge(status: string): { label: string; color: string } {
  switch (status) {
    case 'trial_active':
      return { label: 'Trial Aktif', color: colors.secondary };
    case 'trial_expired':
      return { label: 'Trial Berakhir', color: colors.error };
    case 'premium_active':
      return { label: 'Premium Aktif', color: colors.secondary };
    case 'premium_expired':
      return { label: 'Premium Berakhir', color: colors.error };
    case 'lifetime':
      return { label: 'Lifetime Aktif', color: colors.secondary };
    default:
      return { label: status, color: colors.onSurfaceVariant };
    }
}

function getDescription(status: string): string {
  switch (status) {
    case 'trial_active':
      return 'Anda sedang menggunakan versi trial AdaKasir.';
    case 'trial_expired':
      return 'Masa trial sudah berakhir. Aktifkan Premium untuk melanjutkan fitur lengkap.';
    case 'premium_active':
      return 'Semua fitur Premium aktif.';
    case 'premium_expired':
      return 'Masa aktif Premium sudah berakhir.';
    case 'lifetime':
      return 'Lisensi seumur hidup aktif.';
    default:
      return '';
  }
}

function isPremiumAccess(status: LicenseStatus): boolean {
  return LicenseService.isPremiumAccess(status);
}

// ─── Component ──────────────────────────────────────────────────────────
export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const activeStore = useAppStore((s) => s.activeStore);
  const setActiveStore = useAppStore((s) => s.setActiveStore);
  const deviceCode = useLicenseStore((s) => s.deviceCode);
  const licenseStatus = useLicenseStore((s) => s.status);
  const trialEndsAt = useLicenseStore((s) => s.trialEndsAt);
  const expiresAt = useLicenseStore((s) => s.expiresAt);
  const refreshLicenseStatus = useLicenseStore((s) => s.refreshStatus);
  const cloudEmail = useLicenseStore((s) => s.cloudEmail);
  const isCloudLoggedIn = useLicenseStore((s) => s.isCloudLoggedIn);

  const hasPremium = isPremiumAccess(licenseStatus);

  // ── Store form state ──
  const [storeName, setStoreName] = useState(activeStore?.name || '');
  const [ownerName, setOwnerName] = useState(activeStore?.ownerName || '');
  const [phone, setPhone] = useState(activeStore?.phone || '');
  const [address, setAddress] = useState(activeStore?.address || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeStore) {
      setStoreName(activeStore.name);
      setOwnerName(activeStore.ownerName);
      setPhone(activeStore.phone);
      setAddress(activeStore.address);
    }
  }, [activeStore]);

  useFocusEffect(
    React.useCallback(() => {
      refreshLicenseStatus();
    }, [refreshLicenseStatus])
  );

  // ── Simpan Data Toko ──
  const handleSave = async () => {
    if (!activeStore) {
      Alert.alert('Toko tidak ditemukan', 'Silakan kembali dan coba lagi.');
      return;
    }
    if (!storeName.trim()) {
      Alert.alert('Nama toko wajib diisi', 'Isi nama toko sebelum menyimpan.');
      return;
    }
    setIsSaving(true);
    try {
      const updatedStore = await StoreRepository.update(activeStore.id, {
        name: storeName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      if (updatedStore) {
        setActiveStore(updatedStore);
        Alert.alert('Berhasil', 'Data toko berhasil diperbarui.');
      } else {
        Alert.alert('Gagal', 'Tidak dapat menyimpan data toko.');
      }
    } catch (error) {
      Alert.alert('Terjadi Kesalahan', (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived data ──
  const badge = getBadge(licenseStatus);
  const trialDaysLeft =
    licenseStatus === 'trial_active' && trialEndsAt
      ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

  // ── Render ──
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader title="Akun & Lisensi" onBack={() => router.back()} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
      >
        {/* ════════════════════════════════════════════════════════════
            CARD 1: Status Lisensi
            ════════════════════════════════════════════════════════════ */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Status Lisensi</Text>
          </View>

          {/* Badge */}
          <View style={styles.badgeRow}>
            <View style={[styles.badgeDot, { backgroundColor: badge.color }]} />
            <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
          </View>

          {/* Deskripsi */}
          <Text style={styles.description}>{getDescription(licenseStatus)}</Text>

          {/* Sisa hari trial */}
          {licenseStatus === 'trial_active' && trialDaysLeft !== null && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Sisa Hari Trial</Text>
              <Text style={styles.metaValue}>{trialDaysLeft} hari</Text>
            </View>
          )}

          {/* Masa aktif premium */}
          {licenseStatus === 'premium_active' && expiresAt && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Masa Aktif Sampai</Text>
              <Text style={styles.metaValue}>{formatDate(expiresAt)}</Text>
            </View>
          )}

          {/* Masa aktif lifetime */}
          {licenseStatus === 'lifetime' && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Masa Aktif</Text>
              <Text style={styles.metaValue}>Seumur hidup</Text>
            </View>
          )}

          {/* Kode Perangkat */}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Kode Perangkat</Text>
            <Text style={styles.metaValueMono}>{deviceCode || '-'}</Text>
          </View>

          {/* Tombol aktivasi */}
          {!hasPremium && (
            <View style={styles.actionArea}>
              <AppButton
                title="Aktifkan Premium"
                onPress={() => router.push('/settings/activation')}
                variant="primary"
                fullWidth
                size="md"
                icon={<Ionicons name="key-outline" size={18} color={colors.onPrimary} />}
              />
            </View>
          )}

          {/* Info akun cloud ringkas */}
          <View style={styles.cloudInfoBox}>
            <Ionicons name="cloud-outline" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.cloudInfoText}>
              {isCloudLoggedIn && cloudEmail
                ? `Akun Cloud: ${cloudEmail}`
                : 'Akun Cloud: Belum Terhubung'}
            </Text>
            <AppButton
              title="Kelola"
              onPress={() => router.push('/settings/cloud-backup')}
              variant="ghost"
              size="sm"
              icon={<Ionicons name="arrow-forward" size={14} color={colors.primary} />}
            />
          </View>
        </Card>

        {/* ════════════════════════════════════════════════════════════
            CARD 2: Keuntungan Premium
            ════════════════════════════════════════════════════════════ */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="diamond-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Keuntungan Premium</Text>
          </View>

          <View style={styles.bulletList}>
            <BulletItem icon="document-text-outline" text="Export laporan penjualan" />
            <BulletItem icon="cloud-outline" text="Backup dan restore cloud" />
            <BulletItem icon="shield-checkmark-outline" text="Manajemen data lebih aman" />
            <BulletItem icon="infinite-outline" text="Akses fitur Premium tanpa batas trial" />
          </View>

          {hasPremium ? (
            <AppButton
              title="Lihat Fitur Premium"
              onPress={() => router.push('/settings/premium')}
              variant="outline"
              fullWidth
              size="md"
              icon={<Ionicons name="diamond-outline" size={18} color={colors.primary} />}
            />
          ) : (
            <AppButton
              title="Aktifkan Premium"
              onPress={() => router.push('/settings/activation')}
              variant="primary"
              fullWidth
              size="md"
              icon={<Ionicons name="diamond-outline" size={18} color={colors.onPrimary} />}
            />
          )}
        </Card>

        {/* ════════════════════════════════════════════════════════════
            CARD 3: Info Toko / Akun
            ════════════════════════════════════════════════════════════ */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="storefront-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Info Toko / Akun</Text>
          </View>

          <Input
            label="Nama Toko"
            value={storeName}
            onChangeText={setStoreName}
            placeholder="Contoh: Warung Berkah"
          />
          <Input
            label="Nama Pemilik"
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="Nama lengkap Anda"
          />
          <Input
            label="Nomor WhatsApp"
            value={phone}
            onChangeText={setPhone}
            placeholder="08xxxxxxxxxx"
            keyboardType="phone-pad"
          />
          <Input
            label="Alamat Toko"
            value={address}
            onChangeText={setAddress}
            placeholder="Masukkan alamat toko Anda"
            multiline
            numberOfLines={3}
          />

          <Button
            title="Simpan Perubahan"
            onPress={handleSave}
            fullWidth
            loading={isSaving}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

// ─── Sub-komponen ────────────────────────────────────────────────────────
function BulletItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name={icon} size={18} color={colors.secondary} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile, paddingBottom: 32 },
  card: { padding: spacing.stackMd, marginBottom: spacing.stackMd },

  // ── Card header ──
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    marginBottom: spacing.stackMd,
  },
  cardTitle: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700' },

  // ── Status badge ──
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.stackSm },
  badgeDot: { width: 10, height: 10, borderRadius: 5 },
  badgeLabel: { ...typography.bodyMd, fontWeight: '700' },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.stackMd,
    lineHeight: 20,
  },

  // ── Meta rows ──
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.stackSm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  metaLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  metaValue: { ...typography.labelSm, color: colors.onSurface, fontWeight: '600' },
  metaValueMono: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },

  // ── Action ──
  actionArea: { marginTop: spacing.stackMd },

  // ── Cloud info ──
  cloudInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    marginTop: spacing.stackMd,
    paddingTop: spacing.stackMd,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  cloudInfoText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    flex: 1,
  },

  // ── Bullet list ──
  bulletList: { gap: spacing.stackSm, marginBottom: spacing.stackMd },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  bulletText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
});
