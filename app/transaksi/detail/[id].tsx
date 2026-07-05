import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../../src/config/theme';
import { CurrencyText } from '../../../src/components/CurrencyText';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { SaleRepository } from '../../../src/database/sales.repo';
import { SaleWithItems } from '../../../src/types/sale';
import { useAppStore } from '../../../src/stores/app.store';
import { WhatsAppService } from '../../../src/services/whatsapp.service';
import { PrinterService } from '../../../src/services/printer.service';
import { useLicenseStore } from '../../../src/stores/license.store';
import { AppModal } from '../../../src/components/ui/AppModal';
import { BottomActionBar } from '../../../src/components/BottomActionBar';
import { AppFooterActions } from '../../../src/components/ui/AppFooterActions';

export default function DetailTransaksiScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sale, setSale] = useState<SaleWithItems | null>(null);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const activeStore = useAppStore((state) => state.activeStore);
  const licenseStatus = useLicenseStore((state) => state.status);
  const isPremium = licenseStatus === 'premium_active';

  useEffect(() => {
    if (id) {
      SaleRepository.getById(id).then(setSale).catch(console.error);
    }
  }, [id]);

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Tunai';
      case 'qris': return 'QRIS';
      case 'qris_static': return 'QRIS';
      case 'debt': return 'Bon';
      default: return method;
    }
  };

  const handleShareWhatsApp = async () => {
    if (sale && activeStore) {
      const receiptText = WhatsAppService.generateReceiptText(activeStore, sale);
      const encoded = encodeURIComponent(receiptText);
      await Linking.openURL(`https://wa.me/?text=${encoded}`);
    }
  };

  const handlePrintReceipt = async () => {
    if (!isPremium) {
      setPremiumModalVisible(true);
      return;
    }

    if (!sale || !activeStore) {
      Alert.alert('Error', 'Data transaksi tidak ditemukan');
      return;
    }

    try {
      const subtotal = sale.items.reduce((sum, item) => sum + item.subtotal, 0);
      const discount = Math.max(0, subtotal - sale.totalAmount);
      const paymentLabel = (() => {
        switch (sale.paymentMethod) {
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

      const result = await PrinterService.printReceiptPreview(receiptParams);
      Alert.alert('Preview Struk', result);
    } catch (error: any) {
      Alert.alert('Gagal Cetak', error?.message || 'Struk gagal dicetak.');
    }
  };

  if (!sale) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingText}>Memuat transaksi...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Transaksi</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{
        padding: spacing.marginMobile,
        paddingBottom: 120 + Math.max(insets.bottom, 28)
      }}>
        <Card style={styles.infoCard}>
          <Text style={styles.invoiceNumber}>{sale.invoiceNumber}</Text>
          <Text style={styles.dateText}>
            {new Date(sale.createdAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <Text style={styles.timeText}>
            {new Date(sale.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {sale.customerName ? (
            <Text style={styles.customerName}>Pelanggan: {sale.customerName}</Text>
          ) : null}
        </Card>

        <Text style={styles.sectionTitle}>ITEM TRANSAKSI</Text>
        {sale.items.map((item) => (
          <Card key={item.id} style={styles.itemCard}>
            <View style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemDetail}>{item.qty} x <CurrencyText amount={item.price} size="sm" /></Text>
              </View>
              <CurrencyText amount={item.subtotal} size="md" color={colors.primary} />
            </View>
          </Card>
        ))}

        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <CurrencyText amount={sale.items.reduce((sum, i) => sum + (i.qty * i.price), 0)} size="md" />
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Metode Bayar</Text>
            <Text style={styles.summaryValue}>{getMethodLabel(sale.paymentMethod)}</Text>
          </View>
          {sale.paymentMethod === 'cash' && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Bayar</Text>
                <CurrencyText amount={sale.paidAmount} size="md" />
              </View>
              {sale.changeAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Kembalian</Text>
                  <CurrencyText amount={sale.changeAmount} size="md" color={colors.secondary} />
                </View>
              )}
            </>
          )}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <CurrencyText amount={sale.totalAmount} size="lg" color={colors.primary} />
          </View>
        </Card>

        {sale.paymentMethod === 'debt' && (
          <Card style={styles.debtInfoCard}>
            <Text style={styles.debtInfoTitle}>Informasi Bon</Text>
            {sale.customerName ? (
              <View style={styles.debtInfoRow}>
                <Text style={styles.debtInfoLabel}>Pelanggan:</Text>
                <Text style={styles.debtInfoValue}>{sale.customerName}</Text>
              </View>
            ) : null}
            {sale.debtStatus ? (
              <View style={styles.debtInfoRow}>
                <Text style={styles.debtInfoLabel}>Status:</Text>
                <Text style={styles.debtInfoValue}>
                  {sale.debtStatus === 'paid' ? 'Lunas' : sale.debtStatus === 'partial' ? 'Sebagian' : 'Belum Lunas'}
                </Text>
              </View>
            ) : null}
            {sale.debtDueDate ? (
              <View style={styles.debtInfoRow}>
                <Text style={styles.debtInfoLabel}>Jatuh Tempo:</Text>
                <Text style={styles.debtInfoValue}>
                  {new Date(sale.debtDueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            ) : null}
          </Card>
        )}

        <View style={[styles.statusBadge, sale.status === 'paid' ? styles.statusPaid : styles.statusUnpaid]}>
          <View style={[styles.statusDot, sale.status === 'paid' ? styles.statusDotPaid : styles.statusDotUnpaid]} />
          <Text style={[styles.statusText, sale.status === 'paid' ? styles.statusTextPaid : styles.statusTextUnpaid]}>
            {sale.status === 'paid' ? 'Lunas' : sale.paymentMethod === 'debt' ? 'Bon' : 'Belum Lunas'}
          </Text>
        </View>
      </ScrollView>

      <BottomActionBar>
        <Button
          title="Kirim Nota WhatsApp"
          onPress={handleShareWhatsApp}
          size="lg"
          fullWidth
          icon={<Ionicons name="share-social-outline" size={20} color={colors.onPrimary} />}
        />
        <View style={styles.bottomButtonSpacing} />
        <Button
          title={isPremium ? "Cetak Struk" : "Cetak Struk (Premium)"}
          onPress={handlePrintReceipt}
          size="lg"
          fullWidth
          variant="outline"
          icon={<Ionicons name="print-outline" size={20} color={colors.primary} />}
        />
      </BottomActionBar>

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
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, paddingVertical: spacing.stackMd,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  headerTitle: { ...typography.headlineMobile, color: colors.primary, fontWeight: '700' },
  content: { flex: 1 },
  loadingText: { ...typography.bodyLg, color: colors.onSurfaceVariant },

  infoCard: { padding: spacing.stackLg, marginBottom: spacing.stackLg, alignItems: 'center' },
  invoiceNumber: { ...typography.headlineMobile, fontWeight: '700', color: colors.onSurface },
  dateText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.stackSm },
  timeText: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  customerName: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 6, fontStyle: 'italic' },

  sectionTitle: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  itemCard: { padding: spacing.stackMd, marginBottom: spacing.stackSm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemName: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface },
  itemDetail: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },

  summaryCard: { padding: spacing.stackMd, marginTop: spacing.stackLg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.stackSm },
  summaryLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  summaryValue: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface },
  totalLabel: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  divider: { height: 1, backgroundColor: colors.outlineVariant, marginVertical: spacing.stackSm },

  statusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.stackSm, marginTop: spacing.stackLg },
  statusPaid: { backgroundColor: '#e8f5e9' },
  statusUnpaid: { backgroundColor: '#ffebee' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotPaid: { backgroundColor: colors.secondary },
  statusDotUnpaid: { backgroundColor: colors.error },
  statusText: { ...typography.bodyLg, fontWeight: '600' },
  statusTextPaid: { color: colors.secondary },
  statusTextUnpaid: { color: colors.error },

  debtInfoCard: { padding: spacing.stackMd, marginBottom: spacing.stackSm, backgroundColor: '#fff8e1' },
  debtInfoTitle: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface, marginBottom: spacing.stackSm },
  debtInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.stackSm },
  debtInfoLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  debtInfoValue: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface },

  bottomButtonSpacing: { height: spacing.stackSm },
});