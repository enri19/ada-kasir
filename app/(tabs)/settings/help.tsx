import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../../src/config/theme';
import { Card } from '../../../src/components/Card';
import { CustomHeader } from '../../../src/components/CustomHeader';
import { ADMIN_WHATSAPP } from '../../../src/utils/constants';

const HELP_STEPS = [
  { title: 'Cara Transaksi', description: 'Pilih produk, masukkan jumlah, lalu selesaikan pembayaran dengan tunai, QRIS, atau bon.' },
  { title: 'Cara Tambah Produk', description: 'Buka menu Produk dan pilih tombol Tambah Produk untuk memasukkan data produk baru.' },
  { title: 'Cara Catat Bon', description: 'Pilih metode pembayaran Bon saat checkout untuk mencatat tagihan pelanggan.' },
  { title: 'Cara Pakai QRIS', description: 'Upload QRIS toko di pengaturan lalu pilih pembayaran QRIS pada checkout.' },
];

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleContactAdmin = async () => {
    const message = 'Halo Admin, saya butuh bantuan penggunaan aplikasi Kasir Rapi.';
    const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Gagal membuka WhatsApp', 'Pastikan WhatsApp tersedia di perangkat Anda.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>      
      <CustomHeader title="Bantuan" onBack={() => router.back()} />
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {HELP_STEPS.map((step) => (
          <Card key={step.title} style={styles.helpCard}>
            <Text style={styles.helpTitle}>{step.title}</Text>
            <Text style={styles.helpDescription}>{step.description}</Text>
          </Card>
        ))}

        <TouchableOpacity style={styles.contactButton} onPress={handleContactAdmin}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.onPrimary} />
          <Text style={styles.contactButtonText}>Hubungi Admin</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.aboutButton} onPress={() => router.push('/settings/about')}>
          <Text style={styles.aboutButtonText}>Tentang Aplikasi</Text>
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
  helpCard: { padding: spacing.stackMd, marginBottom: spacing.stackSm },
  helpTitle: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackSm },
  helpDescription: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  contactButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm, backgroundColor: colors.primary, paddingVertical: spacing.stackMd, borderRadius: borderRadius.md, marginTop: spacing.stackLg },
  contactButtonText: { ...typography.bodyLg, fontWeight: '700', color: colors.onPrimary },
  aboutButton: { alignItems: 'center', paddingVertical: spacing.stackMd, marginTop: spacing.stackSm },
  aboutButtonText: { ...typography.bodyLg, color: colors.primary, fontWeight: '700' },
});
