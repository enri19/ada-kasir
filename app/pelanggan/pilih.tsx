import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { CurrencyText } from '../../src/components/CurrencyText';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { CustomerRepository } from '../../src/database/customer.repo';
import { Customer } from '../../src/types/customer';
import { useCartStore } from '../../src/stores/cart.store';
import { InvoiceService } from '../../src/services/invoice.service';
import { useAppStore } from '../../src/stores/app.store';
import { WhatsAppService } from '../../src/services/whatsapp.service';
import { Linking } from 'react-native';
import { AppFooterActions } from '../../src/components/ui/AppFooterActions';

export default function PilihPelangganScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { paymentMethod } = useLocalSearchParams<{ paymentMethod?: string }>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const activeStore = useAppStore((state) => state.activeStore);
  const totalPrice = getTotal();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await CustomerRepository.getAll();
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
      Alert.alert('Error', 'Pilih pelanggan terlebih dahulu');
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      const sale = await InvoiceService.processTransaction(items, selectedCustomer.id, 'debt', 0);

      if (activeStore) {
        const receiptText = WhatsAppService.generateReceiptText(activeStore, sale);
        const encoded = encodeURIComponent(receiptText);
        const waUrl = `https://wa.me/?text=${encoded}`;
        await Linking.openURL(waUrl).catch(() => {});
      }

      clearCart();
      router.replace({
        pathname: '/transaksi/berhasil',
        params: {
          invoiceNumber: sale.invoiceNumber,
          total: String(sale.totalAmount),
          paymentMethod: 'debt',
        },
      });
    } catch (error) {
      console.error('Debt payment error:', error);
      Alert.alert('Error', 'Gagal memproses pembayaran bon');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = () => {
    router.push({ pathname: '/pelanggan/tambah', params: { returnTo: 'pembayaran' } });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pilih Pelanggan</Text>
        <TouchableOpacity onPress={handleAddCustomer}>
          <Ionicons name="person-add-outline" size={24} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.totalBar}>
        <Text style={styles.totalLabel}>Total Bon</Text>
        <CurrencyText amount={totalPrice} size="lg" color={colors.primary} />
      </View>

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

      <ScrollView style={styles.content} contentContainerStyle={{
        padding: spacing.marginMobile,
        paddingBottom: 120 + Math.max(insets.bottom, 24)
      }}>
        <Text style={styles.sectionTitle}>DAFTAR PELANGGAN</Text>

        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.surfaceContainerHigh} />
            <Text style={styles.emptyTitle}>Belum ada pelanggan</Text>
            <Text style={styles.emptyText}>Tambahkan pelanggan baru untuk mencatat bon</Text>
            <Button title="Tambah Pelanggan" onPress={handleAddCustomer} size="lg" />
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
      </ScrollView>

      {selectedCustomer && (
        <AppFooterActions>
          <Button
            title={`Proses Bon - ${selectedCustomer.name}`}
            onPress={handleConfirm}
            size="lg"
            fullWidth
            loading={loading}
          />
        </AppFooterActions>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, paddingVertical: spacing.stackMd,
    backgroundColor: colors.primary,
  },
  headerTitle: { ...typography.headlineMobile, color: colors.onPrimary, fontWeight: '700' },
  totalBar: {
    backgroundColor: colors.primaryContainer, padding: spacing.stackMd,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { ...typography.labelSm, color: colors.primaryFixed },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    marginHorizontal: spacing.marginMobile, marginTop: spacing.stackSm, marginBottom: spacing.stackSm,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: colors.outlineVariant, minHeight: 36,
  },
  searchInput: { flex: 1, marginLeft: spacing.stackSm, ...typography.bodyMd, color: colors.onSurface, paddingVertical: 0 },
  content: { flex: 1 },
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
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.stackSm, marginBottom: spacing.stackLg },
});