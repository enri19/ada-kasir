import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { ReportRepository } from '../../src/database/report.repo';
import { LowStockProduct, ReportFilter } from '../../src/types/report';
import { ReportService } from '../../src/services/report.service';
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

function formatDate(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );
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

// ─── Row components (defined outside screen, no re-creation on render) ────────

const TrxRow = ({ item, onPress }: { item: Transaction; onPress: () => void }) => {
  const si = statusInfo(item.status, item.paymentMethod);
  return (
    <TouchableOpacity style={styles.rowCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.rowCardLeft}>
        <Text style={styles.rowInvoice}>{item.invoiceNumber}</Text>
        <Text style={styles.rowSub}>{fmtDateTime(item.createdAt)}</Text>
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
        <Text style={[styles.rowAmount, isOut && styles.textDanger]}>Sisa {item.stock}</Text>
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

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hari Ini', '7days': '7 Hari', month: 'Bulan Ini', custom: 'Custom',
};

const EMPTY_TEXT: Record<Tab, string> = {
  transaksi: 'Belum ada transaksi pada periode ini',
  terlaris: 'Belum ada data penjualan',
  stok: 'Semua stok produk aman',
};

export default function DetailLaporanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { guardExport, modalType, closeModal } = useLicenseGuard();

  // ── Period state ──────────────────────────────────────────────────────────
  const [period, setPeriod] = useState<Period>('today');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // ── Tab + data state ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('transaksi');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const cacheRef = useRef('');

  // ── Compute from/to from period ───────────────────────────────────────────
  const [from, to] = useMemo((): [Date, Date] => {
    const now = new Date();
    if (period === 'today') return [startOfDay(now), endOfDay(now)];
    if (period === '7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return [startOfDay(d), endOfDay(now)];
    }
    if (period === 'month') {
      return [new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0), endOfDay(now)];
    }
    // custom
    return [startOfDay(startDate), endOfDay(endDate)];
  }, [period, startDate, endDate]);

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async (fromDate: Date, toDate: Date) => {
    const key = `${fromDate.toISOString()}|${toDate.toISOString()}`;
    if (key === cacheRef.current) return;
    cacheRef.current = key;
    setLoading(true);
    try {
      const [trx, top, stock] = await Promise.all([
        ReportRepository.getTransactionsByRange(fromDate.toISOString(), toDate.toISOString(), 50),
        ReportRepository.getTopProductsByRange(fromDate.toISOString(), toDate.toISOString(), 50),
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
      loadData(from, to);
    }, [loadData, from, to])
  );

  // ── Period handlers ───────────────────────────────────────────────────────
  const handlePeriod = useCallback((p: Period) => {
    cacheRef.current = '';
    setPeriod(p);
  }, []);

  const handleStartDateChange = useCallback(
    (_event: DateTimePickerEvent, selected?: Date) => {
      setShowStartPicker(Platform.OS === 'ios'); // iOS keeps picker open
      if (!selected) return;
      setStartDate(selected);
    },
    []
  );

  const handleEndDateChange = useCallback(
    (_event: DateTimePickerEvent, selected?: Date) => {
      setShowEndPicker(Platform.OS === 'ios');
      if (!selected) return;
      if (selected < startDate) {
        Alert.alert('Tanggal tidak valid', 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
        return;
      }
      setEndDate(selected);
    },
    [startDate]
  );

  const handleApplyCustom = useCallback(() => {
    if (startDate > endDate) {
      Alert.alert('Tanggal tidak valid', 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
      return;
    }
    cacheRef.current = '';
    // Trigger reload by bumping the key — from/to already computed via useMemo
    loadData(startOfDay(startDate), endOfDay(endDate));
  }, [startDate, endDate, loadData]);

  // ── Display data ──────────────────────────────────────────────────────────
  const displayData = useMemo(() => {
    if (activeTab === 'transaksi') return transactions;
    if (activeTab === 'terlaris') return topProducts;
    return lowStock;
  }, [activeTab, transactions, topProducts, lowStock]);

  // ── Export ────────────────────────────────────────────────────────────────

  /** Buat ReportFilter dari state periode saat ini */
  const buildFilter = useCallback((): ReportFilter => {
    if (period === 'custom') {
      return {
        startDate: startOfDay(startDate).toISOString(),
        endDate: endOfDay(endDate).toISOString(),
      };
    }
    return {
      startDate: from.toISOString(),
      endDate: to.toISOString(),
    };
  }, [period, startDate, endDate, from, to]);

  const handleExportExcel = useCallback(() => {
    if (exporting) return;
    guardExport(async () => {
      setExporting('csv');
      try {
        const filter = buildFilter();
        const result = await ReportService.exportAndShareCSV(filter);
        if (result.success) {
          Alert.alert('Berhasil', result.message);
        } else {
          Alert.alert('Gagal', result.message);
        }
      } catch (error: any) {
        Alert.alert('Gagal Export CSV', error?.message || 'Gagal membuat file CSV laporan.');
      } finally {
        setExporting(null);
      }
    });
  }, [guardExport, buildFilter, exporting]);

  const handleExportPDF = useCallback(() => {
    if (exporting) return;
    guardExport(async () => {
      setExporting('pdf');
      try {
        const filter = buildFilter();
        const result = await ReportService.exportAndSharePDF(filter);
        if (result.success) {
          Alert.alert('Berhasil', result.message);
        } else {
          Alert.alert('Gagal', result.message);
        }
      } catch (error: any) {
        Alert.alert('Gagal Export PDF', error?.message || 'Gagal membuat file PDF laporan.');
      } finally {
        setExporting(null);
      }
    });
  }, [guardExport, buildFilter, exporting]);

  // ── Render item ───────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
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
    },
    [activeTab, router]
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Laporan</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* ── Filter section (non-scrollable) ── */}
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
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom date pickers */}
        {period === 'custom' && (
          <View style={styles.customRow}>
            {/* Start date */}
            <View style={styles.datePickerWrap}>
              <Text style={styles.datePickerLabel}>Tanggal Mulai</Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={styles.datePickerText}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
            </View>

            {/* End date */}
            <View style={styles.datePickerWrap}>
              <Text style={styles.datePickerLabel}>Tanggal Akhir</Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={styles.datePickerText}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>

            {/* Apply */}
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCustom}>
              <Text style={styles.applyBtnText}>Terapkan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Export buttons */}
        <View style={styles.exportRow}>
          <TouchableOpacity
            style={[styles.exportBtn, exporting === 'csv' && styles.exportBtnDisabled]}
            onPress={handleExportExcel}
            disabled={exporting !== null}
          >
            {exporting === 'csv' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="document-text-outline" size={14} color={colors.primary} />
            )}
            <Text style={styles.exportBtnText}>Export Excel</Text>
            <View style={styles.premiumTag}>
              <Ionicons name="star" size={9} color={colors.tertiary} />
              <Text style={styles.premiumTagText}>Premium</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, exporting === 'pdf' && styles.exportBtnDisabled]}
            onPress={handleExportPDF}
            disabled={exporting !== null}
          >
            {exporting === 'pdf' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="document-outline" size={14} color={colors.primary} />
            )}
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

      {/* ── List ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item: any, i) => item.id ?? item.name ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: 32 + insets.bottom }]}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="document-outline" size={40} color={colors.surfaceContainerHigh} />
              <Text style={styles.emptyText}>{EMPTY_TEXT[activeTab]}</Text>
            </View>
          }
        />
      )}

      {/* ── Native date pickers (rendered only when open) ── */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          maximumDate={endDate}
          onChange={handleStartDateChange}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          minimumDate={startDate}
          maximumDate={new Date()}
          onChange={handleEndDateChange}
        />
      )}

      <PremiumUpsellModal visible={modalType === 'premium_upsell'} onClose={closeModal} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile, paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },

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

  customRow: {
    flexDirection: 'row', gap: 8, marginBottom: spacing.stackSm, alignItems: 'flex-end',
  },
  datePickerWrap: { flex: 1 },
  datePickerLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 4 },
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.md, paddingHorizontal: 10, paddingVertical: 9,
    backgroundColor: colors.surfaceContainerLow,
  },
  datePickerText: { ...typography.bodyMd, color: colors.onSurface, fontSize: 13 },

  applyBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  applyBtnText: { ...typography.labelSm, color: colors.onPrimary, fontWeight: '700' },

  exportRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.stackSm },
  exportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  exportBtnText: { ...typography.labelSm, color: colors.primary, fontWeight: '600', fontSize: 12 },
  exportBtnDisabled: { opacity: 0.6 },
  premiumTag: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.tertiaryFixed,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: borderRadius.sm,
  },
  premiumTagText: { fontSize: 9, fontWeight: '700', color: colors.tertiary },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md, padding: 3, marginBottom: spacing.stackSm,
  },
  tab: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: borderRadius.sm },
  tabActive: { backgroundColor: colors.surface },
  tabText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 11 },
  tabTextActive: { color: colors.primary, fontWeight: '700' },

  listContent: { padding: spacing.marginMobile, gap: 8 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },

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
