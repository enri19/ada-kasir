import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { CurrencyText } from '../../src/components/CurrencyText';
import { ProductRepository } from '../../src/database/product.repo';
import { CategoryRepository } from '../../src/database/category.repo';
import { Product } from '../../src/types/product';
import { Category } from '../../src/types/category';
import { useCartStore } from '../../src/stores/cart.store';
import { useAppStore } from '../../src/stores/app.store';

export default function KasirScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const getTotal = useCartStore((state) => state.getTotal);
  const getItemCount = useCartStore((state) => state.getItemCount);

  const activeStore = useAppStore((state) => state.activeStore);
  const storeName = activeStore?.name || 'AdaKasir';

  const [needsRefresh, setNeedsRefresh] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([
        ProductRepository.getActive(),
        CategoryRepository.getAll(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setNeedsRefresh(false);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }, []);

  useEffect(() => {
    if (needsRefresh) {
      loadData();
    }
  }, [needsRefresh, loadData]);

  useFocusEffect(
    useCallback(() => {
      setNeedsRefresh(true);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalItems = getItemCount();
  const totalPrice = getTotal();

  const availableCategories = categories.filter((category) =>
    products.some((product) => product.categoryId === category.id)
  );
  const categoryChips = [{ id: null, name: 'Semua' }, ...availableCategories.map(c => ({ id: c.id, name: c.name }))];

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === null || product.categoryId === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="storefront" size={24} color={colors.primary} />
          <Text style={styles.headerTitle}>{storeName}</Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Online</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.onSurfaceVariant} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari Indomie, Aqua, Rokok..."
          placeholderTextColor={colors.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {availableCategories.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categoryChips.map((cat) => (
            <TouchableOpacity
              key={cat.id || 'semua'}
              style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView 
        style={styles.productsContainer} 
        contentContainerStyle={[styles.productsContent, { paddingBottom: 80 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={colors.surfaceContainerHigh} />
            <Text style={styles.emptyTitle}>Belum ada produk</Text>
            <Text style={styles.emptyText}>Tambahkan produk di halaman Produk</Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.map((product) => (
              <TouchableOpacity 
                key={product.id} 
                style={styles.productCard}
                onPress={() => router.push(`/produk/detail/${product.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.productImage}>
                  {product.imageUri ? (
                    <Image source={{ uri: product.imageUri }} style={styles.productImageContent} />
                  ) : (
                    <Text style={styles.productImageText}>img</Text>
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                  <View style={styles.productFooter}>
                    <Text style={styles.productUnit}>{product.unit}</Text>
                    <CurrencyText amount={product.sellPrice} size="sm" color={colors.primary} />
                  </View>
                  {product.stock <= 5 && (
                    <Text style={styles.stockWarning}>Stok: {product.stock}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {totalItems > 0 && (
        <TouchableOpacity 
          style={[styles.cartBar, { bottom: 0 }]}
          onPress={() => router.push('/keranjang')}
          activeOpacity={0.9}
        >
          <View style={styles.cartInfo}>
            <View style={styles.cartIcon}>
              <Ionicons name="cart" size={24} color={colors.onPrimary} />
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalItems}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.cartLabel}>{totalItems} ITEM TERPILIH</Text>
              <CurrencyText amount={totalPrice} size="lg" color={colors.onPrimary} />
            </View>
          </View>
          <View style={styles.payButton}>
            <Text style={styles.payButtonText}>Bayar</Text>
          </View>
        </TouchableOpacity>
      )}
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
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    marginHorizontal: spacing.marginMobile, marginTop: spacing.stackSm, marginBottom: spacing.stackSm,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: colors.outlineVariant, minHeight: 36,
  },
  searchInput: { flex: 1, marginLeft: spacing.stackSm, ...typography.bodyMd, color: colors.onSurface, paddingVertical: 0 },
  categoriesContainer: { maxHeight: 36, marginBottom: spacing.stackSm },
  categoriesContent: { paddingHorizontal: spacing.marginMobile, gap: spacing.stackSm },
  categoryChip: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14,
    backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant,
    minHeight: 28, justifyContent: 'center', alignItems: 'center',
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: '500', fontSize: 11 },
  categoryTextActive: { color: colors.onPrimary, fontWeight: '600', fontSize: 11 },
  productsContainer: { flex: 1 },
  productsContent: { padding: spacing.marginMobile },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { ...typography.headlineMobile, color: colors.onSurface, marginTop: spacing.stackMd },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.stackSm },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.stackMd },
  productCard: {
    width: '47%', backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.outlineVariant,
  },
  productImage: {
    height: 120, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  productImageContent: { width: '100%', height: '100%' },
  productImageText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  productInfo: { padding: spacing.stackSm },
  productName: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface, marginBottom: 4, minHeight: 40 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productUnit: { ...typography.labelSm, color: colors.onSurfaceVariant },
  stockWarning: { ...typography.labelSm, color: colors.error, marginTop: 2 },
  cartBar: {
    position: 'absolute', left: 0, right: 0, backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile, paddingVertical: spacing.stackMd,
    borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg,
  },
  cartInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd },
  cartIcon: { position: 'relative' },
  cartBadge: {
    position: 'absolute', top: -8, right: -8, backgroundColor: colors.error,
    borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  cartBadgeText: { ...typography.labelSm, color: colors.onPrimary, fontSize: 10 },
  cartLabel: { ...typography.labelSm, color: colors.primaryFixed, marginBottom: 2 },
  payButton: {
    backgroundColor: colors.onPrimary, paddingHorizontal: spacing.stackLg,
    paddingVertical: spacing.stackSm, borderRadius: borderRadius.md,
  },
  payButtonText: { ...typography.bodyLg, fontWeight: '700', color: colors.primary },
});
