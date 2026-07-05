import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { CurrencyText } from '../../src/components/CurrencyText';
import { Button } from '../../src/components/Button';
import { useCartStore } from '../../src/stores/cart.store';
import { SaleRepository } from '../../src/database/sales.repo';
import { processSaleTransaction } from '../../src/services/sale.service';
import { generateInvoiceNumber } from '../../src/utils/invoice-number';
import { useAppStore } from '../../src/stores/app.store';
import { CustomHeader } from '../../src/components/CustomHeader';
import { BottomActionBar } from '../../src/components/BottomActionBar';

export default function PembayaranQRISScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const resetPayment = useCartStore((state) => state.resetPayment);
  const [processing, setProcessing] = useState(false);

  const activeStore = useAppStore((state) => state.activeStore);
  const totalPrice = getTotal();

  const qrisImage = activeStore?.qrisImageUri || null;
  const qrisName = activeStore?.qrisName || activeStore?.name || 'Warung';
  const qrisNote = activeStore?.qrisNote || null;

  const handleProcessPayment = async () => {
    if (processing) return;
    if (totalPrice <= 0) {
      Alert.alert('Error', 'Total transaksi Rp0');
      return;
    }

    Alert.alert(
      'Konfirmasi Pembayaran QRIS',
      'Pastikan pembayaran QRIS sudah masuk sebelum menyimpan transaksi.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Sudah Dibayar',
          onPress: async () => {
            setProcessing(true);
            try {
              const todayCount = await SaleRepository.getTodayCount();
              const invoiceNumber = generateInvoiceNumber(todayCount);

              await processSaleTransaction({
                items,
                totalAmount: totalPrice,
                paidAmount: totalPrice,
                changeAmount: 0,
                paymentMethod: 'qris_static',
                status: 'paid',
                invoiceNumber,
              });

              clearCart();
              resetPayment();
              router.replace({
                pathname: '/transaksi/berhasil',
                params: {
                  invoiceNumber,
                  total: String(totalPrice),
                  paymentMethod: 'qris_static',
                },
              });
            } catch (error: any) {
              if (error.code === 'STOCK_INSUFFICIENT' && error.details) {
                Alert.alert(
                  'Stok Tidak Cukup',
                  `${error.details.productName} hanya tersedia ${error.details.available}, tetapi diminta ${error.details.requested}.`
                );
              } else {
                Alert.alert('Error', 'Transaksi gagal disimpan. Silakan coba lagi.');
              }
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleGoToSettings = () => {
    router.push({
      pathname: '/settings/qris',
      params: { returnTo: 'pembayaran-qris' },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader title="Pembayaran QRIS" onBack={() => router.back()} />

      <View style={styles.content}>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL TAGIHAN</Text>
          <CurrencyText amount={totalPrice} size="xxl" color={colors.primary} />
        </View>

        <Text style={styles.sectionTitle}>Scan QRIS Toko</Text>

        {qrisImage ? (
          <View style={styles.qrisCard}>
            <Image source={{ uri: qrisImage }} style={styles.qrisImage} />
            <Text style={styles.qrisName}>{qrisName}</Text>
            {qrisNote && <Text style={styles.qrisNote}>{qrisNote}</Text>}
          </View>
        ) : (
          <View style={styles.qrisCard}>
            <View style={styles.imagePlaceholder}>
              <Ionicons name="qr-code-outline" size={56} color={colors.onSurfaceVariant} />
              <Text style={styles.placeholderTitle}>QRIS belum diupload di aplikasi</Text>
              <Text style={styles.placeholderText}>
                Jika toko Anda sudah memiliki QRIS cetak, minta pelanggan scan QRIS fisik di meja kasir.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={20} color={colors.error} />
          <Text style={styles.warningText}>
            Pastikan pembayaran sudah masuk sebelum menyimpan transaksi.
          </Text>
        </View>

        {!qrisImage && (
          <TouchableOpacity style={styles.settingsLink} onPress={handleGoToSettings}>
            <Ionicons name="settings-outline" size={16} color={colors.primary} />
            <Text style={styles.settingsLinkText}>Upload QRIS di Pengaturan</Text>
          </TouchableOpacity>
        )}
      </View>

      <BottomActionBar>
        <Button
          title="Konfirmasi Pembayaran"
          onPress={handleProcessPayment}
          size="lg"
          fullWidth
          loading={processing}
          icon={<Ionicons name="checkmark-circle-outline" size={20} color={colors.onPrimary} />}
        />
      </BottomActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.marginMobile },
  totalCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.stackLg,
    alignItems: 'center', marginBottom: spacing.stackLg,
  },
  totalLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  sectionTitle: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface, marginBottom: spacing.stackMd },
  qrisCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.stackLg,
    alignItems: 'center', marginBottom: spacing.stackLg,
  },
  qrisImage: {
    width: 200, height: 200, borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  qrisName: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface, marginTop: spacing.stackMd },
  qrisNote: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.stackSm },
  warningCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.stackSm,
    backgroundColor: '#ffebee', borderRadius: borderRadius.md,
    padding: spacing.stackMd, borderWidth: 1, borderColor: colors.error,
  },
  warningText: { flex: 1, ...typography.labelSm, color: colors.error },
  imagePlaceholder: { alignItems: 'center', paddingVertical: spacing.stackLg },
  placeholderTitle: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface, textAlign: 'center', marginTop: spacing.stackMd },
  placeholderText: { ...typography.labelSm, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.stackSm },
  settingsLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.stackSm, marginBottom: spacing.stackMd,
  },
  settingsLinkText: { ...typography.bodyMd, color: colors.primary, fontWeight: '600' },

});
