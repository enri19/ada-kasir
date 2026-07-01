import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius } from '../../../src/config/theme';
import { APP_NAME, APP_VERSION } from '../../../src/utils/constants';
import { CustomHeader } from '../../../src/components/CustomHeader';
import { AppImages } from '../../../src/constants/assets';

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>      
      <CustomHeader title="Tentang Aplikasi" onBack={() => router.back()} />
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoSection}>
          <Image source={AppImages.logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.version}>Versi {APP_VERSION}</Text>
          <Text style={styles.tagline}>Jualan cepat, laporan rapi.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.description}>Aplikasi kasir offline-first untuk usaha kecil dan warung dengan fitur penjualan, stok, bon, dan laporan.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile, paddingBottom: 32 },
  headerTitle: { ...typography.headlineLg, color: colors.onSurface, marginBottom: spacing.stackLg },
  logoSection: { alignItems: 'center', paddingVertical: spacing.stackLg, marginBottom: spacing.stackMd },
  logo: { width: 96, height: 96, marginBottom: spacing.stackMd },
  appName: { ...typography.headlineLg, color: colors.primary, fontWeight: '700' },
  version: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4 },
  tagline: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  card: { padding: spacing.stackMd, borderRadius: borderRadius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.stackMd },
  description: { ...typography.bodyMd, color: colors.onSurfaceVariant },
});
