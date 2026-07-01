import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { ReportRepository } from '../../src/database/report.repo';
import { LowStockProduct } from '../../src/types/report';
import { useLicenseGuard } from '../../src/hooks/useLicenseGuard';
import PremiumUpsellModal from '../../src/components/PremiumUpsellModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'today' | '7days' | 'month' | 'custom';
type Tab = 'transaksi' | 'terlaris' | 'stok';

interface Transaction {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function periodRange(period: Period, customStart: string, customEnd: string): [Date, Date] {
  const now = new Date();
  if (period === 'today') return [startOfDay(now), endOfDay(now)];
  if (period === '7days') {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return [startOfDay(from), endOfDay(now)];
  }
  if (period === 'month') {
    return [new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0), endOfDay(now)];
  }
  // custom
  const s = new Date(customStart);
  const e = new Date(customEnd);
  return [
    Number.isNaN(s.getTime()) ? startOfDay(now) : startOfDay(s),
    Number.isNaN(e.getTime()) ? endOfDay(now) : endOfDay(e),
  ];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
function fmtRupiah(n: number) {
  return 'Rp' + n.toLocaleString('id-ID');
}

function methodLabel(m: string) {
  if (m === 'cash') return 'Tunai';
  if (m === 'qris_static') return 'QRIS';
  if (m === 'debt') return 'Bon';
  return m;
}

function statusInfo(status: string, method: string): { text: string; color: string; bg: string } {
  if (status === 'paid') return { text: 'Lunas', color: colors.secondary, bg: '#e8f5e9' };
  if (method === 'debt') return { text: 'Bon', color: colors.error, bg: '#ffebee' };
  return { text: status, color: colors.onSurfaceVariant, bg: colors.surfaceContainerLow };
}

// ─── Row components (memo, defined outside screen) ───────────────────────────

const TrxRow = ({ item, onPress }: { item: Transaction; onPress: () => void }) => {
  const si = statusInfo(item.status, item.paymentMethod);
  return (
    <TouchableOpacity style={styles.rowCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.rowCardLeft}>
        <Text style={styles.rowInvoice}>{item.invoiceNumber}</Text>
        <Text style={styles.rowSub}>
          {fmtDate(item.createdAt)} {fmtTime(item.createdAt)}
        </Text>
        <Text style={styles.rowSub}>{methodLabel(item.paymentMethod)}</Text>
      </View>
      <View style={styles.rowCardRight}>
        <Text style={styles.rowAmount}>{fmtRupiah(item.totalAmount)}</Text>
        <View style={[styles.badge, { backgroundColor: si.bg }]}>
          <Text style={[styles.badgeText, { color: si.color }]}>{si.text}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ProductRow = ({ item, index }: { item: TopProduct; index: number }) => (
  <View style={[styles.rowCard, styles.rowCardFlat]}>
    <View style={styles.rankBadge}>
      <Text style={styles.rankText}>{index + 1}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowInvoice} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.rowSub}>{item.qty} pcs terjual</Text>
    </View>
    <Text style={styles.rowAmount}>{fmtRupiah(item.revenue)}</Text>
  </View>
);

const StockRow = ({ item }: { item: LowStockProduct }) => {
  const isOut = item.stock <= 0;
  return (
    <View style={[styles.rowCard, styles.rowCardFlat]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowInvoice} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.rowSub}>Min stok: {item.minStock}</Text>
      </View>
      <View style={styles.rowCardRight}>
        <Text style={[styles.rowAmount, isOut && styles.textDanger]}>
          Sisa {item.stock}
        </Text>
        <View style={[styles.badge, isOut ? styles.badgeDanger : styles.badgeWarn]}>
          <Text style={[styles.badgeText, isOut ? styles.badgeDangerText : styles.badgeWarnText]}>
            {isOut ? 'Habis' : 'Menipis'}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DetailLaporanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { guardExport, modalType, closeModal } = useLicenseGuard();

  const [period, setPeriod] = useState<Period>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('transaksi');
  const [loading, setLoading] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);

  const cacheRef = useRef('');

  const loadData = useCallback(async (p: Period, cs: string, ce: string) => {
    const [from, to] = periodRange(p, cs, ce);
    const key = `${from.toISOString()}|${to.toISOString()}`;
    if (key === cacheRef.current) return;
    cacheRef.current = key;

    setLoading(true);
    try {
      const [trx, top, stock] = await Promise.all([
        ReportRepository.getTransactionsByRange(from.toISOString(), to.toISOString(), 50),
        ReportRepository.getTopProductsByRange(from.toISOString(), to.toISOString(), 50),
        ReportRepository.getLowStockProducts(50),
      ]);
      setTransactions(trx);
      setTopProducts(top);
      setLowStock(stock);
    } catch (e) {
      console.error('detail laporan error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(period, customStart, customEnd);
    }, [loadData, period, customStart, customEnd])
  );

  // Re-fetch when period/custom changes
  const handlePeriod = useCallback((p: Period) => {
    cacheRef.current = '';
    setPeriod(p);
  }, []);

  const handleCustomApply = useCallback(() => {
    if (!customStart || !customEnd) {
      Alert.alert('Tanggal tidak lengkap', 'Isi tanggal mulai dan tanggal akhir.');
      return;
    }
    cacheRef.current = '';
    loadData('custom', customStart, customEnd);
  }, [customStart, customEnd, loadData]);

  // Filtered data is already limited to 50 from DB, useMemo for tab switching
  const displayData = useMemo(() => {
    if (activeTab === 'transaksi') return transactions;
    if (activeTab === 'terlaris') return topProducts;
    return lowStock;
  }, [activeTab, transactions, topProducts, lowStock]);

  const handleExportExcel = useCallback(() => {
    guardExport(() => Alert.alert('Export Excel', 'Fitur export sedang disiapkan.'));
  }, [guardExport]);

  const handleExportPDF = useCallback(() => {
    guardExport(() => Alert.alert('Export PDF', 'Fitur export sedang disiapkan.'));
  }, [guardExport]);

  const periodLabel: Record<Period, string> = {
    today: 'Hari Ini', '7days': '7 Hari', month: 'Bulan Ini', custom: 'Custom',
  };

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    if (activeTab === 'transaksi') {
      return (
        <TrxRow
          item={item}
          onPress={() => router.push(`/transaksi/detail/${item.id}` as never)}
        />
      );
    }
    if (activeTab === 'terlaris') return <ProductRow item={item} index={index} />;
    return <StockRow item={item} />;
  }, [activeTab, router]);

  const emptyText: Record<Tab, string> = {
    transaksi: 'Belum ada transaksi pada periode ini',
    terlaris: 'Belum ada data penjualan',
    stok: 'Semua stok produk aman',
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Laporan</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Filter + Export — sticky above list */}
      <View style={styles.filterSection}>
        {/* Period pills */}
        <View style={styles.periodRow}>
          {(['today', '7days', 'month', 'custom'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodPill, period === p && styles.periodPillActive]}
              onPress={() => handlePeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {periodLabel[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom date inputs */}
        {period === 'custom' && (
          <View style={styles.customRow}>
            <View style={styles.dateInputWrap}>
              <Text style={styles.dateInputLabel}>Mulai</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.onSurfaceVariant}
                value={customStart}
                onChangeText={setCustomStart}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            <View style={styles.dateInputWrap}>
              <Text style={styles.dateInputLabel}>Akhir</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.onSurfaceVariant}
                value={customEnd}
                onChangeText={setCustomEnd}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            <TouchableOpacity style={styles.applyBtn} onPress={handleCustomApply}>
              <Text style={styles.applyBtnText}>Terapkan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Export buttons */}
        <View style={styles.exportRow}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportExcel}>
            <Ionicons name="document-text-outline" size={14} color={colors.primary} />
            <Text style={styles.exportBtnText}>Export Excel</Text>
            <View style={styles.premiumTag}>
              <Ionicons name="star" size={9} color={colors.tertiary} />
              <Text style={styles.premiumTagText}>Premium</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportPDF}>
            <Ionicons name="document-outline" size={14} color={colors.primary} />
            <Text style={styles.exportBtnText}>Export PDF</Text>
            <View style={styles.premiumTag}>
              <Ionicons name="star" size={9} color={colors.tertiary} />
              <Text style={styles.premiumTagText}>Premium</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['transaksi', 'terlaris', 'stok'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t && styles.tabActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t === 'transaksi' ? 'Transaksi' : t === 'terlaris' ? 'Terlaris' : 'Stok Menipis'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item: any, i) => item.id ?? item.name ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 32 + insets.bottom },
          ]}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="document-outline" size={40} color={colors.surfaceContainerHigh} />
              <Text style={styles.emptyText}>{emptyText[activeTab]}</Text>
            </View>
          }
        />
      )}

      <PremiumUpsellModal visible={modalType === 'premium_upsell'} onClose={closeModal} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile, paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },

  // Filter section
  filterSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackSm,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  periodRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.stackSm },
  periodPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  periodPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 12 },
  periodTextActive: { color: colors.onPrimary, fontWeight: '700' },

  // Custom date
  customRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.stackSm, alignItems: 'flex-end' },
  dateInputWrap: { flex: 1 },
  dateInputLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 4 },
  dateInput: {
    borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.md, paddingHorizontal: 10, paddingVertical: 8,
    ...typography.bodyMd, color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
  },
  applyBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  applyBtnText: { ...typography.labelSm, color: colors.onPrimary, fontWeight: '700' },

  // Export
  exportRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.stackSm },
  exportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  exportBtnText: { ...typography.labelSm, color: colors.primary, fontWeight: '600', fontSize: 12 },
  premiumTag: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.tertiaryFixed,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: borderRadius.sm,
  },
  premiumTagText: { fontSize: 9, fontWeight: '700', color: colors.tertiary },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md, padding: 3, marginBottom: spacing.stackSm,
  },
  tab: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: borderRadius.sm },
  tabActive: { backgroundColor: colors.surface },
  tabText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 11 },
  tabTextActive: { color: colors.primary, fontWeight: '700' },

  // List
  listContent: { padding: spacing.marginMobile, gap: 8 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },

  // Row cards
  rowCard: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.stackMd,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  rowCardFlat: { alignItems: 'center', gap: 10 },
  rowCardLeft: { flex: 1, gap: 2 },
  rowCardRight: { alignItems: 'flex-end', gap: 4 },
  rowInvoice: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface },
  rowSub: { ...typography.labelSm, color: colors.onSurfaceVariant },
  rowAmount: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: borderRadius.sm },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeDanger: { backgroundColor: '#ffebee' },
  badgeDangerText: { color: colors.error },
  badgeWarn: { backgroundColor: '#fff3e0' },
  badgeWarnText: { color: '#E65100' },
  textDanger: { color: colors.error },
  rankBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { ...typography.labelSm, fontSize: 11, fontWeight: '700', color: colors.onSurfaceVariant },
});
