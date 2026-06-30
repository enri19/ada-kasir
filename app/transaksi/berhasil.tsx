import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { CurrencyText } from '../../src/components/CurrencyText';
import { Button } from '../../src/components/Button';
import { formatRupiah } from '../../src/utils/currency';
import { useAppStore } from '../../src/stores/app.store';
import { SaleRepository } from '../../src/database/sales.repo';
import { WhatsAppService } from '../../src/services/whatsapp.service';

export default function TransaksiBerhasilScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { invoiceNumber, change, total, received, paymentMethod } = useLocalSearchParams<{
    invoiceNumber: string;
    change?: string;
    total: string;
    received?: string;
    paymentMethod?: string;
  }>();

  const activeStore = useAppStore((state) => state.activeStore);
  const changeAmount = parseInt(change || '0', 10) || 0;
  const totalAmount = parseInt(total, 10) || 0;
  const receivedAmount = parseInt(received || '0', 10) || 0;
  const method = (paymentMethod || 'cash') as string;

  const getMethodLabel = () => {
    switch (method) {
      case 'qris_static': return 'QRIS';
      case 'debt': return 'Bon';
      default: return 'Tunai';
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      const sale = await SaleRepository.getByInvoiceNumber(invoiceNumber);
      if (sale && activeStore) {
        const receiptText = WhatsAppService.generateReceiptText(activeStore, sale);
        const encoded = encodeURIComponent(receiptText);
        const waUrl = `https://wa.me/?text=${encoded}`;
        await Linking.openURL(waUrl);
      } else {
        const message = `*Nota Pembayaran*\n\nInvoice: ${invoiceNumber}\nTotal: ${formatRupiah(totalAmount)}\nMetode: ${getMethodLabel()}\n\nTerima kasih telah berbelanja!`;
        const encoded = encodeURIComponent(message);
        await Linking.openURL(`https://wa.me/?text=${encoded}`);
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Gagal membuka WhatsApp');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={colors.secondary} />
          </View>
          <Text style={styles.successTitle}>Transaksi Berhasil</Text>
          <Text style={styles.invoiceNumber}>Invoice #{invoiceNumber}</Text>
        </View>

        {method === 'cash' && changeAmount > 0 && (
          <View style={styles.changeCard}>
            <Text style={styles.changeLabel}>KEMBALIAN</Text>
            <CurrencyText amount={changeAmount} size="xxl" color={colors.secondary} />
          </View>
        )}

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Total Belanja</Text>
              <CurrencyText amount={totalAmount} size="lg" />
            </View>
            {method === 'cash' && receivedAmount > 0 && (
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Bayar Tunai</Text>
                <CurrencyText amount={receivedAmount} size="lg" />
              </View>
            )}
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{method === 'debt' ? 'Belum Lunas' : 'Lunas'}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Kirim Nota WhatsApp"
            onPress={handleShareWhatsApp}
            size="lg"
            fullWidth
            icon={<Ionicons name="share-social-outline" size={20} color={colors.onPrimary} />}
          />
          <Button
            title="Cetak Struk"
            onPress={() => Alert.alert('Coming Soon', 'Fitur cetak struk akan segera tersedia')}
            variant="outline"
            size="lg"
            fullWidth
            icon={<Ionicons name="print-outline" size={20} color={colors.primary} />}
          />
        </View>

        <TouchableOpacity style={styles.newTransactionButton} onPress={() => router.replace('/(tabs)')}>
          <Ionicons name="cart-outline" size={20} color={colors.onSurfaceVariant} />
          <Text style={styles.newTransactionText}>Transaksi Baru</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Sistem Kasir {activeStore?.name || 'Warung Madura'} V2.4</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.marginMobile },
  successCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.stackLg,
    alignItems: 'center', marginBottom: spacing.stackLg,
  },
  successIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.secondaryContainer, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.stackMd,
  },
  successTitle: { ...typography.headlineMobile, fontWeight: '700', color: colors.onSurface },
  invoiceNumber: { ...typography.bodyLg, color: colors.onSurfaceVariant, marginTop: spacing.stackSm },
  changeCard: {
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg,
    padding: spacing.stackLg, alignItems: 'center', marginBottom: spacing.stackLg,
  },
  changeLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  detailsCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.stackLg, marginBottom: spacing.stackLg,
  },
  detailRow: { flexDirection: 'row', gap: spacing.stackMd, marginBottom: spacing.stackLg },
  detailBox: {
    flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    padding: spacing.stackMd,
  },
  detailLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.secondaryContainer, paddingHorizontal: spacing.stackLg, paddingVertical: spacing.stackSm,
    borderRadius: borderRadius.full, alignSelf: 'center',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  statusText: { ...typography.bodyLg, color: colors.secondary, fontWeight: '600' },
  actions: { gap: spacing.stackMd, marginBottom: spacing.stackLg },
  newTransactionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: spacing.stackMd,
  },
  newTransactionText: { ...typography.bodyLg, color: colors.onSurfaceVariant, fontWeight: '600' },
  footer: { ...typography.labelSm, color: colors.onSurfaceVariant, textAlign: 'center', paddingBottom: spacing.stackLg },
});
