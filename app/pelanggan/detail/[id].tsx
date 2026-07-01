import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Alert, Modal, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../../src/config/theme';
import { CurrencyText } from '../../../src/components/CurrencyText';
import { Card } from '../../../src/components/Card';
import { CustomerRepository } from '../../../src/database/customer.repo';
import { DebtRepository } from '../../../src/database/debt.repo';
import { Customer } from '../../../src/types/customer';
import { Debt } from '../../../src/types/debt';
import { useAppStore } from '../../../src/stores/app.store';
import { useLicenseStore } from '../../../src/stores/license.store';
import { WhatsAppService } from '../../../src/services/whatsapp.service';

function getStatusBadge(status: string) {
  switch (status) {
    case 'unpaid': return { text: 'BELUM LUNAS', color: colors.error, bg: '#ffebee' };
    case 'partial': return { text: 'CICILAN', color: '#2196f3', bg: '#e3f2fd' };
    case 'paid':    return { text: 'LUNAS', color: colors.secondary, bg: '#e8f5e9' };
    default:        return { text: status, color: colors.onSurfaceVariant, bg: colors.surfaceContainerLow };
  }
}

export default function DetailPelangganScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeStore = useAppStore((s) => s.activeStore);
  const isReadOnly = useLicenseStore((s) => s.isReadOnlyMode());

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [cust, debtList] = await Promise.all([
        CustomerRepository.getById(id),
        DebtRepository.getByCustomerId(id),
      ]);
      setCustomer(cust);
      setDebts(debtList);
      setTotalDebt(debtList.reduce((s, d) => s + (d.remainingAmount || 0), 0));
    } catch (e) {
      console.error('detail pelanggan error', e);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleOpenEdit = useCallback(() => {
    if (isReadOnly) {
      Alert.alert('Mode read-only', 'Anda tidak dapat mengubah data pelanggan saat lisensi sudah berakhir.');
      return;
    }
    if (!customer) return;
    setEditName(customer.name);
    setEditPhone(customer.phone ?? '');
    setEditAddress(customer.address ?? '');
    setEditNote(customer.note ?? '');
    setShowEdit(true);
  }, [isReadOnly, customer]);

  const handleSaveEdit = useCallback(async () => {
    if (!editName.trim()) {
      Alert.alert('Nama wajib', 'Masukkan nama pelanggan.');
      return;
    }
    setSaving(true);
    try {
      await CustomerRepository.update(id!, {
        name: editName.trim(), phone: editPhone.trim(),
        address: editAddress.trim(), note: editNote.trim(),
      });
      await loadData();
      setShowEdit(false);
    } catch {
      Alert.alert('Gagal', 'Tidak dapat menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  }, [id, editName, editPhone, editAddress, editNote, loadData]);

  const handleToggleActive = useCallback(() => {
    if (isReadOnly) {
      Alert.alert('Mode read-only', 'Anda tidak dapat mengubah data pelanggan saat lisensi sudah berakhir.');
      return;
    }
    if (!customer) return;
    const isActive = customer.isActive !== 0;
    Alert.alert(
      isActive ? 'Nonaktifkan Pelanggan' : 'Aktifkan Pelanggan',
      isActive
        ? `${customer.name} akan dinonaktifkan dan tidak muncul di pilihan bon baru.`
        : `${customer.name} akan diaktifkan kembali.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: isActive ? 'Nonaktifkan' : 'Aktifkan',
          style: isActive ? 'destructive' : 'default',
          onPress: async () => {
            if (isActive) await CustomerRepository.deactivate(id!);
            else await CustomerRepository.activate(id!);
            await loadData();
          },
        },
      ]
    );
  }, [isReadOnly, customer, id, loadData]);

  const handleWhatsApp = useCallback(() => {
    if (!customer?.phone || !activeStore) return;
    const totalPaid = debts.reduce((s, d) => s + (d.paidAmount || 0), 0);
    const text = WhatsAppService.generateDebtReminderText(
      activeStore, customer.name, totalDebt + totalPaid, totalPaid, totalDebt
    );
    const cleaned = customer.phone.replace(/\D/g, '');
    const formatted = cleaned.startsWith('62') ? cleaned : `62${cleaned}`;
    Linking.openURL(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`);
  }, [customer, activeStore, debts, totalDebt]);

  if (!customer) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Memuat data pelanggan...</Text>
      </View>
    );
  }

  const isActive = customer.isActive !== 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Pelanggan</Text>
        <TouchableOpacity onPress={handleOpenEdit} style={styles.editBtn} hitSlop={8}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
      >
        {/* Info pelanggan */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {customer.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.infoDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.customerName}>{customer.name}</Text>
                {!isActive && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>Nonaktif</Text>
                  </View>
                )}
              </View>
              {customer.phone
                ? <Text style={styles.customerPhone}>{customer.phone}</Text>
                : <Text style={styles.customerPhoneEmpty}>Tidak ada nomor HP</Text>
              }
              {customer.address ? <Text style={styles.customerSub}>{customer.address}</Text> : null}
              {customer.note ? <Text style={styles.customerSub}>{customer.note}</Text> : null}
            </View>
          </View>

          <View style={styles.actionRow}>
            {customer.phone ? (
              <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${customer.phone}`)}>
                <Ionicons name="call-outline" size={15} color={colors.secondary} />
                <Text style={[styles.actionBtnText, { color: colors.secondary }]}>Telepon</Text>
              </TouchableOpacity>
            ) : null}
            {customer.phone ? (
              <TouchableOpacity style={styles.actionBtn} onPress={handleWhatsApp}>
                <Ionicons name="logo-whatsapp" size={15} color={colors.secondary} />
                <Text style={[styles.actionBtnText, { color: colors.secondary }]}>WhatsApp</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: isActive ? colors.outlineVariant : colors.secondary }]}
              onPress={handleToggleActive}
            >
              <Ionicons
                name={isActive ? 'person-remove-outline' : 'person-add-outline'}
                size={15}
                color={isActive ? colors.error : colors.secondary}
              />
              <Text style={[styles.actionBtnText, { color: isActive ? colors.error : colors.secondary }]}>
                {isActive ? 'Nonaktifkan' : 'Aktifkan'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Total bon */}
        {totalDebt > 0 && (
          <View style={styles.debtBanner}>
            <Text style={styles.debtBannerLabel}>TOTAL BON BELUM LUNAS</Text>
            <CurrencyText amount={totalDebt} size="lg" color={colors.onPrimary} />
            <Text style={styles.debtBannerSub}>
              Terakhir:{' '}
              {debts.length > 0
                ? new Date(debts[0].createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })
                : '-'}
            </Text>
          </View>
        )}

        {/* Placeholder pembayaran */}
        <View style={styles.paymentPlaceholder}>
          <Ionicons name="wallet-outline" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.paymentPlaceholderText}>
            Fitur catat pembayaran bon sedang disiapkan.
          </Text>
        </View>

        {/* Riwayat bon */}
        <Text style={styles.sectionTitle}>Riwayat Bon ({debts.length})</Text>

        {debts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={40} color={colors.surfaceContainerHigh} />
            <Text style={styles.emptyText}>Belum ada catatan bon</Text>
          </View>
        ) : (
          debts.map((debt) => {
            const badge = getStatusBadge(debt.status);
            return (
              <Card key={debt.id} style={styles.debtItem}>
                <View style={styles.debtItemRow}>
                  <View style={styles.debtItemInfo}>
                    <Text style={styles.debtItemNote}>
                      {debt.note || `Bon #${debt.id.substring(0, 8)}`}
                    </Text>
                    <Text style={styles.debtItemDate}>
                      {new Date(debt.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                      {' · '}
                      {new Date(debt.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={styles.debtItemRight}>
                    <CurrencyText amount={debt.amount} size="sm" color={colors.primary} />
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                    </View>
                  </View>
                </View>
                {debt.status === 'partial' && debt.paidAmount > 0 && (
                  <View style={styles.paidRow}>
                    <Text style={styles.paidLabel}>Sudah dibayar: </Text>
                    <CurrencyText amount={debt.paidAmount} size="sm" color={colors.secondary} />
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEdit} transparent animationType="fade" onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ubah Pelanggan</Text>

            <Text style={styles.fieldLabel}>Nama Pelanggan *</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName}
              placeholder="Nama lengkap" placeholderTextColor={colors.onSurfaceVariant} />

            <Text style={styles.fieldLabel}>Nomor HP</Text>
            <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone}
              placeholder="08xxxxxxxxxx" placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="phone-pad" />

            <Text style={styles.fieldLabel}>Alamat</Text>
            <TextInput style={styles.input} value={editAddress} onChangeText={setEditAddress}
              placeholder="Alamat pelanggan" placeholderTextColor={colors.onSurfaceVariant} />

            <Text style={styles.fieldLabel}>Catatan</Text>
            <TextInput style={[styles.input, styles.inputMultiline]} value={editNote}
              onChangeText={setEditNote} placeholder="Catatan tambahan"
              placeholderTextColor={colors.onSurfaceVariant} multiline numberOfLines={2} />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEdit(false)}>
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
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.bodyLg, color: colors.onSurfaceVariant },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile, paddingVertical: 10,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  editBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },

  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile },

  infoCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.stackMd },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.stackMd,
  },
  avatarText: { ...typography.headlineMobile, fontWeight: '700', color: colors.onPrimary },
  infoDetails: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  customerName: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface, flex: 1 },
  inactiveBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.sm,
  },
  inactiveBadgeText: { fontSize: 9, color: colors.onSurfaceVariant, fontWeight: '600' },
  customerPhone: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  customerPhoneEmpty: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontStyle: 'italic' },
  customerSub: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.secondary,
  },
  actionBtnText: { ...typography.labelSm, fontWeight: '600' },

  debtBanner: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    padding: spacing.stackMd, marginBottom: spacing.stackMd,
  },
  debtBannerLabel: { ...typography.labelSm, color: colors.primaryFixed, marginBottom: 4 },
  debtBannerSub: { ...typography.labelSm, color: colors.primaryFixed, marginTop: 4 },

  paymentPlaceholder: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    padding: spacing.stackMd, marginBottom: spacing.stackMd,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  paymentPlaceholderText: { ...typography.bodyMd, color: colors.onSurfaceVariant, flex: 1 },

  sectionTitle: {
    ...typography.bodyMd, fontWeight: '700', color: colors.onSurface,
    marginBottom: spacing.stackSm,
  },

  debtItem: { padding: spacing.stackMd, marginBottom: spacing.stackSm },
  debtItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  debtItemInfo: { flex: 1, marginRight: spacing.stackMd },
  debtItemNote: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface },
  debtItemDate: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  debtItemRight: { alignItems: 'flex-end' },
  badge: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.sm },
  badgeText: { fontSize: 9, fontWeight: '700' },
  paidRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.stackSm },
  paidLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },

  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', padding: spacing.marginMobile,
  },
  modalCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.stackMd,
  },
  modalTitle: { ...typography.headlineMobile, color: colors.onSurface, marginBottom: spacing.stackMd },
  fieldLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: spacing.stackMd,
    ...typography.bodyMd, color: colors.onSurface,
  },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { ...typography.bodyLg, color: colors.onPrimary, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { ...typography.bodyMd, color: colors.primary, fontWeight: '700' },
});
