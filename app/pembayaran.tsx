import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../src/config/theme';
import { CurrencyText } from '../src/components/CurrencyText';
import { useCartStore } from '../src/stores/cart.store';
import { PaymentMethod } from '../src/types/sale';
import { CustomHeader } from '../src/components/CustomHeader';

const PAYMENT_METHODS: { id: PaymentMethod; name: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'cash', name: 'Tunai', icon: 'cash-outline', color: '#4CAF50' },
  { id: 'qris_static', name: 'QRIS', icon: 'qr-code-outline', color: '#2196F3' },
  { id: 'debt', name: 'Bon', icon: 'receipt-outline', color: '#FF9800' },
];

export default function PembayaranScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getTotal = useCartStore((state) => state.getTotal);
  const getItemCount = useCartStore((state) => state.getItemCount);
  const items = useCartStore((state) => state.items);
  const setPaymentMethod = useCartStore((state) => state.setPaymentMethod);

  const totalPrice = getTotal();
  const totalItems = getItemCount();

  const handleSelectMethod = (method: PaymentMethod) => {
    if (items.length === 0) {
      Alert.alert('Error', 'Keranjang masih kosong');
      return;
    }

    setPaymentMethod(method);

    switch (method) {
      case 'cash':
        router.push('/pembayaran/tunai');
        break;
      case 'qris_static':
        router.push('/pembayaran/qris');
        break;
      case 'debt':
        router.push('/pembayaran/bon');
        break;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <CustomHeader title="Pilih Pembayaran" onBack={() => router.back()} />

      <View style={styles.content}>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL BELANJA</Text>
          <CurrencyText amount={totalPrice} size="xxl" color={colors.primary} />
          <View style={styles.itemBadge}>
            <Ionicons name="basket-outline" size={16} color={colors.onPrimary} />
            <Text style={styles.itemBadgeText}>{totalItems} Barang</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Pilih Metode Pembayaran</Text>

        <View style={styles.methodsGrid}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodCard, { borderColor: method.color }]}
              onPress={() => handleSelectMethod(method.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.methodIcon, { backgroundColor: method.color + '20' }]}>
                <Ionicons name={method.icon} size={32} color={method.color} />
              </View>
              <Text style={[styles.methodName, { color: method.color }]}>{method.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.onSurfaceVariant} />
          <Text style={styles.infoText}>
            Tunai adalah metode default. QRIS dan Bon juga tersedia untuk kemudahan transaksi.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.marginMobile },
  totalCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.stackLg,
    alignItems: 'center', marginBottom: spacing.stackLg,
  },
  totalLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  itemBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.secondary, paddingHorizontal: spacing.stackSm, paddingVertical: 4,
    borderRadius: borderRadius.full, marginTop: spacing.stackSm,
  },
  itemBadgeText: { ...typography.labelSm, color: colors.onPrimary, fontWeight: '600' },
  sectionTitle: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface, marginBottom: spacing.stackMd },
  methodsGrid: { flexDirection: 'row', gap: spacing.stackMd, marginBottom: spacing.stackLg },
  methodCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 2, padding: spacing.stackLg, alignItems: 'center',
  },
  methodIcon: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.stackSm,
  },
  methodName: { ...typography.bodyLg, fontWeight: '700' },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    padding: spacing.stackMd,
  },
  infoText: { flex: 1, ...typography.labelSm, color: colors.onSurfaceVariant },
});
