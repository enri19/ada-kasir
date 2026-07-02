import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { CurrencyText } from '../../src/components/CurrencyText';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { useCartStore } from '../../src/stores/cart.store';
import { CustomerRepository } from '../../src/database/customer.repo';
import { SaleRepository } from '../../src/database/sales.repo';
import { DebtRepository } from '../../src/database/debt.repo';
import { StockService } from '../../src/services/stock.service';
import { generateInvoiceNumber } from '../../src/utils/invoice-number';
import { CustomHeader } from '../../src/components/CustomHeader';
import { BottomActionBar } from '../../src/components/BottomActionBar';
import { Customer } from '../../src/types/customer';

export default function PembayaranBonScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const resetPayment = useCartStore((state) => state.resetPayment);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const totalPrice = getTotal();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await CustomerRepository.getActive();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirm = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Pilih pelanggan terlebih dahulu untuk mencatat bon.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Error', 'Keranjang masih kosong.');
      return;
    }
    if (totalPrice <= 0) {
      Alert.alert('Error', 'Total transaksi Rp0');
      return;
    }
    if (processing) return;

    setProcessing(true);
    try {
      const todayCount = await SaleRepository.getTodayCount();
      const invoiceNumber = generateInvoiceNumber(todayCount);

      const saleItems = items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        qty: item.qty,
        price: item.product.sellPrice,
        costPrice: item.product.costPrice,
        subtotal: item.subtotal,
      }));

      const sale = await SaleRepository.createSale(
        invoiceNumber,
        selectedCustomer.id,
        totalPrice,
        0,
        0,
        'debt',
        'debt',
        saleItems
      );

      await DebtRepository.createDebt(
        selectedCustomer.id,
        sale.id,
        totalPrice,
        0,
        totalPrice,
        'unpaid',
        null,
        note.trim() || null,
        'transaction'
      );

      await StockService.reduceStockForSaleItems(items, invoiceNumber, 'sale');

      clearCart();
      resetPayment();
      router.replace({
        pathname: '/transaksi/berhasil',
        params: {
          invoiceNumber,
          total: String(totalPrice),
          paymentMethod: 'debt',
        },
      });
    } catch (error) {
      console.error('Debt payment error:', error);
      Alert.alert('Error', 'Gagal memproses pembayaran bon');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddCustomer = () => {
    router.push({ pathname: '/pelanggan/tambah', params: { returnTo: 'pembayaran' } });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader title="Pembayaran Bon" onBack={() => router.back()} />

      <View style={styles.totalBar}>
        <Text style={styles.totalLabel}>Total Bon</Text>
        <CurrencyText amount={totalPrice} size="lg" color={colors.onPrimary} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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

        <TouchableOpacity style={styles.addCustomerButton} onPress={handleAddCustomer}>
          <Ionicons name="person-add-outline" size={20} color={colors.primary} />
          <Text style={styles.addCustomerText}>Tambah Pelanggan Baru</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Pilih Pelanggan</Text>

        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.surfaceContainerHigh} />
            <Text style={styles.emptyTitle}>Belum ada pelanggan</Text>
            <Text style={styles.emptyText}>Tambahkan pelanggan baru untuk mencatat bon</Text>
          </View>
        ) : (
          filteredCustomers.map((customer) => (
            <TouchableOpacity
              key={customer.id}
              style={[styles.customerCard, selectedCustomer?.id === customer.id && styles.customerCardSelected]}
              onPress={() => setSelectedCustomer(customer)}
            >
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
              {selectedCustomer?.id === customer.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))
        )}

        {selectedCustomer && (
          <Card style={styles.noteCard}>
            <Text style={styles.noteLabel}>Catatan (Opsional)</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Contoh: Titipan tetangga..."
              placeholderTextColor={colors.onSurfaceVariant}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </Card>
        )}
      </ScrollView>

      {selectedCustomer && (
        <BottomActionBar>
          <Button
            title={`Simpan Bon - ${selectedCustomer.name}`}
            onPress={handleConfirm}
            size="lg"
            fullWidth
            loading={processing}
          />
        </BottomActionBar>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  totalBar: {
    backgroundColor: colors.primaryContainer, padding: spacing.stackMd,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { ...typography.labelSm, color: colors.onPrimary },
  content: { flex: 1 },
  contentContainer: { padding: spacing.marginMobile, paddingBottom: 120 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: colors.outlineVariant, minHeight: 36, marginBottom: spacing.stackSm,
  },
  searchInput: { flex: 1, marginLeft: spacing.stackSm, ...typography.bodyMd, color: colors.onSurface, paddingVertical: 0 },
  addCustomerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.primary, paddingVertical: spacing.stackSm, marginBottom: spacing.stackMd,
  },
  addCustomerText: { ...typography.bodyMd, color: colors.primary, fontWeight: '600' },
  sectionTitle: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd },
  customerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.stackMd, marginBottom: spacing.stackSm,
  },
  customerCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  customerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.stackMd,
  },
  customerAvatarText: { ...typography.bodyLg, fontWeight: '700', color: colors.primary },
  customerInfo: { flex: 1 },
  customerName: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface },
  customerPhone: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { ...typography.headlineMobile, color: colors.onSurface, marginTop: spacing.stackMd },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.stackSm },
  noteCard: { marginTop: spacing.stackMd, padding: spacing.stackMd },
  noteLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  noteInput: {
    ...typography.bodyMd, color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
    padding: spacing.stackMd, minHeight: 60,
  },

});
