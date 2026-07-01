import React, { useEffect, useState } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as Network from 'expo-network';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../../src/config/theme';
import { Card } from '../../../src/components/Card';
import { useAppStore } from '../../../src/stores/app.store';
import { useLicenseStore } from '../../../src/stores/license.store';
import { useCartStore } from '../../../src/stores/cart.store';
import { resetDatabase } from '../../../src/database/db';
import { APP_NAME, APP_VERSION, STORAGE_KEYS } from '../../../src/utils/constants';
import { AppImages } from '../../../src/constants/assets';

export default function SettingsScreen() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const appVersion = Constants.expoConfig?.version ?? APP_VERSION;

  useEffect(() => {
    let isMounted = true;

    const fetchNetworkState = async () => {
      const state = await Network.getNetworkStateAsync();
      if (!isMounted) return;
      setIsOnline(state.isConnected ?? false);
    };

    fetchNetworkState();

    const interval = setInterval(fetchNetworkState, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const clearAllData = async () => {
    setIsClearing(true);
    try {
      await resetDatabase();
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));

      useCartStore.getState().clearCart();
      useAppStore.setState({
        isReady: true,
        isOnboardingComplete: false,
        activeStore: null,
      });
      await useLicenseStore.getState().loadFromStorage();

      Alert.alert(
        'Data Berhasil Dihapus',
        'Semua data lokal telah dihapus. Silakan atur kembali data warung Anda.',
        [
          {
            text: 'Mulai Ulang',
            onPress: () => router.replace('/onboarding'),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Clear app data error:', error);
      Alert.alert('Gagal Menghapus Data', 'Terjadi kesalahan. Data Anda belum dihapus sepenuhnya.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Hapus Semua Data?',
      'Tindakan ini akan menghapus data warung, produk, transaksi, pelanggan, pengaturan, serta lisensi lokal. Kode perangkat akan dibuat ulang dan data tidak dapat dikembalikan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Data',
          style: 'destructive',
          onPress: clearAllData,
        },
      ]
    );
  };

  return (
    <View style={styles.container}>      
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Logo + nama app */}
        <View style={styles.logoSection}>
          <Image source={AppImages.logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appNameText}>{APP_NAME}</Text>
          <Text style={styles.tagline}>Jualan cepat, laporan rapi.</Text>
        </View>

        <Card style={styles.badgeCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#F44336' }]} />
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
          <Text style={styles.statusNote}>
            Aplikasi tetap bisa digunakan saat offline. Beberapa fitur premium seperti backup, aktivasi, dan export membutuhkan internet.
          </Text>
        </Card>

        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/settings/account')}>
          <View style={styles.menuIcon}><Ionicons name="storefront-outline" size={24} color={colors.primary} /></View>
          <Text style={styles.menuLabel}>Akun & Lisensi</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/kategori')}>
          <View style={styles.menuIcon}><Ionicons name="pricetags-outline" size={24} color={colors.primary} /></View>
          <Text style={styles.menuLabel}>Kategori Produk</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/settings/qris')}>
          <View style={styles.menuIcon}><Ionicons name="qr-code-outline" size={24} color={colors.primary} /></View>
          <Text style={styles.menuLabel}>QRIS Toko</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/settings/premium')}>
          <View style={styles.menuIcon}><Ionicons name="diamond-outline" size={24} color={colors.primary} /></View>
          <Text style={styles.menuLabel}>Fitur Premium</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/settings/device')}>
          <View style={styles.menuIcon}><Ionicons name="hardware-chip-outline" size={24} color={colors.primary} /></View>
          <Text style={styles.menuLabel}>Perangkat</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/settings/help')}>
          <View style={styles.menuIcon}><Ionicons name="help-circle-outline" size={24} color={colors.primary} /></View>
          <Text style={styles.menuLabel}>Bantuan</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        <Card style={styles.dataCard}>
          <Text style={styles.sectionTitle}>Data Aplikasi</Text>
          <Text style={styles.dataDescription}>
            Hapus seluruh data lokal dan mulai kembali dari awal.
          </Text>
          <TouchableOpacity
            style={[styles.clearButton, isClearing && styles.disabledButton]}
            onPress={handleClearData}
            disabled={isClearing}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <Text style={styles.clearButtonText}>
              {isClearing ? 'Menghapus Data...' : 'Hapus Data'}
            </Text>
          </TouchableOpacity>
        </Card>

        <View style={styles.versionInfo}>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.versionText}>Versi {appVersion}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile, paddingBottom: 16 },
  logoSection: { alignItems: 'center', paddingVertical: spacing.stackLg, marginBottom: spacing.stackMd },
  logo: { width: 72, height: 72, marginBottom: spacing.stackSm },
  appNameText: { ...typography.headlineMobile, color: colors.primary, fontWeight: '700' },
  tagline: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  headerTitle: { ...typography.headlineLg, color: colors.onSurface, marginBottom: spacing.stackLg },
  badgeCard: { padding: spacing.stackMd, marginBottom: spacing.stackLg },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm, marginBottom: spacing.stackSm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  statusNote: { ...typography.labelSm, color: colors.onSurfaceVariant },
  menuCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.stackMd, backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.stackMd },
  menuIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', marginRight: spacing.stackSm },
  menuLabel: { flex: 1, ...typography.bodyLg, color: colors.onSurface, marginLeft: spacing.stackSm },
  dataCard: { padding: spacing.stackMd, marginTop: spacing.stackSm },
  sectionTitle: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackSm },
  dataDescription: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd },
  clearButton: { minHeight: spacing.touchTargetMin, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm, borderWidth: 1, borderColor: colors.error, borderRadius: borderRadius.md },
  clearButtonText: { ...typography.bodyLg, color: colors.error, fontWeight: '700' },
  disabledButton: { opacity: 0.5 },
  versionInfo: { alignItems: 'center', paddingTop: spacing.stackLg },
  appName: { ...typography.labelSm, color: colors.onSurface, fontWeight: '700' },
  versionText: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 4 },
});
