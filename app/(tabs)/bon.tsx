import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Modal } from 'react-native';
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

export default function BonScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [debts, setDebts] = useState<DebtWithCustomer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [totalDebt, setTotalDebt] = useState(0);
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualNote, setManualNote] = useState('Sisa bon dari catatan lama');
  const [creatingDebt, setCreatingDebt] = useState(false);
  const debtsJsonRef = useRef('');

  const activeStore = useAppStore((state) => state.activeStore);
  const isReadOnly = useLicenseStore((state) => state.isReadOnlyMode());
  const storeName = activeStore?.name || 'AdaKasir';

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

  const loadCustomers = useCallback(async () => {
    try {
      const data = await CustomerRepository.getAll();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadCustomers();
  }, [loadData, loadCustomers]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadCustomers()]);
    setRefreshing(false);
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleOpenAddDebt = () => {
    if (isReadOnly) {
      Alert.alert('Mode read-only', 'Anda tidak dapat menambah bon manual saat lisensi sudah berakhir.');
      return;
    }
    setShowAddDebtModal(true);
  };

  const handleCreateManualDebt = async () => {
    if (!selectedCustomer) {
      Alert.alert('Pilih pelanggan', 'Pilih pelanggan terlebih dahulu untuk menambah bon manual.');
      return;
    }

    const amount = Number(manualAmount.replace(/[^0-9]/g, ''));
    if (!amount || amount <= 0) {
      Alert.alert('Nominal tidak valid', 'Masukkan nominal bon yang benar.');
      return;
    }

    setCreatingDebt(true);
    try {
      const createdAt = new Date(manualDate).toISOString();
      await DebtRepository.createDebt(
        selectedCustomer.id,
        null,
        amount,
        0,
        amount,
        'unpaid',
        manualDate,
        manualNote.trim() || 'Sisa bon dari catatan lama',
        'manual',
        createdAt
      );
      await loadData();
      setShowAddDebtModal(false);
      setManualAmount('');
      setManualDate(new Date().toISOString().slice(0, 10));
      setManualNote('Sisa bon dari catatan lama');
      Alert.alert('Berhasil', 'Bon manual berhasil ditambahkan.');
    } catch (error) {
      console.error('Error creating manual debt:', error);
      Alert.alert('Gagal', 'Terjadi kesalahan saat menambahkan bon manual.');
    } finally {
      setCreatingDebt(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!customerSearch.trim()) {
      Alert.alert('Nama pelanggan wajib', 'Masukkan nama pelanggan untuk menambahkan data baru.');
      return;
    }
    try {
      const customer = await CustomerRepository.create({
        name: customerSearch.trim(),
        phone: '',
        address: '',
        note: '',
      });
      setCustomers((prev) => [customer, ...prev]);
      setSelectedCustomer(customer);
      Alert.alert('Berhasil', 'Pelanggan baru ditambahkan dan dipilih.');
    } catch (error) {
      console.error('Error creating customer:', error);
      Alert.alert('Gagal', 'Tidak dapat menambahkan pelanggan baru.');
    }
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
        onPress={handleOpenAddDebt}
      >
        <Ionicons name="add" size={20} color={colors.onPrimary} />
        <Text style={styles.addBonText}>Tambah Bon Baru</Text>
      </TouchableOpacity>

      <Modal visible={showAddDebtModal} transparent animationType="fade" onRequestClose={() => setShowAddDebtModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tambah Bon Manual</Text>

            <Text style={styles.fieldLabel}>Pilih Pelanggan</Text>
            <View style={styles.customerSearchRow}>
              <TextInput
                style={[styles.input, styles.customerSearchInput]}
                placeholder="Cari atau ketik nama pelanggan"
                placeholderTextColor={colors.onSurfaceVariant}
                value={customerSearch}
                onChangeText={(value) => {
                  setCustomerSearch(value);
                  setSelectedCustomer(null);
                }}
              />
              <TouchableOpacity style={styles.addCustomerButton} onPress={handleCreateCustomer}>
                <Ionicons name="person-add-outline" size={20} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.customerList} nestedScrollEnabled>
              {filteredCustomers.map((customer) => (
                <TouchableOpacity
                  key={customer.id}
                  style={[styles.customerItem, selectedCustomer?.id === customer.id && styles.customerItemSelected]}
                  onPress={() => setSelectedCustomer(customer)}
                >
                  <Text style={styles.customerItemName}>{customer.name}</Text>
                  {selectedCustomer?.id === customer.id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              {filteredCustomers.length === 0 && (
                <View style={styles.emptyStateModal}>
                  <Text style={styles.emptyText}>Tidak ada pelanggan. Tambahkan baru dengan tombol di samping.</Text>
                </View>
              )}
            </ScrollView>

            <Text style={styles.fieldLabel}>Nominal Bon</Text>
            <TextInput
              style={styles.input}
              value={manualAmount}
              onChangeText={setManualAmount}
              placeholder="Masukkan nominal"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>Tanggal Bon</Text>
            <TextInput
              style={styles.input}
              value={manualDate}
              onChangeText={setManualDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.onSurfaceVariant}
            />

            <Text style={styles.fieldLabel}>Catatan (opsional)</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={manualNote}
              onChangeText={setManualNote}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleCreateManualDebt} disabled={creatingDebt}>
              <Text style={styles.saveButtonText}>{creatingDebt ? 'Menyimpan...' : 'Simpan Bon Manual'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddDebtModal(false)}>
              <Text style={styles.cancelButtonText}>Batal</Text>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: spacing.marginMobile,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.stackMd,
    maxHeight: '90%',
  },
  modalTitle: { ...typography.headlineMobile, color: colors.onSurface, marginBottom: spacing.stackSm },
  fieldLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 6, fontWeight: '700' },
  customerSearchRow: { flexDirection: 'row', gap: spacing.stackSm, marginBottom: spacing.stackSm },
  customerSearchInput: { flex: 1 },
  addCustomerButton: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  customerList: { maxHeight: 140, marginBottom: spacing.stackMd },
  customerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow, padding: spacing.stackSm, borderRadius: borderRadius.md,
    marginBottom: spacing.stackSm,
  },
  customerItemSelected: { borderWidth: 1, borderColor: colors.primary },
  customerItemName: { ...typography.bodyMd, color: colors.onSurface },
  emptyStateModal: { alignItems: 'center', justifyContent: 'center', padding: spacing.stackMd },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    color: colors.onSurface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.stackMd,
    ...typography.bodyMd,
  },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.stackSm,
  },
  saveButtonText: { ...typography.bodyLg, color: colors.onPrimary, fontWeight: '700' },
  cancelButton: {
    marginTop: spacing.stackSm,
    alignItems: 'center',
  },
  cancelButtonText: { ...typography.bodyMd, color: colors.primary, fontWeight: '700' },
});
