import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../../src/config/theme';
import { CurrencyText } from '../../../src/components/CurrencyText';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { CustomerRepository } from '../../../src/database/customer.repo';
import { DebtRepository } from '../../../src/database/debt.repo';
import { Customer } from '../../../src/types/customer';
import { DebtWithCustomer } from '../../../src/types/debt';
import { useAppStore } from '../../../src/stores/app.store';
import { WhatsAppService } from '../../../src/services/whatsapp.service';

export default function DetailPelangganScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [debts, setDebts] = useState<DebtWithCustomer[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);

  const activeStore = useAppStore((state) => state.activeStore);

  useEffect(() => {
    if (id) {
      Promise.all([
        CustomerRepository.getById(id),
        DebtRepository.getByCustomerId(id),
      ]).then(([cust, debtList]) => {
        setCustomer(cust);
        setDebts(debtList as DebtWithCustomer[]);
        const total = debtList.reduce((sum, d) => sum + (d.remainingAmount || 0), 0);
        setTotalDebt(total);
      }).catch(console.error);
    }
  }, [id]);

  const handleCall = () => {
    if (customer?.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (customer?.phone && activeStore) {
      const totalPaid = debts.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
      const text = WhatsAppService.generateDebtReminderText(activeStore, customer.name, totalDebt + totalPaid, totalPaid, totalDebt);
      const cleaned = customer.phone.replace(/[^0-9]/g, '');
      const formatted = cleaned.startsWith('62') ? cleaned : `62${cleaned}`;
      Linking.openURL(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unpaid': return { text: 'BELUM LUNAS', color: colors.error, bg: '#ffebee' };
      case 'partial': return { text: 'CICILAN', color: '#2196f3', bg: '#e3f2fd' };
      case 'paid': return { text: 'LUNAS', color: colors.secondary, bg: '#e8f5e9' };
      default: return { text: status, color: colors.onSurfaceVariant, bg: colors.surfaceContainerLow };
    }
  };

  if (!customer) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingText}>Memuat data pelanggan...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Warung POS</Text>
        <Ionicons name="ellipsis-vertical" size={24} color={colors.primary} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Customer Info Card */}
        <Card style={styles.customerCard}>
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>
                {customer.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customer.name}</Text>
              {customer.phone && (
                <Text style={styles.customerPhone}>{customer.phone}</Text>
              )}
            </View>
            <View style={styles.customerActions}>
              <TouchableOpacity style={styles.actionButtonGreen} onPress={handleCall}>
                <Ionicons name="call-outline" size={20} color={colors.onPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonGray} onPress={handleWhatsApp}>
                <Ionicons name="chatbubble-outline" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Total Debt Card */}
        {totalDebt > 0 && (
          <View style={styles.debtCard}>
            <Text style={styles.debtLabel}>TOTAL HUTANG SAAT INI</Text>
            <CurrencyText amount={totalDebt} size="xxl" color={colors.primaryFixed} />
            <View style={styles.debtInfo}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primaryFixed} />
              <Text style={styles.debtInfoText}>
                Terakhir bon: {debts.length > 0 ? new Date(debts[0].createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
              </Text>
            </View>
          </View>
        )}

        {/* Debt List */}
        <Text style={styles.sectionTitle}>RINCIAN BON</Text>
        <Text style={styles.sectionSubtitle}>{debts.length} Transaksi</Text>

        {debts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={colors.surfaceContainerHigh} />
            <Text style={styles.emptyTitle}>Belum ada catatan bon</Text>
          </View>
        ) : (
          debts.map((debt) => {
            const statusBadge = getStatusBadge(debt.status);
            return (
              <Card key={debt.id} style={styles.debtItemCard}>
                <View style={styles.debtItemRow}>
                  <View style={styles.debtItemInfo}>
                    <Text style={styles.debtItemName}>
                      {debt.note || `Bon #${debt.id.substring(0, 8)}`}
                    </Text>
                    <Text style={styles.debtItemDate}>
                      {new Date(debt.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(debt.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={styles.debtItemAmount}>
                    <CurrencyText amount={debt.amount} size="sm" color={colors.primary} />
                    <View style={[styles.statusBadgeSmall, { backgroundColor: statusBadge.bg }]}>
                      <Text style={[styles.statusTextSmall, { color: statusBadge.color }]}>
                        {statusBadge.text}
                      </Text>
                    </View>
                  </View>
                </View>
                {debt.status === 'partial' && debt.paidAmount > 0 && (
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentLabel}>Sudah dibayar: </Text>
                    <CurrencyText amount={debt.paidAmount} size="sm" color={colors.secondary} />
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      {totalDebt > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
          <Button
            title="Bayar Cicilan / Pelunasan"
            onPress={() => Alert.alert('Coming Soon', 'Fitur pembayaran cicilan akan segera tersedia')}
            size="lg"
            fullWidth
            icon={<Ionicons name="wallet-outline" size={20} color={colors.onPrimary} />}
          />
          <Button
            title="Kirim Pengingat (WhatsApp)"
            onPress={handleWhatsApp}
            variant="outline"
            size="lg"
            fullWidth
          />
        </View>
      )}
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

  customerCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  customerRow: { flexDirection: 'row', alignItems: 'center' },
  customerAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.stackMd,
  },
  customerAvatarText: { ...typography.headlineMobile, fontWeight: '700', color: colors.onPrimary },
  customerInfo: { flex: 1 },
  customerName: { ...typography.headlineMobile, fontWeight: '700', color: colors.onSurface },
  customerPhone: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  customerActions: { flexDirection: 'row', gap: spacing.stackSm },
  actionButtonGreen: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center',
  },
  actionButtonGray: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
  },

  debtCard: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    padding: spacing.stackLg, marginBottom: spacing.stackLg,
  },
  debtLabel: { ...typography.labelSm, color: colors.primaryFixed, marginBottom: spacing.stackSm },
  debtInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.stackSm },
  debtInfoText: { ...typography.labelSm, color: colors.primaryFixed },

  sectionTitle: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface, marginBottom: 2 },
  sectionSubtitle: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd },

  debtItemCard: { padding: spacing.stackMd, marginBottom: spacing.stackSm },
  debtItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  debtItemInfo: { flex: 1, marginRight: spacing.stackMd },
  debtItemName: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface },
  debtItemDate: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  debtItemAmount: { alignItems: 'flex-end' },
  statusBadgeSmall: { marginTop: 4, paddingHorizontal: spacing.stackSm, paddingVertical: 2, borderRadius: borderRadius.sm },
  statusTextSmall: { ...typography.labelSm, fontSize: 10, fontWeight: '700' },
  paymentInfo: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.stackSm },
  paymentLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { ...typography.bodyLg, color: colors.onSurfaceVariant, marginTop: spacing.stackMd },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface, paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackMd, gap: spacing.stackSm,
    borderTopWidth: 1, borderTopColor: colors.outlineVariant,
  },
});
