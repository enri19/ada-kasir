import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../../src/config/theme';
import { CurrencyText } from '../../../src/components/CurrencyText';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { ProductRepository } from '../../../src/database/product.repo';
import { CategoryRepository } from '../../../src/database/category.repo';
import { Product } from '../../../src/types/product';
import { Category } from '../../../src/types/category';
import { useCartStore } from '../../../src/stores/cart.store';
import { CustomHeader } from '../../../src/components/CustomHeader';

export default function DetailProdukKasirScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Product | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    if (id) {
      Promise.all([
        ProductRepository.getById(id),
        CategoryRepository.getAll(),
      ]).then(([prod, cats]) => {
        if (prod) {
          setProduct(prod);
          const cat = cats.find((c) => c.id === prod.categoryId);
          setCategoryName(cat?.name || '');
        }
      }).catch(console.error);
    }
  }, [id]);

  const subtotal = product ? qty * product.sellPrice : 0;

  const proceedAddToCart = () => {
    if (!product) return;
    setAdding(true);
    for (let i = 0; i < qty; i++) {
      addItem(product);
    }
    setAdding(false);
    Alert.alert('Berhasil', `${product.name} x${qty} ditambahkan ke keranjang`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const handleAddToCart = () => {
    if (!product || adding) return;

    if (!product.trackStock) {
      proceedAddToCart();
      return;
    }

    if (qty > product.stock) {
      if (product.allowNegativeStock) {
        Alert.alert(
          'Stok Kurang',
          `Stok tersedia: ${product.stock}\nTetap lanjutkan transaksi?`,
          [
            { text: 'Batal', style: 'cancel' },
            { text: 'Lanjutkan', onPress: proceedAddToCart },
          ]
        );
        return;
      }

      Alert.alert('Stok Tidak Cukup', `Stok tersedia: ${product.stock}`);
      return;
    }

    proceedAddToCart();
  };

  if (!product) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingText}>Memuat produk...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <CustomHeader title="Detail Produk" onBack={() => router.back()} />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Image Section */}
        <View style={styles.imageContainer}>
          <View style={styles.imageBox}>
            {product.imageUri ? (
              <Image source={{ uri: product.imageUri }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>img</Text>
              </View>
            )}
          </View>
          <View style={styles.stockBadge}>
            <Text style={styles.stockBadgeText}>Stok: {product.stock}</Text>
          </View>
        </View>

        {/* Product Info Card */}
        <Card style={styles.infoCard}>
          {categoryName && (
            <Text style={styles.categoryName}>{categoryName.toUpperCase()}</Text>
          )}
          <View style={styles.namePriceRow}>
            <Text style={styles.productName}>{product.name}</Text>
            <View style={styles.priceInfo}>
              <Text style={styles.priceLabel}>Harga Satuan</Text>
              <CurrencyText amount={product.sellPrice} size="sm" color={colors.primary} />
            </View>
          </View>
        </Card>

        {/* Quantity Card */}
        <Card style={styles.qtyCard}>
          <Text style={styles.qtyLabel}>JUMLAH PEMBELIAN</Text>
          <View style={styles.qtyControl}>
            <TouchableOpacity
              style={[styles.qtyButton, qty <= 1 && styles.qtyButtonDisabled]}
              onPress={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
            >
              <Ionicons name="remove" size={24} color={qty <= 1 ? colors.onSurfaceVariant : colors.primary} />
            </TouchableOpacity>
            <View style={styles.qtyCenter}>
              <Text style={styles.qtyValue}>{qty}</Text>
              <Text style={styles.qtyUnit}>{product.unit}</Text>
            </View>
            <TouchableOpacity
              style={[styles.qtyButton, qty >= product.stock && styles.qtyButtonDisabled]}
              onPress={() => setQty(Math.min(product.stock, qty + 1))}
              disabled={qty >= product.stock}
            >
              <Ionicons name="add" size={24} color={qty >= product.stock ? colors.onSurfaceVariant : colors.primary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Note Card */}
        <Card style={styles.noteCard}>
          <Text style={styles.noteLabel}>CATATAN TRANSAKSI</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Contoh: Tanpa bumbu pedas, atau titipan tetangga..."
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Card>

        {/* Subtotal Bar */}
        <View style={styles.subtotalBar}>
          <View>
            <Text style={styles.subtotalLabel}>Total Sementara</Text>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
          </View>
          <CurrencyText amount={subtotal} size="lg" color={colors.onPrimary} />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={handleAddToCart}
          disabled={adding}
          activeOpacity={0.8}
        >
          {adding ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Ionicons name="cart-outline" size={20} color={colors.onPrimary} />
              <Text style={styles.bottomButtonText}>Tambah ke Keranjang</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={styles.bottomSubtotal}>
          <Text style={styles.bottomSubtotalLabel}>SUBTOTAL</Text>
          <CurrencyText amount={subtotal} size="sm" color={colors.onSurface} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  contentContainer: { paddingBottom: 120 },
  loadingText: { ...typography.bodyLg, color: colors.onSurfaceVariant },

  imageContainer: { position: 'relative', margin: spacing.marginMobile },
  imageBox: {
    height: 220, borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainerHigh, overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { ...typography.bodyLg, color: colors.onSurfaceVariant },
  stockBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: colors.secondaryContainer, paddingHorizontal: spacing.stackSm, paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  stockBadgeText: { ...typography.labelSm, color: colors.secondary, fontWeight: '600' },

  infoCard: { marginHorizontal: spacing.marginMobile, marginBottom: spacing.stackMd, padding: spacing.stackMd },
  categoryName: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  namePriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { ...typography.headlineMobile, fontWeight: '700', color: colors.onSurface, flex: 1, paddingRight: spacing.stackMd },
  priceInfo: { alignItems: 'flex-end' },
  priceLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },

  qtyCard: { marginHorizontal: spacing.marginMobile, marginBottom: spacing.stackMd, padding: spacing.stackMd },
  qtyLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd },
  qtyControl: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  qtyButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  qtyButtonDisabled: { opacity: 0.4 },
  qtyCenter: { flex: 1, alignItems: 'center' },
  qtyValue: { ...typography.headlineMobile, fontWeight: '700', color: colors.onSurface },
  qtyUnit: { ...typography.labelSm, color: colors.onSurfaceVariant },

  noteCard: { marginHorizontal: spacing.marginMobile, marginBottom: spacing.stackMd, padding: spacing.stackMd },
  noteLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  noteInput: {
    ...typography.bodyMd, color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
    padding: spacing.stackMd, minHeight: 80,
  },

  subtotalBar: {
    marginHorizontal: spacing.marginMobile,
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    padding: spacing.stackMd, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  subtotalLabel: { ...typography.labelSm, color: colors.primaryFixed },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.outlineVariant,
    flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd,
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.stackSm,
  },
  bottomButton: {
    flex: 1, height: 48,
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  bottomButtonText: { ...typography.bodyLg, fontWeight: '700', color: colors.onPrimary },
  bottomSubtotal: { alignItems: 'flex-end' },
  bottomSubtotalLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
});
