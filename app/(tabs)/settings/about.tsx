import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../../src/config/theme';
import { APP_NAME, APP_VERSION } from '../../../src/utils/constants';
import { CustomHeader } from '../../../src/components/CustomHeader';

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>      
      <CustomHeader title="Tentang Aplikasi" onBack={() => router.back()} />
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.subtitle}>Versi {APP_VERSION}</Text>
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
  card: { padding: spacing.stackMd, borderRadius: borderRadius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.stackMd },
  title: { ...typography.headlineLg, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackSm },
  subtitle: { ...typography.bodyLg, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd },
  description: { ...typography.bodyMd, color: colors.onSurfaceVariant },
});
