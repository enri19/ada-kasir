import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ScrollView } from 'react-native';
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
import { PrinterService } from '../../src/services/printer.service';
import { useLicenseStore } from '../../src/stores/license.store';
import { AppModal } from '../../src/components/ui/AppModal';
import { APP_NAME, APP_VERSION } from '../../src/utils/constants';
import { SaleWithItems } from '../../src/types/sale';
import { AppFooterActions } from '../../src/components/ui/AppFooterActions';
import { DebtRepository } from '../../src/database/debt.repo';
import { formatDebtDate } from '../../src/utils/debtDate';
import { getEffectiveDueDate } from '../../src/utils/debtDate';

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
  const licenseStatus = useLicenseStore((state) => state.status);
  const isPremium = licenseStatus === 'premium_active';
  const [saleData, setSaleData] = useState<SaleWithItems | null>(null);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [debtDueDate, setDebtDueDate] = useState<Date | null>(null);
  const [isEstimated, setIsEstimated] = useState(false);
  const changeAmount = parseInt(change || '0', 10) || 0;
  const totalAmount = parseInt(total, 10) || 0;
  const receivedAmount = parseInt(received || '0', 10) || 0;
  const method = (paymentMethod || 'cash') as string;
  const visibleProducts = saleData?.items.slice(0, 2) ?? [];
  const hiddenProductsCount = saleData ? Math.max(0, saleData.items.length - visibleProducts.length) : 0;

  useEffect(() => {
    const loadSaleData = async () => {
      if (!invoiceNumber) return;
      try {
        const sale = await SaleRepository.getByInvoiceNumber(invoiceNumber);
        setSaleData(sale);

        // If debt transaction, load the debt's due date
        if (sale?.paymentMethod === 'debt') {
          const debts = await DebtRepository.getByCustomerId(sale.customerId || '');
          const debt = debts.find((d) => d.saleId === sale.id);
          if (debt) {
            const { date, isEstimated } = getEffectiveDueDate({
              dueDate: debt.dueDate,
              createdAt: debt.createdAt,
            });
            setDebtDueDate(date);
            }
          }
      } catch (error) {
      }
    };

    loadSaleData();
  }, [invoiceNumber]);

  const getMethodLabel = () => {
    switch (method) {
      case 'qris_static': return 'QRIS';
      case 'debt': return 'Bon';
      default: return 'Tunai';
    }
  };

  const handlePrintReceipt = async () => {
    if (!isPremium) {
      setPremiumModalVisible(true);
      return;
    }
    try {
      const sale = await SaleRepository.getByInvoiceNumber(invoiceNumber);
      if (!sale || !activeStore) {
        Alert.alert('Error', 'Data transaksi tidak ditemukan');
        return;
      }

      const subtotal = sale.items.reduce((sum, item) => sum + item.subtotal, 0);
      const discount = Math.max(0, subtotal - sale.totalAmount);

      const paymentLabel = (() => {
        switch (method) {
          case 'qris_static': return 'QRIS';
          case 'debt': return 'Bon';
          default: return 'Tunai';
        }
      })();

      const receiptParams = {
        storeName: activeStore.name,
        storeAddress: activeStore.address || undefined,
        storePhone: activeStore.phone || undefined,
        invoiceNumber: sale.invoiceNumber,
        createdAt: sale.createdAt,
        cashierName: undefined,
        customerName: sale.customerName || undefined,
        items: sale.items.map((i) => ({
          productName: i.productName,
          qty: i.qty,
          price: i.price,
          subtotal: i.subtotal,
        })),
        subtotal,
        discount,
        total: sale.totalAmount,
        paymentMethod: paymentLabel,
        paidAmount: sale.paidAmount,
        changeAmount: sale.changeAmount,
        receiptNote: activeStore.receiptNote || undefined,
      };

      const result = await PrinterService.printReceiptFromData(receiptParams);
      if (!result.success) {
        // Jika gagal karena printer tidak terhubung, tampilkan preview
        Alert.alert(
          'Cetak Struk',
          'Printer belum terhubung. Gunakan fitur Test Print di halaman Printer Struk untuk melihat preview.\n\nAtur printer di: Pengaturan > Printer Struk'
        );
      } else {
        Alert.alert('Berhasil', 'Struk berhasil dicetak.');
      }
    } catch (error) {
      Alert.alert('Gagal Cetak', 'Struk gagal dicetak. Periksa koneksi printer.');
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

      Alert.alert('Error', 'Gagal membuka WhatsApp');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingHorizontal: spacing.marginMobile,
          paddingTop: 16,
          paddingBottom: 120 + Math.max(insets.bottom, 28)
        }}
      >
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={40} color={colors.secondary} />
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

          {method === 'debt' && debtDueDate && (
            <View style={styles.dueDateBadge}>
              <Ionicons name="calendar-outline" size={14} color={isEstimated ? colors.onSurfaceVariant : colors.error} />
              <Text style={[styles.dueDateText, isEstimated && { fontStyle: 'italic' }]}>
                {isEstimated ? 'Est. Jatuh tempo: ' : 'Jatuh tempo: '}
                {formatDebtDate(debtDueDate)}
              </Text>
            </View>
          )}
        </View>

        {saleData && saleData.items.length > 0 && (
          <View style={styles.productsCard}>
            <View style={styles.productsHeader}>
              <Text style={styles.sectionTitle}>Informasi Produk</Text>
              <Text style={styles.productsCount}>{saleData.items.reduce((sum, item) => sum + item.qty, 0)} item</Text>
            </View>
            {visibleProducts.map((item) => (
              <View key={item.id} style={styles.productRow}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.productName}</Text>
                  <Text style={styles.productMeta}>{item.qty} x {formatRupiah(item.price)}</Text>
                </View>
                <Text style={styles.productSubtotal}>{formatRupiah(item.subtotal)}</Text>
              </View>
            ))}
            {hiddenProductsCount > 0 && (
              <Text style={styles.moreProductsText}>+{hiddenProductsCount} produk lainnya</Text>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.newTransactionButton} onPress={() => router.replace('/(tabs)')}>
          <Ionicons name="cart-outline" size={20} color={colors.primary} />
          <Text style={styles.newTransactionText}>Transaksi Baru</Text>
        </TouchableOpacity>
      </ScrollView>

      <AppFooterActions>
        <Button
          title="Kirim Nota WhatsApp"
          onPress={handleShareWhatsApp}
          size="lg"
          fullWidth
          icon={<Ionicons name="share-social-outline" size={20} color={colors.onPrimary} />}
        />
        <View style={{ height: spacing.stackSm }} />
        <Button
          title="Cetak Struk"
          onPress={handlePrintReceipt}
          variant="outline"
          size="lg"
          fullWidth
          icon={<Ionicons name="print-outline" size={20} color={colors.primary} />}
        />
      </AppFooterActions>

      <Text style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 28) }]}>Sistem Kasir {activeStore?.name || APP_NAME} v{APP_VERSION}</Text>

      <AppModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        type="premium"
        title="Printer Struk adalah fitur Premium"
        icon="diamond"
        message="Aktifkan Premium untuk menyiapkan printer thermal dan mencetak struk transaksi."
        benefits={[
          'Cetak struk transaksi',
          'Format struk 58mm dan 80mm',
          'Cocok untuk toko dan UMKM',
        ]}
        primaryAction={{
          label: 'Aktifkan Premium',
          onPress: () => {
            setPremiumModalVisible(false);
            router.push('/settings/activation');
          },
          variant: 'primary',
        }}
        secondaryAction={{
          label: 'Nanti',
          onPress: () => setPremiumModalVisible(false),
          variant: 'ghost',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  successCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: spacing.stackSm, paddingVertical: 8,
    alignItems: 'center', marginBottom: 20,
  },
  successIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.secondaryContainer, alignItems: 'center', justifyContent: 'center',
    marginBottom: 3,
  },
  successTitle: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  invoiceNumber: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  changeCard: {
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg,
    paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', marginBottom: 20,
  },
  changeLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  detailsCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: 8, marginBottom: spacing.stackMd,
  },
  productsCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: 8, marginBottom: spacing.stackMd,
  },
  productsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  sectionTitle: { ...typography.labelSm, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  productsCount: { ...typography.labelSm, color: colors.primary, fontWeight: '700' },
  productRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4,
    borderTopWidth: 1, borderTopColor: colors.surfaceContainerHigh,
  },
  productInfo: { flex: 1, marginRight: spacing.stackMd },
  productName: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  productMeta: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  productSubtotal: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  moreProductsText: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 4 },
  detailRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  detailBox: {
    flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    padding: 8,
  },
  detailLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: colors.secondaryContainer, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: borderRadius.full, alignSelf: 'center',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  statusText: { ...typography.bodyLg, color: colors.secondary, fontWeight: '600' },
  dueDateBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: colors.surfaceContainerLow, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: borderRadius.full, alignSelf: 'center', marginTop: 6,
  },
  dueDateText: { ...typography.bodyMd, color: colors.error, fontWeight: '600' },
  newTransactionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.stackMd,
    borderRadius: borderRadius.md,
    alignSelf: 'stretch',
    minHeight: spacing.touchTargetMin,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
    marginBottom: 20,
  },
  newTransactionText: { ...typography.bodyLg, color: colors.primary, fontWeight: '600', lineHeight: 20 },
  footer: { ...typography.labelSm, color: colors.onSurfaceVariant, textAlign: 'center', paddingTop: 12 },
});