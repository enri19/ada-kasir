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

export default function DetailTransaksiScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sale, setSale] = useState<SaleWithItems | null>(null);
  const activeStore = useAppStore((state) => state.activeStore);

  useEffect(() => {
    if (id) {
      SaleRepository.getById(id).then(setSale).catch(console.error);
    }
  }, [id]);

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Tunai';
      case 'qris': return 'QRIS';
      case 'transfer': return 'Transfer';
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

  if (!sale) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingText}>Memuat transaksi...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Transaksi</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card style={styles.infoCard}>
          <Text style={styles.invoiceNumber}>{sale.invoiceNumber}</Text>
          <Text style={styles.dateText}>
            {new Date(sale.createdAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <Text style={styles.timeText}>
            {new Date(sale.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </Text>
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
            <CurrencyText amount={sale.totalAmount + sale.changeAmount - (sale.paymentMethod === 'cash' ? sale.paidAmount - sale.changeAmount : 0)} size="md" />
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

        <View style={[styles.statusBadge, sale.status === 'paid' ? styles.statusPaid : styles.statusUnpaid]}>
          <View style={[styles.statusDot, sale.status === 'paid' ? styles.statusDotPaid : styles.statusDotUnpaid]} />
          <Text style={[styles.statusText, sale.status === 'paid' ? styles.statusTextPaid : styles.statusTextUnpaid]}>
            {sale.status === 'paid' ? 'Lunas' : sale.paymentMethod === 'debt' ? 'Bon' : 'Belum Lunas'}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
        <Button
          title="Kirim Nota WhatsApp"
          onPress={handleShareWhatsApp}
          size="lg"
          fullWidth
          icon={<Ionicons name="share-social-outline" size={20} color={colors.onPrimary} />}
        />
      </View>
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
  contentContainer: { padding: spacing.marginMobile, paddingBottom: 100 },
  loadingText: { ...typography.bodyLg, color: colors.onSurfaceVariant },

  infoCard: { padding: spacing.stackLg, marginBottom: spacing.stackLg, alignItems: 'center' },
  invoiceNumber: { ...typography.headlineMobile, fontWeight: '700', color: colors.onSurface },
  dateText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.stackSm },
  timeText: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },

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

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface, paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackMd, borderTopWidth: 1, borderTopColor: colors.outlineVariant,
  },
});
