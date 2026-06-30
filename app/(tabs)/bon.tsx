import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Card } from '../../src/components/Card';
import { CurrencyText } from '../../src/components/CurrencyText';
import { DebtRepository } from '../../src/database/debt.repo';
import { DebtWithCustomer } from '../../src/types/debt';
import { useAppStore } from '../../src/stores/app.store';

export default function BonScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [debts, setDebts] = useState<DebtWithCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [totalDebt, setTotalDebt] = useState(0);
  const debtsJsonRef = useRef('');

  const activeStore = useAppStore((state) => state.activeStore);
  const storeName = activeStore?.name || 'Warung Madura';

  const loadData = useCallback(async () => {
    try {
      const data = await DebtRepository.getAll();
      const payload = JSON.stringify(data);
      if (payload !== debtsJsonRef.current) {
        debtsJsonRef.current = payload;
        setDebts(data);
        const total = data.reduce((sum, d) => sum + (d.remainingAmount || 0), 0);
        setTotalDebt(total);
      }
    } catch (error) {
      console.error('Error loading debts:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredDebts = debts.filter((d) =>
    d.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusInfo = (status: string, remainingAmount: number, createdAt: string, dueDate?: string | null) => {
    if (status === 'paid') return { text: 'LUNAS', color: colors.secondary, bg: '#e8f5e9' };
    if (remainingAmount > 0) {
      const daysSince = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 7) return { text: 'MENDESAK', color: '#f44336', bg: '#ffebee' };
      if (dueDate && new Date(dueDate) < new Date()) return { text: 'JATUH TEMPO', color: '#ff9800', bg: '#fff3e0' };
      return { text: 'BELUM LUNAS', color: colors.error, bg: '#ffebee' };
    }
    return { text: 'CICILAN', color: '#2196f3', bg: '#e3f2fd' };
  };

  const getTimeAgo = (dateStr: string) => {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes} menit yang lalu`;
    if (hours < 24) return `${hours} jam yang lalu`;
    if (days === 1) return 'Kemarin';
    if (days < 7) return `${days} hari lalu`;
    return 'Minggu lalu';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="storefront" size={24} color={colors.primary} />
          <Text style={styles.headerTitle}>{storeName}</Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Online</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL PIUTANG</Text>
          <CurrencyText amount={totalDebt} size="xl" color={colors.primary} />
          <TouchableOpacity style={styles.bonButton}>
            <Ionicons name="receipt" size={24} color={colors.onPrimary} />
          </TouchableOpacity>
        </Card>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama pelanggan..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <Text style={styles.sectionTitle}>DAFTAR PELANGGAN BERHUTANG</Text>

        {filteredDebts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color={colors.surfaceContainerHigh} />
            <Text style={styles.emptyTitle}>Belum ada catatan bon</Text>
            <Text style={styles.emptyText}>Bon akan muncul ketika ada transaksi dengan metode pembayaran Bon</Text>
          </View>
        ) : (
          filteredDebts.map((debt) => {
            const statusInfo = getStatusInfo(debt.status, debt.remainingAmount, debt.createdAt, debt.dueDate);
            return (
              <TouchableOpacity
                key={debt.id}
                style={styles.debtCard}
                onPress={() => router.push(`/pelanggan/detail/${debt.customerId}`)}
              >
                <Card style={styles.debtCardInner}>
                  <View style={styles.debtRow}>
                    <View style={styles.initialsCircle}>
                      <Text style={styles.initialsText}>
                        {debt.customerName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.debtInfo}>
                      <Text style={styles.debtName}>{debt.customerName}</Text>
                      <View style={styles.debtTime}>
                        <Ionicons name="time-outline" size={14} color={colors.onSurfaceVariant} />
                        <Text style={styles.debtTimeText}>{getTimeAgo(debt.createdAt)}</Text>
                      </View>
                    </View>
                    <View style={styles.debtAmount}>
                      <CurrencyText amount={debt.remainingAmount} size="sm" color={colors.primary} />
                      <View style={[styles.statusBadgeSmall, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.statusTextSmall, { color: statusInfo.color }]}>
                          {statusInfo.text}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.addBonButton, { bottom: 16 + insets.bottom }]}
        onPress={() => router.push('/pelanggan/tambah')}
      >
        <Ionicons name="person-add" size={20} color={colors.onPrimary} />
        <Text style={styles.addBonText}>Tambah Bon Baru</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, paddingVertical: spacing.stackSm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  headerTitle: { ...typography.headlineMobile, color: colors.primary },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.secondaryContainer, paddingHorizontal: spacing.stackSm, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary, marginRight: 6 },
  statusText: { ...typography.labelSm, color: colors.secondary },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile, paddingBottom: 100 },
  totalCard: { padding: spacing.stackLg, marginBottom: spacing.stackLg, position: 'relative' },
  totalLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  bonButton: {
    position: 'absolute', top: spacing.stackLg, right: spacing.stackLg,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.stackLg, minHeight: 36,
  },
  searchInput: { flex: 1, marginLeft: spacing.stackSm, ...typography.bodyMd, color: colors.onSurface, paddingVertical: 0 },
  sectionTitle: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd },
  debtCard: { marginBottom: spacing.stackSm },
  debtCardInner: { padding: spacing.stackMd },
  debtRow: { flexDirection: 'row', alignItems: 'center' },
  initialsCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.stackMd,
  },
  initialsText: { ...typography.bodyLg, fontWeight: '700', color: colors.primary },
  debtInfo: { flex: 1 },
  debtName: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface, marginBottom: 4 },
  debtTime: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  debtTimeText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  debtAmount: { alignItems: 'flex-end' },
  statusBadgeSmall: { marginTop: 4, paddingHorizontal: spacing.stackSm, paddingVertical: 2, borderRadius: borderRadius.sm },
  statusTextSmall: { ...typography.labelSm, fontSize: 10, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { ...typography.headlineMobile, color: colors.onSurface, marginTop: spacing.stackMd },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.stackSm, textAlign: 'center' },
  addBonButton: {
    position: 'absolute', left: spacing.marginMobile, right: spacing.marginMobile,
    backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: borderRadius.lg, gap: spacing.stackSm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  addBonText: { ...typography.bodyLg, fontWeight: '700', color: colors.onPrimary },
});
