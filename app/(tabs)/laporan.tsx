import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
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
  const [report, setReport] = useState<DailyReport | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const reportJsonRef = useRef('');

  const activeStore = useAppStore((state) => state.activeStore);
  const storeName = activeStore?.name || 'AdaKasir';

  const loadData = useCallback(async () => {
    try {
      const [dailyReport, lowStockItems, transactions] = await Promise.all([
        ReportRepository.getDailyReport(),
        ReportRepository.getLowStockProducts(5),
        ReportRepository.getRecentTransactions(5),
      ]);
      const payload = JSON.stringify({ dailyReport, lowStockItems, transactions });
      if (payload !== reportJsonRef.current) {
        reportJsonRef.current = payload;
        setReport(dailyReport);
        setLowStockProducts(lowStockItems);
        setRecentTransactions(transactions);
      }
    } catch (error) {
      console.error('Error loading report:', error);
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

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Tunai';
      case 'qris_static': return 'QRIS';
      case 'debt': return 'Bon';
      default: return method;
    }
  };

  const getStatusInfo = (status: string, method: string) => {
    if (status === 'paid') return { text: 'LUNAS', color: colors.secondary, bg: '#e8f5e9', icon: 'checkmark' as const };
    if (method === 'debt') return { text: 'BON', color: colors.error, bg: '#ffebee', icon: 'time-outline' as const };
    return { text: status.toUpperCase(), color: colors.onSurfaceVariant, bg: colors.surfaceContainerLow, icon: 'time-outline' as const };
  };

  const formatHourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
  const formatNumber = (value: number) => value.toLocaleString('id-ID');

  const hourlyChartData = Array.from({ length: 24 }, (_, index) => {
    const item = (report?.hourlySales || []).find((entry) => entry.hour === index);
    return { hour: index, total: item?.total || 0 };
  });

  const maxHourlySales = hourlyChartData.reduce((max, item) => Math.max(max, item.total), 0) || 1;
  const peakHourData = hourlyChartData.reduce(
    (peak, item) => (item.total > peak.total ? item : peak),
    hourlyChartData[0] || { hour: 0, total: 0 }
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="storefront" size={24} color={colors.primary} />
          <Text style={styles.headerTitle}>{storeName}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.reportHeader}>
          <Text style={styles.reportLabel}>DASHBOARD OVERVIEW</Text>
          <View style={styles.reportTitleRow}>
            <Text style={styles.reportTitle}>Laporan Harian</Text>
            <Text style={styles.reportDate}>Hari Ini{'\n'}{today}</Text>
          </View>
        </View>

        <Card style={styles.statCard}>
          <View style={styles.statHeader}>
            <View style={[styles.statIcon, { backgroundColor: '#ffebee' }]}>
              <Ionicons name="cash-outline" size={24} color={colors.primary} />
            </View>
          </View>
          <Text style={styles.statLabel}>Total Penjualan</Text>
          <CurrencyText amount={report?.totalSales || 0} size="lg" color={colors.onSurface} />
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statHeader}>
            <View style={[styles.statIcon, { backgroundColor: '#e8f5e9' }]}>
              <Ionicons name="receipt-outline" size={24} color={colors.secondary} />
            </View>
          </View>
          <Text style={styles.statLabel}>Total Transaksi</Text>
          <Text style={styles.statValue}>{report?.totalTransactions || 0} Nota</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statHeader}>
            <View style={[styles.statIcon, { backgroundColor: '#fff3e0' }]}>
              <Ionicons name="trending-up-outline" size={24} color="#ff9800" />
            </View>
          </View>
          <Text style={styles.statLabel}>Estimasi Laba</Text>
          <CurrencyText amount={report?.totalProfit || 0} size="lg" color={colors.onSurface} />
        </Card>

        {(report?.totalDebt || 0) > 0 && (
          <Card style={[styles.statCard, styles.urgentCard]}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: '#ffebee' }]}>
                <Ionicons name="receipt-outline" size={24} color={colors.error} />
              </View>
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            </View>
            <Text style={[styles.statLabel, { color: colors.error }]}>Bon Belum Lunas</Text>
            <CurrencyText amount={report?.totalDebt || 0} size="lg" color={colors.error} />
          </Card>
        )}

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ringkasan Pembayaran</Text>
          <View style={styles.paymentRow}>
            <View style={styles.paymentItem}>
              <View style={[styles.paymentIcon, { backgroundColor: '#e8f5e9' }]}>
                <Ionicons name="cash-outline" size={20} color={colors.secondary} />
              </View>
              <Text style={styles.paymentLabel}>Tunai</Text>
              <CurrencyText amount={report?.cashTotal || 0} size="sm" color={colors.onSurface} />
            </View>
            <View style={styles.paymentItem}>
              <View style={[styles.paymentIcon, { backgroundColor: '#e3f2fd' }]}>
                <Ionicons name="qr-code-outline" size={20} color="#2196F3" />
              </View>
              <Text style={styles.paymentLabel}>QRIS</Text>
              <CurrencyText amount={report?.qrisTotal || 0} size="sm" color={colors.onSurface} />
            </View>
            <View style={styles.paymentItem}>
              <View style={[styles.paymentIcon, { backgroundColor: '#fff3e0' }]}>
                <Ionicons name="receipt-outline" size={20} color="#FF9800" />
              </View>
              <Text style={styles.paymentLabel}>Bon</Text>
              <CurrencyText amount={report?.debtTotal || 0} size="sm" color={colors.onSurface} />
            </View>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Omzet Hari Ini</Text>
            <CurrencyText amount={report?.totalSales || 0} size="md" color={colors.primary} />
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Uang Masuk (Tunai + QRIS)</Text>
            <CurrencyText amount={(report?.cashTotal || 0) + (report?.qrisTotal || 0)} size="md" color={colors.secondary} />
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ringkasan Stok</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Produk</Text>
            <Text style={styles.statValue}>{report?.totalProducts || 0}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Produk Aktif</Text>
            <Text style={styles.statValue}>{report?.totalActiveProducts || 0}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Stok Menipis</Text>
            <Text style={styles.statValue}>{report?.totalStockLow || 0}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Stok Habis</Text>
            <Text style={styles.statValue}>{report?.totalStockOut || 0}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Nilai Stok</Text>
            <CurrencyText amount={report?.totalStockValue || 0} size="md" color={colors.onSurface} />
          </View>
        </Card>

        {lowStockProducts.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Produk Stok Menipis</Text>
              <TouchableOpacity onPress={() => router.push('/produk?inventory=low')}>
                <Text style={styles.seeAllText}>Lihat Semua</Text>
              </TouchableOpacity>
            </View>
            {lowStockProducts.map((product) => (
              <View key={product.id} style={styles.productRow}>
                <View style={styles.productImage}>
                  <Text style={styles.productImageText}>img</Text>
                </View>
                <Text style={[styles.productName, { flex: 1 }]}>{product.name}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.productQty, product.stock <= 0 && styles.stockLow]}>
                    {product.stock} / {product.minStock}
                  </Text>
                  <Text style={[styles.summaryLabel, { textAlign: 'right' }]}> {product.stock <= 0 ? 'Habis' : 'Menipis'}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {report && report.topProducts.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Produk Terlaris</Text>
            </View>

            {report.topProducts.map((product, index) => {
              const maxQty = report.topProducts[0]?.qty || 1;
              return (
                <View key={index} style={styles.productRow}>
                  <View style={styles.productImage}>
                    <Text style={styles.productImageText}>img</Text>
                  </View>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productQty}>{product.qty} Pcs</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${(product.qty / maxQty) * 100}%` }]} />
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {hourlyChartData.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Waktu Teramai (24 Jam)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={styles.chartScrollContent}
            >
              <View style={styles.chartContainer}>
                {hourlyChartData.map((item) => {
                  const height = item.total > 0 ? (item.total / maxHourlySales) * 100 : 0;
                  const isActive = item.total > 0 && item.total === peakHourData.total;
                  return (
                    <View key={item.hour} style={styles.chartColumn}>
                      <View style={styles.chartBar}>
                        <View style={[styles.chartBarFill, { height: `${height}%` }, isActive && styles.chartBarActive]} />
                      </View>
                      <Text style={styles.chartLabel}>{formatHourLabel(item.hour)}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <Text style={styles.chartSummary}>
              Jam puncak: {peakHourData.total > 0 ? `${formatHourLabel(peakHourData.hour)} (${formatNumber(peakHourData.total)} transaksi)` : 'Belum ada data'}
            </Text>
          </Card>
        )}

        <Text style={styles.sectionTitle}>Transaksi Terakhir</Text>

        {recentTransactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color={colors.surfaceContainerHigh} />
            <Text style={styles.emptyText}>Belum ada transaksi hari ini</Text>
          </Card>
        ) : (
          recentTransactions.map((trx) => {
            const statusInfo = getStatusInfo(trx.status, trx.paymentMethod);
            return (
              <TouchableOpacity
                key={trx.id}
                style={styles.transactionCard}
                onPress={() => router.push(`/transaksi/detail/${trx.id}`)}
              >
                <Card style={styles.transactionCardInner}>
                  <View style={styles.transactionRow}>
                    <View style={[styles.transactionIcon, trx.status === 'paid' ? styles.transactionIconPaid : styles.transactionIconPending]}>
                      <Ionicons name={statusInfo.icon} size={20} color={trx.status === 'paid' ? colors.secondary : '#ff9800'} />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionId}>#{trx.invoiceNumber}</Text>
                      <Text style={styles.transactionTime}>
                        {new Date(trx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {getMethodLabel(trx.paymentMethod)}
                      </Text>
                    </View>
                    <View style={styles.transactionAmount}>
                      <CurrencyText amount={trx.totalAmount} size="sm" color={colors.onSurface} />
                      <View style={[styles.transactionStatus, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.transactionStatusText, { color: statusInfo.color }]}>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.secondaryContainer, paddingHorizontal: spacing.stackSm, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary, marginRight: 6 },
  statusText: { ...typography.labelSm, color: colors.secondary },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile, paddingBottom: 100 },
  reportHeader: { marginBottom: spacing.stackLg },
  reportLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 4 },
  reportTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  reportTitle: { ...typography.headlineLg, color: colors.onSurface },
  reportDate: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'right' },
  statCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.stackSm },
  statIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 4 },
  statValue: { ...typography.headlineMobile, fontWeight: '700', color: colors.onSurface },
  urgentCard: { backgroundColor: '#ffebee', borderColor: colors.error },
  urgentBadge: { backgroundColor: colors.error, paddingHorizontal: spacing.stackSm, paddingVertical: 2, borderRadius: borderRadius.sm },
  urgentText: { ...typography.labelSm, color: colors.onPrimary, fontSize: 10, fontWeight: '700' },
  sectionCard: { padding: spacing.stackMd, marginBottom: spacing.stackLg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.stackMd },
  sectionTitle: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface, marginBottom: spacing.stackMd },
  seeAllText: { ...typography.labelSm, color: colors.primary },
  productRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.stackSm },
  productImage: {
    width: 40, height: 40, borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.stackSm,
  },
  productImageText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 10 },
  productName: { flex: 1, ...typography.bodyMd, color: colors.onSurface },
  productQty: { ...typography.labelSm, color: colors.primary, fontWeight: '700', marginRight: spacing.stackSm },
  stockLow: { color: colors.error },
  progressBar: { width: 60, height: 4, backgroundColor: colors.surfaceContainerHigh, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  chartScrollContent: { paddingBottom: spacing.stackSm },
  chartContainer: { flexDirection: 'row', height: 152, gap: spacing.stackSm },
  chartColumn: { width: 34, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: { width: 18, height: 120, justifyContent: 'flex-end' },
  chartBarFill: { backgroundColor: colors.surfaceContainerHigh, borderRadius: 2, width: '100%' },
  chartBarActive: { backgroundColor: colors.primary },
  chartLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 9, marginTop: spacing.stackSm, textAlign: 'center' },
  chartSummary: { ...typography.bodyMd, color: colors.primary, fontWeight: '700' },
  transactionCard: { marginBottom: spacing.stackSm },
  transactionCardInner: { padding: spacing.stackMd },
  transactionRow: { flexDirection: 'row', alignItems: 'center' },
  transactionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: spacing.stackMd },
  transactionIconPaid: { backgroundColor: '#e8f5e9' },
  transactionIconPending: { backgroundColor: '#fff3e0' },
  transactionInfo: { flex: 1 },
  transactionId: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface },
  transactionTime: { ...typography.labelSm, color: colors.onSurfaceVariant },
  transactionAmount: { alignItems: 'flex-end' },
  transactionStatus: { marginTop: 4, paddingHorizontal: spacing.stackSm, paddingVertical: 2, borderRadius: borderRadius.sm },
  transactionStatusText: { ...typography.labelSm, fontSize: 10, fontWeight: '700' },
  emptyCard: { padding: spacing.stackLg * 2, alignItems: 'center' },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.stackMd },
  paymentRow: { flexDirection: 'row', gap: spacing.stackSm, marginBottom: spacing.stackMd },
  paymentItem: {
    flex: 1, alignItems: 'center', padding: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
  },
  paymentIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  paymentLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 2 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.stackSm, borderTopWidth: 1, borderTopColor: colors.outlineVariant,
  },
  summaryLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
});
