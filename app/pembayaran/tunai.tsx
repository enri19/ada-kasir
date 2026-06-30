import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { CurrencyText } from '../../src/components/CurrencyText';
import { Button } from '../../src/components/Button';
import { useCartStore } from '../../src/stores/cart.store';
import { SaleRepository } from '../../src/database/sales.repo';
import { StockService } from '../../src/services/stock.service';
import { generateInvoiceNumber } from '../../src/utils/invoice-number';
import { formatRupiah } from '../../src/utils/currency';
import { useAppStore } from '../../src/stores/app.store';
import { CustomHeader } from '../../src/components/CustomHeader';

const QUICK_AMOUNTS = [20000, 50000, 100000];

export default function PembayaranTunaiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const discount = useCartStore((state) => state.discount);
  const clearCart = useCartStore((state) => state.clearCart);
  const resetPayment = useCartStore((state) => state.resetPayment);
  const [receivedAmount, setReceivedAmount] = useState('0');
  const [processing, setProcessing] = useState(false);

  const activeStore = useAppStore((state) => state.activeStore);
  const storeName = activeStore?.name || 'Warung Madura';

  const totalPrice = getTotal();
  const subtotalPrice = getSubtotal();
  const received = parseInt(receivedAmount, 10) || 0;
  const change = Math.max(0, received - totalPrice);
  const isPaid = received >= totalPrice;

  const formatAmount = (value: string): string => {
    const num = parseInt(value, 10) || 0;
    return num.toLocaleString('id-ID');
  };

  const displayReceived = formatAmount(receivedAmount);

  const handleNumpad = (value: string) => {
    if (value === 'backspace') {
      setReceivedAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (value === 'clear') {
      setReceivedAmount('0');
    } else {
      setReceivedAmount(prev => prev === '0' ? value : prev + value);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setReceivedAmount(String(amount));
  };

  const handleUangPas = () => {
    setReceivedAmount(String(totalPrice));
  };

  const handleProcessPayment = async () => {
    if (!isPaid || processing) return;
    if (totalPrice <= 0) {
      Alert.alert('Error', 'Total transaksi Rp0');
      return;
    }

    setProcessing(true);
    try {
      const todayCount = await SaleRepository.getTodayCount();
      const invoiceNumber = generateInvoiceNumber(todayCount);

      const saleItems = items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        qty: item.qty,
        price: item.product.sellPrice,
        costPrice: item.product.costPrice,
        subtotal: item.subtotal,
      }));

      await SaleRepository.createSale(
        invoiceNumber,
        null,
        totalPrice,
        received,
        change,
        'cash',
        'paid',
        saleItems
      );

      await StockService.reduceStockForSaleItems(items, invoiceNumber, 'sale');

      clearCart();
      resetPayment();
      router.replace({
        pathname: '/transaksi/berhasil',
        params: {
          invoiceNumber,
          change: String(change),
          total: String(totalPrice),
          received: String(received),
          paymentMethod: 'cash',
        },
      });
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Gagal memproses pembayaran');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <CustomHeader title="Pembayaran Tunai" onBack={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL TAGIHAN</Text>
          <CurrencyText amount={totalPrice} size="xl" color={colors.primary} />
          {discount > 0 && (
            <Text style={styles.discountInfo}>
              Subtotal {formatRupiah(subtotalPrice)} - Diskon {formatRupiah(discount)}
            </Text>
          )}

          <View style={styles.changeSection}>
            <Text style={styles.changeLabel}>Kembalian</Text>
            <View style={styles.changeBox}>
              <CurrencyText amount={change} size="lg" color={isPaid ? colors.secondary : colors.error} />
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusCheckbox, isPaid && styles.statusCheckboxPaid]} />
              <Text style={[styles.statusText, isPaid && styles.statusTextPaid]}>Lunas</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Uang Diterima</Text>
        <View style={styles.receivedInput}>
          <Text style={styles.receivedPrefix}>Rp</Text>
          <Text style={styles.receivedAmount}>{displayReceived}</Text>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.uangPasButton} onPress={handleUangPas}>
            <Text style={styles.uangPasText}>Uang Pas</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickAmounts}>
          {QUICK_AMOUNTS.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={styles.quickAmountButton}
              onPress={() => handleQuickAmount(amount)}
            >
              <Text style={styles.quickAmountText}>{formatRupiah(amount)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.numpad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '00', 0, 'backspace'].map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.numpadButton}
              onPress={() => handleNumpad(String(key))}
            >
              {key === 'backspace' ? (
                <Ionicons name="backspace-outline" size={20} color={colors.onSurface} />
              ) : (
                <Text style={styles.numpadText}>{key}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          title="Simpan Transaksi"
          onPress={handleProcessPayment}
          size="lg"
          fullWidth
          disabled={!isPaid}
          loading={processing}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  contentContainer: { padding: spacing.marginMobile, paddingBottom: 80 },
  totalCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.stackMd, marginBottom: spacing.stackMd,
  },
  totalLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 4 },
  discountInfo: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 4 },
  changeSection: { marginTop: spacing.stackMd, alignItems: 'flex-end' },
  changeLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 4 },
  changeBox: {
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    padding: spacing.stackSm, minWidth: 100, alignItems: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  statusCheckbox: { width: 14, height: 14, borderRadius: 3, borderWidth: 2, borderColor: colors.outlineVariant },
  statusCheckboxPaid: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  statusText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  statusTextPaid: { color: colors.secondary, fontWeight: '600' },
  sectionTitle: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface, marginBottom: 8 },
  receivedInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.stackMd, marginBottom: 8,
  },
  receivedPrefix: { ...typography.bodyLg, color: colors.onSurfaceVariant, marginRight: 4 },
  receivedAmount: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  quickActions: { marginBottom: 6 },
  uangPasButton: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingVertical: 10, alignItems: 'center',
  },
  uangPasText: { ...typography.bodyMd, fontWeight: '700', color: colors.onPrimary },
  quickAmounts: { flexDirection: 'row', gap: 6, marginBottom: spacing.stackMd },
  quickAmountButton: {
    flex: 1, backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md, paddingVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  quickAmountText: { ...typography.labelSm, color: colors.onSurface, fontWeight: '600' },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  numpadButton: {
    flex: 1, minWidth: '30%', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  numpadText: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface },
  bottomBar: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackSm,
    borderTopWidth: 1, borderTopColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
});
