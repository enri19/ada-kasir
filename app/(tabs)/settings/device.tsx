import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../../src/config/theme';
import { Card } from '../../../src/components/Card';
import { useLicenseStore } from '../../../src/stores/license.store';
import Constants from 'expo-constants';
import { CustomHeader } from '../../../src/components/CustomHeader';

export default function DeviceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const deviceCode = useLicenseStore((state) => state.deviceCode);

  const handlePrinterSetup = () => {
    Alert.alert('Atur Printer', 'Printer belum tersedia di MVP offline-first. Printer hanya dapat diatur di development build atau versi selanjutnya.');
  };

  const handleTestPrint = () => {
    Alert.alert('Test Print', 'Printer belum terhubung. Printer membutuhkan development build untuk pengujian.');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>      
      <CustomHeader title="Perangkat" onBack={() => router.back()} />
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.infoCard}>
          <Text style={styles.infoLabel}>Nama Perangkat</Text>
          <Text style={styles.infoValue}>{Constants.deviceName || 'Perangkat'}</Text>

          <Text style={styles.infoLabel}>OS</Text>
          <Text style={styles.infoValue}>{Platform.OS.toUpperCase()}</Text>

          <Text style={styles.infoLabel}>Versi Aplikasi</Text>
          <Text style={styles.infoValue}>{Constants.manifest?.version || '1.0.0'}</Text>

          <Text style={styles.infoLabel}>Kode Perangkat</Text>
          <Text style={styles.infoValue}>{deviceCode || '-'}</Text>

          <Text style={styles.infoLabel}>Status Printer</Text>
          <Text style={[styles.infoValue, styles.warningText]}>Belum Terhubung</Text>
        </Card>

        <TouchableOpacity style={styles.actionButton} onPress={handlePrinterSetup}>
          <Text style={styles.actionButtonText}>Atur Printer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleTestPrint}>
          <Text style={styles.actionButtonText}>Test Print</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile, paddingBottom: 32 },
  headerTitle: { ...typography.headlineLg, color: colors.onSurface, marginBottom: spacing.stackLg },
  infoCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  infoLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: spacing.stackLg },
  infoValue: { ...typography.bodyLg, color: colors.onSurface, marginTop: spacing.stackSm },
  warningText: { color: colors.error, fontWeight: '700' },
  actionButton: { backgroundColor: colors.surface, borderColor: colors.outlineVariant, borderWidth: 1, borderRadius: borderRadius.md, paddingVertical: spacing.stackMd, alignItems: 'center', marginBottom: spacing.stackSm },
  actionButtonText: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700' },
});
