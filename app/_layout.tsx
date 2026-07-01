import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet, Image, Text } from 'react-native';
import { useAppStore } from '../src/stores/app.store';
import { useLicenseStore } from '../src/stores/license.store';
import { colors, typography } from '../src/config/theme';
import { AppImages } from '../src/constants/assets';

export default function RootLayout() {
  const isReady = useAppStore((state) => state.isReady);
  const loadFromStorage = useAppStore((state) => state.loadFromStorage);
  const loadLicense = useLicenseStore((state) => state.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
    loadLicense();
  }, []);

  if (!isReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <Image source={AppImages.logo} style={styles.loadingLogo} resizeMode="contain" />
          <ActivityIndicator size="large" color={colors.onPrimary} style={{ marginTop: 24 }} />
          <Text style={styles.loadingText}>Memuat aplikasi...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="keranjang" />
        <Stack.Screen name="pembayaran" />
        <Stack.Screen name="pembayaran/tunai" />
        <Stack.Screen name="pembayaran/qris" />
        <Stack.Screen name="pembayaran/bon" />
        <Stack.Screen name="transaksi/berhasil" />
        <Stack.Screen name="transaksi/detail/[id]" />
        <Stack.Screen name="produk" />
        <Stack.Screen name="laporan/detail" />
        <Stack.Screen name="kategori" />
        <Stack.Screen name="pelanggan/index" />
        <Stack.Screen name="pelanggan/tambah" />
        <Stack.Screen name="pelanggan/detail/[id]" />
        <Stack.Screen name="pelanggan/pilih" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  loadingLogo: { width: 120, height: 120 },
  loadingText: { ...typography.bodyMd, color: colors.onPrimary, marginTop: 12, opacity: 0.85 },
});
