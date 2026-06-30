import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Card } from '../../src/components/Card';
import { resetDatabase } from '../../src/database/db';
import { useAppStore } from '../../src/stores/app.store';
import { STORAGE_KEYS } from '../../src/utils/constants';
import { CategoryRepository } from '../../src/database/category.repo';
import { StoreRepository } from '../../src/database/store.repo';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeStore = useAppStore((state) => state.activeStore);
  const setIsOnboardingComplete = useAppStore((state) => state.setIsOnboardingComplete);
  const setActiveStore = useAppStore((state) => state.setActiveStore);
  const storeName = activeStore?.name || 'Warung Madura';
  const [qrisImage, setQrisImage] = useState<string | null>(activeStore?.qrisImageUri || null);

  const handleResetDatabase = () => {
    Alert.alert(
      'Reset Database',
      'Yakin ingin mereset semua data? Aplikasi akan kembali ke halaman setup awal.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabase();
              await CategoryRepository.seedDefaultCategories();
              await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
              await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_STORE_ID);
              setIsOnboardingComplete(false);
              setActiveStore(null);
              router.replace('/onboarding');
            } catch (error) {
              Alert.alert('Error', 'Gagal mereset database');
            }
          },
        },
      ]
    );
  };

  const handlePickQrisImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses ke galeri foto');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0] && activeStore) {
      const uri = result.assets[0].uri;
      setQrisImage(uri);
      try {
        await StoreRepository.update(activeStore.id, { qrisImageUri: uri, qrisName: activeStore.name });
        const updatedStore = await StoreRepository.getById(activeStore.id);
        if (updatedStore) setActiveStore(updatedStore);
        Alert.alert('Berhasil', 'QRIS berhasil diperbarui');
      } catch (error) {
        Alert.alert('Error', 'Gagal menyimpan QRIS');
      }
    }
  };

  const handleRemoveQris = () => {
    Alert.alert(
      'Hapus QRIS',
      'Yakin ingin menghapus gambar QRIS?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            if (activeStore) {
              try {
                await StoreRepository.update(activeStore.id, { qrisImageUri: null });
                setQrisImage(null);
                const updatedStore = await StoreRepository.getById(activeStore.id);
                if (updatedStore) setActiveStore(updatedStore);
              } catch (error) {
                Alert.alert('Error', 'Gagal menghapus QRIS');
              }
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Account & License */}
        <Text style={styles.sectionLabel}>AKUN & LISENSI</Text>
        <Card style={styles.accountCard}>
          <View style={styles.accountRow}>
            <View style={styles.storeLogo}>
              <Ionicons name="storefront" size={32} color={colors.onPrimary} />
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.storeName}>{storeName}</Text>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>PREMIUM MEMBER</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="pencil-outline" size={20} color={colors.onSurfaceVariant} />
            <Text style={styles.menuText}>Ubah Data Warung</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="star-outline" size={20} color={colors.onSurfaceVariant} />
            <Text style={styles.menuText}>Pengaturan Lisensi</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </Card>

        {/* Premium Features */}
        <Text style={styles.sectionLabel}>FITUR PREMIUM</Text>
        <Card style={styles.featureCard}>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: '#ffebee' }]}>
              <Ionicons name="cloud-done-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Cloud Backup & Sync</Text>
              <Text style={styles.featureSubtitle}>Terakhir sinkronisasi: 2 menit yang lalu</Text>
            </View>
            <View style={[styles.toggle, styles.toggleActive]}>
              <View style={[styles.toggleCircle, styles.toggleCircleActive]} />
            </View>
          </View>
          <Text style={styles.syncStatus}>Auto-Sync Status: <Text style={styles.syncStatusActive}>Aktif</Text></Text>
          <TouchableOpacity style={styles.backupButton}>
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
            <Text style={styles.backupButtonText}>Backup Sekarang</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.featureCard}>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: '#ffebee' }]}>
              <Ionicons name="people-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Multi-User (Karyawan)</Text>
              <Text style={styles.featureSubtitle}>Kelola akses staff dan kasir</Text>
            </View>
            <Text style={styles.manageText}>Kelola Tim</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
          </View>
        </Card>

        {/* Devices */}
        <Text style={styles.sectionLabel}>PERANGKAT</Text>
        <Card style={styles.deviceCard}>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: colors.surfaceContainerLow }]}>
              <Ionicons name="print-outline" size={24} color={colors.onSurfaceVariant} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Printer Thermal</Text>
              <View style={styles.connectedRow}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>Terhubung ke RPP02N</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.settingsButton}>
              <Text style={styles.settingsButtonText}>Pengaturan</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Manajemen Toko */}
        <Text style={styles.sectionLabel}>MANAJEMEN TOKO</Text>
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/kategori')}
        >
          <Ionicons name="pricetags-outline" size={20} color={colors.primary} />
          <Text style={styles.menuText}>Kategori Produk</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        <Card style={styles.qrisCard}>
          <View style={styles.qrisHeader}>
            <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
            <Text style={styles.qrisTitle}>QRIS Toko</Text>
          </View>
          <Text style={styles.qrisSubtitle}>Upload gambar QRIS untuk pembayaran non-tunai</Text>

          {qrisImage ? (
            <View style={styles.qrisPreviewContainer}>
              <Image source={{ uri: qrisImage }} style={styles.qrisPreview} />
              <TouchableOpacity style={styles.qrisRemoveButton} onPress={handleRemoveQris}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={styles.qrisRemoveText}>Hapus QRIS</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.qrisUploadButton} onPress={handlePickQrisImage}>
              <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
              <Text style={styles.qrisUploadText}>Upload QRIS</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Help */}
        <Text style={styles.sectionLabel}>BANTUAN</Text>
        <Card style={styles.helpCard}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="headset-outline" size={20} color={colors.primary} />
            <Text style={styles.menuText}>Hubungi Support</Text>
            <Ionicons name="open-outline" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="book-outline" size={20} color={colors.primary} />
            <Text style={styles.menuText}>Panduan Penggunaan</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </Card>

        {/* Data */}
        <Text style={styles.sectionLabel}>DATA</Text>
        <TouchableOpacity style={styles.resetButton} onPress={handleResetDatabase}>
          <Ionicons name="refresh-outline" size={20} color={colors.error} />
          <Text style={styles.resetText}>Reset Database</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Keluar Akun</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>VERSI APLIKASI</Text>
        <Text style={styles.versionNumber}>v1.2.0-premium</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.marginMobile,
    paddingBottom: 100,
  },
  sectionLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.stackSm,
    marginTop: spacing.stackLg,
  },
  accountCard: {
    padding: spacing.stackMd,
    marginBottom: spacing.stackMd,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.stackMd,
    paddingBottom: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  storeLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.stackMd,
  },
  accountInfo: {
    flex: 1,
  },
  storeName: {
    ...typography.bodyLg,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  premiumBadge: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.stackSm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  premiumText: {
    ...typography.labelSm,
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.stackSm,
    gap: spacing.stackMd,
  },
  menuText: {
    flex: 1,
    ...typography.bodyLg,
    color: colors.onSurface,
  },
  featureCard: {
    padding: spacing.stackMd,
    marginBottom: spacing.stackMd,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.stackMd,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 2,
  },
  featureSubtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerHigh,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.secondary,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  syncStatus: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.stackSm,
    marginBottom: spacing.stackMd,
  },
  syncStatusActive: {
    color: colors.secondary,
    fontWeight: '700',
  },
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.stackSm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    gap: spacing.stackSm,
  },
  backupButtonText: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.primary,
  },
  manageText: {
    ...typography.labelSm,
    color: colors.primary,
    marginRight: spacing.stackSm,
  },
  deviceCard: {
    padding: spacing.stackMd,
    marginBottom: spacing.stackMd,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  connectedText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  settingsButton: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm,
    borderRadius: borderRadius.md,
  },
  settingsButtonText: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  helpCard: {
    padding: spacing.stackSm,
    marginBottom: spacing.stackMd,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.stackMd,
    marginBottom: spacing.stackMd,
    gap: spacing.stackMd,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.stackMd,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    gap: spacing.stackSm,
    marginBottom: spacing.stackMd,
  },
  resetText: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.error,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.stackMd,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    gap: spacing.stackSm,
    marginTop: spacing.stackLg,
  },
  logoutText: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.error,
  },
  versionText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.stackLg,
  },
  versionNumber: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  qrisCard: {
    padding: spacing.stackMd,
    marginBottom: spacing.stackMd,
  },
  qrisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    marginBottom: spacing.stackSm,
  },
  qrisTitle: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.onSurface,
  },
  qrisSubtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.stackMd,
  },
  qrisPreviewContainer: {
    alignItems: 'center',
  },
  qrisPreview: {
    width: 150,
    height: 150,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLow,
    marginBottom: spacing.stackSm,
  },
  qrisRemoveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.stackSm,
  },
  qrisRemoveText: {
    ...typography.labelSm,
    color: colors.error,
    fontWeight: '600',
  },
  qrisUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingVertical: spacing.stackLg,
  },
  qrisUploadText: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.primary,
  },
});
