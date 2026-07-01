import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../../src/config/theme';
import { Card } from '../../../src/components/Card';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { useAppStore } from '../../../src/stores/app.store';
import { useLicenseStore } from '../../../src/stores/license.store';
import { CustomHeader } from '../../../src/components/CustomHeader';
import { ADMIN_WHATSAPP } from '../../../src/utils/constants';

const PREMIUM_FEATURES = [
  'Backup Cloud',
  'Export Excel/PDF',
  'Laporan Otomatis',
  'Multi Perangkat',
  'Support Prioritas',
];

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const store = useAppStore((state) => state.activeStore);
  const deviceCode = useLicenseStore((state) => state.deviceCode);
  const activateLicense = useLicenseStore((state) => state.activateLicense);
  const [licenseCode, setLicenseCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  const handleContactAdmin = async () => {
    const message = `Halo Admin, saya ingin aktivasi premium untuk ${store?.name || 'Warung'} dengan kode perangkat ${deviceCode || '-'}.`;
    const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Gagal membuka WhatsApp', 'Pastikan WhatsApp tersedia di perangkat Anda.');
    }
  };

  const handleActivate = async () => {
    if (!licenseCode.trim()) {
      Alert.alert('Kode kosong', 'Masukkan kode lisensi terlebih dahulu.');
      return;
    }
    setIsActivating(true);
    const success = await activateLicense(licenseCode.trim());
    setIsActivating(false);

    if (success) {
      Alert.alert('Berhasil', 'Lisensi berhasil diaktifkan.');
      setLicenseCode('');
    } else {
      Alert.alert('Kode tidak valid', 'Kode lisensi tidak cocok dengan perangkat ini.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>      
      <CustomHeader title="Fitur Premium" onBack={() => router.back()} />
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {PREMIUM_FEATURES.map((feature) => (
          <Card key={feature} style={styles.featureCard}>
            <View style={styles.featureRow}>
              <Text style={styles.featureTitle}>{feature}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>Belum Aktif</Text>
              </View>
            </View>
          </Card>
        ))}

        <Card style={styles.licenseCard}>
          <Text style={styles.sectionTitle}>Masukkan Kode Lisensi</Text>
          <Input
            value={licenseCode}
            onChangeText={setLicenseCode}
            placeholder="ADK-PREM-XXXX-YYYY"
          />
          <Button
            title="Aktifkan Lisensi"
            onPress={handleActivate}
            fullWidth
            loading={isActivating}
          />
        </Card>

        <TouchableOpacity style={styles.contactButton} onPress={handleContactAdmin}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.onPrimary} />
          <Text style={styles.contactButtonText}>Hubungi Admin</Text>
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
  featureCard: { padding: spacing.stackMd, marginBottom: spacing.stackSm },
  featureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featureTitle: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '600' },
  statusBadge: { backgroundColor: colors.surfaceContainerLow, paddingHorizontal: spacing.stackSm, paddingVertical: 4, borderRadius: borderRadius.full },
  statusBadgeText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: '700' },
  licenseCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  sectionTitle: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackMd },
  contactButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm, backgroundColor: colors.primary, paddingVertical: spacing.stackMd, borderRadius: borderRadius.md, marginTop: spacing.stackLg },
  contactButtonText: { ...typography.bodyLg, color: colors.onPrimary, fontWeight: '700' },
});
