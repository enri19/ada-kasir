import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Alert, View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Modal, Platform, ScrollView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Card } from '../../src/components/Card';
import { CurrencyText } from '../../src/components/CurrencyText';
import { DebtRepository } from '../../src/database/debt.repo';
import { CustomerRepository } from '../../src/database/customer.repo';
import { DebtWithCustomer } from '../../src/types/debt';
import { Customer } from '../../src/types/customer';
import { useAppStore } from '../../src/stores/app.store';
import { useLicenseStore } from '../../src/stores/license.store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusInfo(status: string, remainingAmount: number, createdAt: string, dueDate?: string | null) {
  if (status === 'paid') return { text: 'LUNAS', color: colors.secondary, bg: '#e8f5e9' };
  if (remainingAmount > 0) {
    const daysSince = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
    if (daysSince > 7) return { text: 'MENDESAK', color: '#f44336', bg: '#ffebee' };
    if (dueDate && new Date(dueDate) < new Date()) return { text: 'JATUH TEMPO', color: '#ff9800', bg: '#fff3e0' };
    return { text: 'BELUM LUNAS', color: colors.error, bg: '#ffebee' };
  }
  return { text: 'CICILAN', color: '#2196f3', bg: '#e3f2fd' };
}

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days} hari lalu`;
  return 'Minggu lalu';
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── DebtCard (memo, outside screen) ─────────────────────────────────────────

const DebtCard = React.memo(({ item, onPress }: { item: DebtWithCustomer; onPress: () => void }) => {
  const si = getStatusInfo(item.status, item.remainingAmount, item.createdAt, item.dueDate);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.debtCardWrap}>
      <Card style={styles.debtCardInner}>
        <View style={styles.debtRow}>
          <View style={styles.initialsCircle}>
            <Text style={styles.initialsText}>{initials(item.customerName)}</Text>
          </View>
          <View style={styles.debtInfo}>
            <View style={styles.debtNameRow}>
              <Text style={styles.debtName} numberOfLines={1}>{item.customerName}</Text>
              {item.source === 'manual' && (
                <View style={styles.manualTag}>
                  <Text style={styles.manualTagText}>Bon Manual</Text>
                </View>
              )}
            </View>
            <View style={styles.debtTimeRow}>
              <Ionicons name="time-outline" size={12} color={colors.onSurfaceVariant} />
              <Text style={styles.debtTimeText}>{getTimeAgo(item.createdAt)}</Text>
            </View>
          </View>
          <View style={styles.debtAmountCol}>
            <CurrencyText amount={item.remainingAmount} size="sm" color={colors.primary} />
            <View style={[styles.statusBadge, { backgroundColor: si.bg }]}>
              <Text style={[styles.statusBadgeText, { color: si.color }]}>{si.text}</Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BonScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const storeName = useAppStore((s) => s.activeStore?.name) ?? 'AdaKasir';
  const isReadOnly = useLicenseStore((s) => s.isReadOnlyMode());

  const [debts, setDebts] = useState<DebtWithCustomer[]>([]);
  const [activeCustomers, setActiveCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [totalDebt, setTotalDebt] = useState(0);
  const cacheRef = useRef('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [manualNote, setManualNote] = useState('Sisa bon dari catatan lama');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [data, customers] = await Promise.all([
        DebtRepository.getAll(),
        CustomerRepository.getActive(),
      ]);
      const key = JSON.stringify(data);
      if (key !== cacheRef.current) {
        cacheRef.current = key;
        setDebts(data);
        setTotalDebt(data.reduce((s, d) => s + (d.remainingAmount || 0), 0));
      }
      setActiveCustomers(customers);
    } catch (e) {
      console.error('bon load error', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    cacheRef.current = '';
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filteredDebts = useMemo(
    () => debts.filter((d) => d.customerName.toLowerCase().includes(searchQuery.toLowerCase())),
    [debts, searchQuery]
  );

  const filteredCustomers = useMemo(
    () => activeCustomers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase())),
    [activeCustomers, customerSearch]
  );

  const handleOpenModal = useCallback(() => {
    if (isReadOnly) {
      Alert.alert('Mode read-only', 'Anda tidak dapat menambah bon saat lisensi sudah berakhir.');
      return;
    }
    setSelectedCustomer(null);
    setCustomerSearch('');
    setManualAmount('');
    setManualDate(new Date());
    setManualNote('Sisa bon dari catatan lama');
    setShowModal(true);
  }, [isReadOnly]);

  const handleCreateCustomer = useCallback(async () => {
    if (!customerSearch.trim()) {
      Alert.alert('Nama wajib', 'Masukkan nama pelanggan terlebih dahulu.');
      return;
    }
    try {
      const c = await CustomerRepository.create({ name: customerSearch.trim(), phone: '', address: '', note: '' });
      setActiveCustomers((prev) => [c, ...prev]);
      setSelectedCustomer(c);
    } catch {
      Alert.alert('Gagal', 'Tidak dapat menambahkan pelanggan baru.');
    }
  }, [customerSearch]);

  const handleSave = useCallback(async () => {
    if (!selectedCustomer) {
      Alert.alert('Pilih pelanggan', 'Pilih pelanggan terlebih dahulu.');
      return;
    }
    const amount = Number(manualAmount.replace(/\D/g, ''));
    if (!amount || amount <= 0) {
      Alert.alert('Nominal tidak valid', 'Masukkan nominal bon yang benar.');
      return;
    }
    setSaving(true);
    try {
      await DebtRepository.createDebt(
        selectedCustomer.id, null, amount, 0, amount, 'unpaid',
        manualDate.toISOString().slice(0, 10),
        manualNote.trim() || 'Sisa bon dari catatan lama',
        'manual', manualDate.toISOString()
      );
      cacheRef.current = '';
      await loadData();
      setShowModal(false);
      Alert.alert('Berhasil', 'Bon manual berhasil ditambahkan.');
    } catch {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan bon.');
    } finally {
      setSaving(false);
    }
  }, [selectedCustomer, manualAmount, manualDate, manualNote, loadData]);

  const renderDebt = useCallback(({ item }: { item: DebtWithCustomer }) => (
    <DebtCard item={item} onPress={() => router.push(`/pelanggan/detail/${item.customerId}` as never)} />
  ), [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="storefront" size={22} color={colors.primary} />
          <Text style={styles.headerTitle}>{storeName}</Text>
        </View>
        <TouchableOpacity
          style={styles.kelolaBtn}
          onPress={() => router.push('/pelanggan')}
        >
          <Ionicons name="people-outline" size={14} color={colors.primary} />
          <Text style={styles.kelolaBtnText}>Kelola Pelanggan</Text>
        </TouchableOpacity>
      </View>

      {/* Total piutang */}
      <Card style={styles.totalCard}>
        <Text style={styles.totalLabel}>TOTAL PIUTANG</Text>
        <CurrencyText amount={totalDebt} size="xl" color={colors.primary} />
      </Card>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.onSurfaceVariant} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama pelanggan..."
          placeholderTextColor={colors.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filteredDebts}
        keyExtractor={(item) => item.id}
        renderItem={renderDebt}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={4}
        ListHeaderComponent={
          <Text style={styles.sectionLabel}>DAFTAR PELANGGAN BERHUTANG</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="wallet-outline" size={56} color={colors.surfaceContainerHigh} />
            <Text style={styles.emptyTitle}>Belum ada catatan bon</Text>
            <Text style={styles.emptyText}>Bon muncul saat ada transaksi dengan metode Bon</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 16 + insets.bottom }]}
        onPress={handleOpenModal}
      >
        <Ionicons name="add" size={20} color={colors.onPrimary} />
        <Text style={styles.fabText}>Tambah Bon Baru</Text>
      </TouchableOpacity>

      {/* Modal Tambah Bon Manual */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah Bon Manual</Text>

            {/* Pilih pelanggan */}
            <Text style={styles.fieldLabel}>Pilih Pelanggan</Text>
            <View style={styles.customerSearchRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Cari atau ketik nama pelanggan"
                placeholderTextColor={colors.onSurfaceVariant}
                value={customerSearch}
                onChangeText={(v) => { setCustomerSearch(v); setSelectedCustomer(null); }}
              />
              <TouchableOpacity style={styles.addCustBtn} onPress={handleCreateCustomer}>
                <Ionicons name="person-add-outline" size={18} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.customerList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {filteredCustomers.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.customerItem, selectedCustomer?.id === c.id && styles.customerItemActive]}
                  onPress={() => setSelectedCustomer(c)}
                >
                  <Text style={styles.customerItemName}>{c.name}</Text>
                  {selectedCustomer?.id === c.id && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              {filteredCustomers.length === 0 && (
                <Text style={styles.emptyText}>Tidak ada pelanggan. Ketik nama lalu tekan tombol +</Text>
              )}
            </ScrollView>

            {/* Nominal */}
            <Text style={styles.fieldLabel}>Nominal Bon</Text>
            <TextInput
              style={styles.input}
              value={manualAmount}
              onChangeText={(v) => setManualAmount(formatCurrencyInput(v))}
              placeholder="Masukkan nominal"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="numeric"
            />

            {/* Tanggal */}
            <Text style={styles.fieldLabel}>Tanggal Bon</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.inputText}>{formatDateLabel(manualDate)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={manualDate}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(_e: DateTimePickerEvent, d?: Date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (d) setManualDate(d);
                }}
              />
            )}

            {/* Catatan */}
            <Text style={styles.fieldLabel}>Catatan (opsional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={manualNote}
              onChangeText={setManualNote}
              multiline
              numberOfLines={2}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Menyimpan...' : 'Simpan Bon Manual'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, paddingVertical: 10,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { ...typography.headlineMobile, color: colors.primary },
  kelolaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.primary,
  },
  kelolaBtnText: { ...typography.labelSm, color: colors.primary, fontWeight: '600' },

  totalCard: {
    marginHorizontal: spacing.marginMobile, marginTop: spacing.stackMd,
    marginBottom: spacing.stackSm, padding: spacing.stackMd,
  },
  totalLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 4 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.marginMobile, marginBottom: spacing.stackSm,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, ...typography.bodyMd, color: colors.onSurface, paddingVertical: 0 },

  sectionLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  listContent: { paddingHorizontal: spacing.marginMobile, paddingTop: spacing.stackSm },

  debtCardWrap: { marginBottom: spacing.stackSm },
  debtCardInner: { padding: spacing.stackMd },
  debtRow: { flexDirection: 'row', alignItems: 'center' },
  initialsCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.stackMd,
  },
  initialsText: { ...typography.bodyLg, fontWeight: '700', color: colors.primary },
  debtInfo: { flex: 1 },
  debtNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  debtName: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface, flex: 1 },
  manualTag: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: borderRadius.sm,
  },
  manualTagText: { fontSize: 9, color: colors.onSurfaceVariant, fontWeight: '600' },
  debtTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  debtTimeText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  debtAmountCol: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.sm },
  statusBadgeText: { fontSize: 9, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },

  fab: {
    position: 'absolute', left: spacing.marginMobile, right: spacing.marginMobile,
    backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 14, borderRadius: borderRadius.lg,
    gap: spacing.stackSm, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  fabText: { ...typography.bodyLg, fontWeight: '700', color: colors.onPrimary },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', padding: spacing.marginMobile,
  },
  modalCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.stackMd, maxHeight: '92%',
  },
  modalTitle: { ...typography.headlineMobile, color: colors.onSurface, marginBottom: spacing.stackMd },
  fieldLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: '700', marginBottom: 6 },
  customerSearchRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.stackSm },
  addCustBtn: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  customerList: { maxHeight: 130, marginBottom: spacing.stackMd },
  customerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow, padding: spacing.stackSm,
    borderRadius: borderRadius.md, marginBottom: 4,
  },
  customerItemActive: { borderWidth: 1.5, borderColor: colors.primary },
  customerItemName: { ...typography.bodyMd, color: colors.onSurface },
  input: {
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: spacing.stackMd,
    ...typography.bodyMd, color: colors.onSurface,
  },
  inputText: { ...typography.bodyMd, color: colors.onSurface },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { ...typography.bodyLg, color: colors.onPrimary, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { ...typography.bodyMd, color: colors.primary, fontWeight: '700' },
});
