import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Modal, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Button } from '../../src/components/Button';
import { CustomerRepository } from '../../src/database/customer.repo';
import { Customer, CustomerDebtSummary } from '../../src/types/customer';
import { useLicenseStore } from '../../src/stores/license.store';
import { AppModal } from '../../src/components/ui/AppModal';

// ─── CustomerCard (memo, outside screen) ─────────────────────────────────────

const CustomerCard = React.memo(({
  item, debtSummary, onPress,
}: {
  item: Customer;
  debtSummary: CustomerDebtSummary;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
    <View style={styles.cardAvatar}>
      <Text style={styles.cardAvatarText}>
        {item.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
      </Text>
    </View>
    <View style={styles.cardInfo}>
      <View style={styles.cardNameRow}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        {item.isActive === 0 && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveBadgeText}>Nonaktif</Text>
          </View>
        )}
      </View>
      {item.phone ? (
        <Text style={styles.cardSub}>{item.phone}</Text>
      ) : (
        <Text style={[styles.cardSub, styles.cardSubEmpty]}>Tidak ada nomor HP</Text>
      )}
    </View>
    <View style={styles.cardRight}>
      {debtSummary.totalDebt > 0 ? (
        <>
          <Text style={styles.cardDebt}>
            {'Rp' + debtSummary.totalDebt.toLocaleString('id-ID')}
          </Text>
          <Text style={styles.cardDebtLabel}>{debtSummary.totalBon} bon aktif</Text>
        </>
      ) : (
        <Text style={styles.cardNoDebt}>Lunas</Text>
      )}
      <Ionicons name="chevron-forward" size={14} color={colors.onSurfaceVariant} />
    </View>
  </TouchableOpacity>
));

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function KelolaPelangganScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isReadOnly = useLicenseStore((s) => s.isReadOnlyMode());

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debtMap, setDebtMap] = useState<Record<string, CustomerDebtSummary>>({});
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const cacheRef = useRef('');

  // Read-only modal
  const [showReadOnlyModal, setShowReadOnlyModal] = useState(false);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addNote, setAddNote] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const all = await CustomerRepository.getAll();
      const key = JSON.stringify(all.map((c) => c.id + c.updatedAt));
      if (key === cacheRef.current) return;
      cacheRef.current = key;
      setCustomers(all);
      // Load debt summaries in parallel
      const summaries = await Promise.all(all.map((c) => CustomerRepository.getCustomerDebtSummary(c.id)));
      const map: Record<string, CustomerDebtSummary> = {};
      all.forEach((c, i) => { map[c.id] = summaries[i]; });
      setDebtMap(map);
    } catch (e) {
      console.error('kelola pelanggan load error', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    cacheRef.current = '';
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filtered = useMemo(
    () => customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [customers, search]
  );

  const handleOpenAdd = useCallback(() => {
    if (isReadOnly) {
      setShowReadOnlyModal(true);
      return;
    }
    setAddName(''); setAddPhone(''); setAddAddress(''); setAddNote('');
    setShowAdd(true);
  }, [isReadOnly]);

  const handleSaveAdd = useCallback(async () => {
    if (!addName.trim()) {
      Alert.alert('Nama wajib', 'Masukkan nama pelanggan.');
      return;
    }
    setSaving(true);
    try {
      await CustomerRepository.create({
        name: addName.trim(), phone: addPhone.trim(),
        address: addAddress.trim(), note: addNote.trim(),
      });
      cacheRef.current = '';
      await loadData();
      setShowAdd(false);
    } catch {
      Alert.alert('Gagal', 'Tidak dapat menyimpan pelanggan.');
    } finally {
      setSaving(false);
    }
  }, [addName, addPhone, addAddress, addNote, loadData]);

  const renderItem = useCallback(({ item }: { item: Customer }) => (
    <CustomerCard
      item={item}
      debtSummary={debtMap[item.id] ?? { totalDebt: 0, totalBon: 0 }}
      onPress={() => router.push(`/pelanggan/detail/${item.id}` as never)}
    />
  ), [debtMap, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kelola Pelanggan</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
          <Ionicons name="person-add-outline" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.onSurfaceVariant} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama pelanggan..."
          placeholderTextColor={colors.onSurfaceVariant}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: 32 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={5}
        ListHeaderComponent={
          <Text style={styles.sectionLabel}>
            {filtered.length} Pelanggan
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={48} color={colors.surfaceContainerHigh} />
            <Text style={styles.emptyTitle}>Belum ada pelanggan</Text>
            <Text style={styles.emptyText}>Tekan tombol + untuk menambah pelanggan baru</Text>
          </View>
        }
      />

      {/* Modal Tambah Pelanggan */}
      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah Pelanggan</Text>

            <Text style={styles.fieldLabel}>Nama Pelanggan *</Text>
            <TextInput
              style={styles.input}
              value={addName}
              onChangeText={setAddName}
              placeholder="Nama lengkap"
              placeholderTextColor={colors.onSurfaceVariant}
            />

            <Text style={styles.fieldLabel}>Nomor HP (opsional)</Text>
            <TextInput
              style={styles.input}
              value={addPhone}
              onChangeText={setAddPhone}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>Alamat (opsional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={addAddress}
              onChangeText={setAddAddress}
              placeholder="Alamat pelanggan"
              placeholderTextColor={colors.onSurfaceVariant}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.fieldLabel}>Catatan (opsional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={addNote}
              onChangeText={setAddNote}
              placeholder="Catatan tambahan"
              placeholderTextColor={colors.onSurfaceVariant}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <Button title={saving ? 'Menyimpan...' : 'Simpan Pelanggan'} onPress={handleSaveAdd} loading={saving} fullWidth size="lg" />
            <View style={{ height: spacing.stackSm }} />
            <Button title="Batal" onPress={() => setShowAdd(false)} variant="outline" fullWidth />
          </View>
        </View>
      </Modal>

      {/* Read-only Modal */}
      <AppModal
        visible={showReadOnlyModal}
        onClose={() => setShowReadOnlyModal(false)}
        type="warning"
        title="Mode Read-only"
        icon="lock-closed"
        message="Anda tidak dapat mengubah data pelanggan saat lisensi sudah berakhir."
        primaryAction={{
          label: 'Mengerti',
          onPress: () => setShowReadOnlyModal(false),
          variant: 'primary',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile, paddingVertical: 10,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: spacing.marginMobile, marginBottom: spacing.stackSm,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, ...typography.bodyMd, color: colors.onSurface, paddingVertical: 0 },

  sectionLabel: {
    ...typography.labelSm, color: colors.onSurfaceVariant,
    marginBottom: spacing.stackSm,
  },
  listContent: { paddingHorizontal: spacing.marginMobile, paddingTop: 4 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.stackMd, marginBottom: spacing.stackSm,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  cardAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.stackMd,
  },
  cardAvatarText: { ...typography.bodyLg, fontWeight: '700', color: colors.primary },
  cardInfo: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  cardName: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface, flex: 1 },
  inactiveBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: borderRadius.sm,
  },
  inactiveBadgeText: { fontSize: 9, color: colors.onSurfaceVariant, fontWeight: '600' },
  cardSub: { ...typography.labelSm, color: colors.onSurfaceVariant },
  cardSubEmpty: { fontStyle: 'italic' },
  cardRight: { alignItems: 'flex-end', gap: 2 },
  cardDebt: { ...typography.labelSm, fontWeight: '700', color: colors.error },
  cardDebtLabel: { fontSize: 9, color: colors.onSurfaceVariant },
  cardNoDebt: { ...typography.labelSm, color: colors.secondary, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', padding: spacing.marginMobile,
  },
  modalCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.stackMd,
  },
  modalTitle: { ...typography.headlineMobile, color: colors.onSurface, marginBottom: spacing.stackMd },
  fieldLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackSm, marginBottom: spacing.stackMd,
    ...typography.bodyMd, color: colors.onSurface, minHeight: 48,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.stackMd },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { ...typography.bodyLg, color: colors.onPrimary, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { ...typography.bodyMd, color: colors.primary, fontWeight: '700' },
});
