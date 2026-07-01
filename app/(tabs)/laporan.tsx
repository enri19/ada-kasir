import { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Card } from '../../src/components/Card';
import { CurrencyText } from '../../src/components/CurrencyText';
import { ReportRepository } from '../../src/database/report.repo';
import { DailyReport, LowStockProduct } from '../../src/types/report';
import { useAppStore } from '../../src/stores/app.store';

export default function LaporanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const storeName = useAppStore((s) => s.activeStore?.name) ?? 'AdaKasir';

  const [report, setReport] = useState<DailyReport | null>(null);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const cacheRef = useRef('');

  const loadData = useCallback(async () => {
    try {
      const [daily, stock] = await Promise.all([
        ReportRepository.getDailyReport(),
        ReportRepository.getLowStockProducts(3),
      ]);
      const key = JSON.stringify({ daily, stock });
      if (key === cacheRef.current) return;
      cacheRef.current = key;
      setReport(daily);
      setLowStock(stock);
    } catch (e) {
      console.error('laporan load error', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    cacheRef.current = '';
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const cashIn = (report?.cashTotal ?? 0) + (report?.qrisTotal ?? 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="storefront" size={22} color={colors.primary} />
          <Text style={styles.headerTitle}>{storeName}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Date label */}
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>Laporan Harian</Text>
          <Text style={styles.dateValue}>{today}</Text>
        </View>

        {/* Omzet + Uang Masuk */}
        <View style={styles.row}>
          <Card style={styles.halfCard}>
            <View style={[styles.iconBox, { backgroundColor: '#ffebee' }]}>
              <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.cardLabel}>Omzet</Text>
            <CurrencyText amount={report?.totalSales ?? 0} size="md" color={colors.onSurface} />
          </Card>
          <Card style={styles.halfCard}>
            <View style={[styles.iconBox, { backgroundColor: '#e8f5e9' }]}>
              <Ionicons name="wallet-outline" size={20} color={colors.secondary} />
            </View>
            <Text style={styles.cardLabel}>Uang Masuk</Text>
            <CurrencyText amount={cashIn} size="md" color={colors.secondary} />
          </Card>
        </View>

        {/* Tunai / QRIS / Bon */}
        <Card style={styles.payCard}>
          <Text style={styles.sectionTitle}>Rincian Pembayaran</Text>
          <View style={styles.payRow}>
            <View style={styles.payItem}>
              <View style={[styles.payIcon, { backgroundColor: '#e8f5e9' }]}>
                <Ionicons name="cash-outline" size={18} color={colors.secondary} />
              </View>
              <Text style={styles.payLabel}>Tunai</Text>
              <CurrencyText amount={report?.cashTotal ?? 0} size="sm" color={colors.onSurface} />
            </View>
            <View style={styles.payItem}>
              <View style={[styles.payIcon, { backgroundColor: '#e3f2fd' }]}>
                <Ionicons name="qr-code-outline" size={18} color="#2196F3" />
              </View>
              <Text style={styles.payLabel}>QRIS</Text>
              <CurrencyText amount={report?.qrisTotal ?? 0} size="sm" color={colors.onSurface} />
            </View>
            <View style={styles.payItem}>
              <View style={[styles.payIcon, { backgroundColor: '#fff3e0' }]}>
                <Ionicons name="receipt-outline" size={18} color="#FF9800" />
              </View>
              <Text style={styles.payLabel}>Bon</Text>
              <CurrencyText amount={report?.debtTotal ?? 0} size="sm" color={colors.onSurface} />
            </View>
          </View>
        </Card>

        {/* Laba + Transaksi */}
        <View style={styles.row}>
          <Card style={styles.halfCard}>
            <View style={[styles.iconBox, { backgroundColor: '#fff3e0' }]}>
              <Ionicons name="stats-chart-outline" size={20} color="#FF9800" />
            </View>
            <Text style={styles.cardLabel}>Laba Kotor</Text>
            <CurrencyText amount={report?.totalProfit ?? 0} size="md" color={colors.onSurface} />
          </Card>
          <Card style={styles.halfCard}>
            <View style={[styles.iconBox, { backgroundColor: '#ede7f6' }]}>
              <Ionicons name="receipt-outline" size={20} color="#7E57C2" />
            </View>
            <Text style={styles.cardLabel}>Transaksi</Text>
            <Text style={styles.bigNumber}>{report?.totalTransactions ?? 0} Nota</Text>
          </Card>
        </View>

        {/* Stok menipis count */}
        {(report?.totalStockLow ?? 0) > 0 && (
          <Card style={[styles.alertCard]}>
            <Ionicons name="warning-outline" size={18} color="#E65100" />
            <Text style={styles.alertText}>
              {report!.totalStockLow} produk stok menipis
              {(report?.totalStockOut ?? 0) > 0 && `, ${report!.totalStockOut} habis`}
            </Text>
            <TouchableOpacity onPress={() => router.push('/produk/stok-menipis' as never)}>
              <Text style={styles.alertLink}>Lihat</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Produk Terlaris (maks 3) */}
        {(report?.topProducts.length ?? 0) > 0 && (
          <Card style={styles.listCard}>
            <Text style={styles.sectionTitle}>Produk Terlaris</Text>
            {report!.topProducts.slice(0, 3).map((p, i) => (
              <View key={i} style={styles.listRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <Text style={styles.listName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.listQty}>{p.qty} pcs</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Stok Menipis (maks 3) */}
        {lowStock.length > 0 && (
          <Card style={styles.listCard}>
            <Text style={styles.sectionTitle}>Stok Menipis</Text>
            {lowStock.map((p) => (
              <View key={p.id} style={styles.listRow}>
                <View style={[styles.rankBadge, p.stock <= 0 ? styles.rankDanger : styles.rankWarn]}>
                  <Ionicons
                    name={p.stock <= 0 ? 'close' : 'alert'}
                    size={12}
                    color={p.stock <= 0 ? colors.error : '#E65100'}
                  />
                </View>
                <Text style={styles.listName} numberOfLines={1}>{p.name}</Text>
                <Text style={[styles.listQty, p.stock <= 0 && styles.textDanger]}>
                  {p.stock <= 0 ? 'Habis' : `Sisa ${p.stock}`}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => router.push('/laporan/detail' as never)}
          activeOpacity={0.85}
        >
          <Ionicons name="bar-chart-outline" size={18} color={colors.onPrimary} />
          <Text style={styles.detailBtnText}>Lihat Detail Laporan</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.onPrimary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { ...typography.headlineMobile, color: colors.primary },
  content: { flex: 1 },
  scroll: { padding: spacing.marginMobile },
  dateRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.stackMd,
  },
  dateLabel: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  dateValue: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  row: { flexDirection: 'row', gap: spacing.stackSm, marginBottom: spacing.stackSm },
  halfCard: { flex: 1, padding: spacing.stackMd },
  iconBox: {
    width: 36, height: 36, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  cardLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 4 },
  bigNumber: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  payCard: { padding: spacing.stackMd, marginBottom: spacing.stackSm },
  sectionTitle: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface, marginBottom: spacing.stackSm },
  payRow: { flexDirection: 'row', gap: spacing.stackSm },
  payItem: {
    flex: 1, alignItems: 'center', padding: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
  },
  payIcon: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  payLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 2 },
  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: spacing.stackMd, marginBottom: spacing.stackSm,
    backgroundColor: '#fff8e1',
  },
  alertText: { ...typography.bodyMd, color: '#E65100', flex: 1 },
  alertLink: { ...typography.labelSm, color: colors.primary, fontWeight: '700' },
  listCard: { padding: spacing.stackMd, marginBottom: spacing.stackSm },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.outlineVariant,
  },
  rankBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  rankDanger: { backgroundColor: '#ffebee' },
  rankWarn: { backgroundColor: '#fff3e0' },
  rankText: { ...typography.labelSm, fontSize: 10, fontWeight: '700', color: colors.onSurfaceVariant },
  listName: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  listQty: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: '600' },
  textDanger: { color: colors.error },
  detailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.primary,
    borderRadius: borderRadius.lg, paddingVertical: 14,
    marginTop: spacing.stackMd,
  },
  detailBtnText: { ...typography.bodyLg, color: colors.onPrimary, fontWeight: '700', flex: 1, textAlign: 'center' },
});
