import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../src/config/theme';
import { CurrencyText } from '../src/components/CurrencyText';
import { Button } from '../src/components/Button';
import { useCartStore } from '../src/stores/cart.store';
import { formatRupiah, parseRupiah } from '../src/utils/currency';

export default function KeranjangScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useCartStore((state) => state.items);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getTotal = useCartStore((state) => state.getTotal);
  const getItemCount = useCartStore((state) => state.getItemCount);
  const discount = useCartStore((state) => state.discount);
  const discountNote = useCartStore((state) => state.discountNote);
  const setDiscount = useCartStore((state) => state.setDiscount);

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountInput, setDiscountInput] = useState('');

  const totalItems = getItemCount();
  const subtotalPrice = getSubtotal();
  const totalPrice = getTotal();

  const handleApplyDiscount = () => {
    const amount = parseRupiah(discountInput);
    if (amount > subtotalPrice) {
      Alert.alert('Error', 'Diskon tidak boleh lebih besar dari subtotal');
      return;
    }
    setDiscount(amount, discountInput ? `Diskon Rp${amount.toLocaleString('id-ID')}` : '');
    setShowDiscountModal(false);
    setDiscountInput('');
  };

  const handleRemoveDiscount = () => {
    setDiscount(0, '');
    setShowDiscountModal(false);
    setDiscountInput('');
  };

  if (items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Keranjang Belanja</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={64} color={colors.surfaceContainerHigh} />
          <Text style={styles.emptyTitle}>Keranjang Kosong</Text>
          <Text style={styles.emptyText}>Tambahkan produk dari halaman Kasir</Text>
          <Button title="Ke Kasir" onPress={() => router.back()} size="lg" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Keranjang Belanja</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {items.map((item) => (
          <View key={item.product.id} style={styles.cartItem}>
            <View style={styles.itemHeader}>
              <View style={styles.itemImage}>
                {item.product.imageUri ? (
                  <Image source={{ uri: item.product.imageUri }} style={styles.itemImageContent} />
                ) : (
                  <Text style={styles.itemImageText}>img</Text>
                )}
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.itemPrice}>
                  <CurrencyText amount={item.product.sellPrice} size="sm" /> / {item.product.unit}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeItem(item.product.id)}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
            <View style={styles.itemFooter}>
              <View style={styles.qtyControl}>
                <TouchableOpacity 
                  style={styles.qtyButton}
                  onPress={() => updateQty(item.product.id, item.qty - 1)}
                >
                  <Ionicons name="remove" size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.qty}</Text>
                <TouchableOpacity 
                  style={styles.qtyButton}
                  onPress={() => updateQty(item.product.id, item.qty + 1)}
                >
                  <Ionicons name="add" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.subtotalContainer}>
                <Text style={styles.subtotalLabel}>Subtotal</Text>
                <CurrencyText amount={item.subtotal} size="md" color={colors.primary} />
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity 
          style={styles.discountButton}
          onPress={() => {
            setDiscountInput(discount > 0 ? String(discount) : '');
            setShowDiscountModal(true);
          }}
        >
          <Ionicons name="pricetag-outline" size={20} color={colors.onPrimary} />
          <Text style={styles.discountButtonText}>
            {discount > 0 ? `Diskon: ${formatRupiah(discount)}` : 'Tambah Diskon atau Voucher'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.onPrimary} />
        </TouchableOpacity>

        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Item</Text>
            <Text style={styles.summaryValue}>{totalItems} Item</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <CurrencyText amount={subtotalPrice} size="md" />
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Diskon Toko</Text>
            <Text style={[styles.summaryValue, discount > 0 && styles.discountValue]}>
              {discount > 0 ? `-${formatRupiah(discount)}` : '-Rp 0'}
            </Text>
          </View>
        </View>

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Akhir</Text>
          <CurrencyText amount={totalPrice} size="xl" color={colors.onPrimary} />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
        <Button 
          title="PILIH PEMBAYARAN" 
          onPress={() => router.push('/pembayaran')}
          size="lg" 
          fullWidth
          icon={<Ionicons name="wallet-outline" size={20} color={colors.onPrimary} />}
        />
      </View>

      {/* Discount Modal */}
      <Modal visible={showDiscountModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Masukkan Diskon</Text>
            <View style={styles.discountInputRow}>
              <Text style={styles.discountPrefix}>Rp</Text>
              <TextInput
                style={styles.discountTextInput}
                value={discountInput}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '');
                  setDiscountInput(num);
                }}
                placeholder="0"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="number-pad"
                autoFocus
              />
            </View>
            {discountInput ? (
              <Text style={styles.discountPreview}>
                Diskon: {formatRupiah(parseRupiah(discountInput))}
              </Text>
            ) : null}
            <View style={styles.modalButtons}>
              {discount > 0 && (
                <Button
                  title="Hapus Diskon"
                  onPress={handleRemoveDiscount}
                  variant="outline"
                  size="lg"
                />
              )}
              <Button
                title="Terapkan"
                onPress={handleApplyDiscount}
                size="lg"
              />
            </View>
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => setShowDiscountModal(false)}
            >
              <Text style={styles.modalCloseText}>Tutup</Text>
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
    paddingHorizontal: spacing.marginMobile, paddingVertical: spacing.stackMd,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  headerTitle: { ...typography.headlineMobile, color: colors.primary, fontWeight: '700' },
  content: { flex: 1 },
  contentContainer: { padding: spacing.marginMobile, paddingBottom: 100 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.marginMobile },
  emptyTitle: { ...typography.headlineMobile, color: colors.onSurface, marginTop: spacing.stackMd },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.stackSm, marginBottom: spacing.stackLg },
  cartItem: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.stackMd, marginBottom: spacing.stackMd,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.stackMd },
  itemImage: {
    width: 60, height: 60, borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImageContent: { width: '100%', height: '100%' },
  itemImageText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  itemInfo: { flex: 1, marginHorizontal: spacing.stackSm },
  itemName: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface },
  itemPrice: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyControl: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  qtyButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  qtyText: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface, width: 40, textAlign: 'center' },
  subtotalContainer: { alignItems: 'flex-end' },
  subtotalLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  discountButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.secondary, borderRadius: borderRadius.md,
    paddingVertical: spacing.stackMd, marginBottom: spacing.stackLg,
  },
  discountButtonText: { ...typography.bodyLg, fontWeight: '600', color: colors.onPrimary },
  summarySection: { marginBottom: spacing.stackLg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.stackSm },
  summaryLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  summaryValue: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface },
  discountValue: { color: colors.error },
  totalSection: {
    backgroundColor: colors.primaryContainer, borderRadius: borderRadius.lg,
    padding: spacing.stackLg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { ...typography.headlineMobile, fontWeight: '700', color: colors.onPrimary },
  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface, paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackMd, borderTopWidth: 1, borderTopColor: colors.outlineVariant,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.stackLg, width: '85%',
  },
  modalTitle: { ...typography.headlineMobile, fontWeight: '700', color: colors.onSurface, marginBottom: spacing.stackLg, textAlign: 'center' },
  discountInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.stackMd,
  },
  discountPrefix: { ...typography.headlineMobile, color: colors.onSurfaceVariant, marginRight: spacing.stackSm },
  discountTextInput: { flex: 1, ...typography.headlineMobile, fontWeight: '700', color: colors.onSurface },
  discountPreview: { ...typography.bodyLg, color: colors.primary, fontWeight: '600', textAlign: 'center', marginTop: spacing.stackSm },
  modalButtons: { flexDirection: 'row', gap: spacing.stackSm, marginTop: spacing.stackLg },
  modalClose: { marginTop: spacing.stackMd, alignItems: 'center' },
  modalCloseText: { ...typography.bodyLg, color: colors.primary, fontWeight: '600' },
});
