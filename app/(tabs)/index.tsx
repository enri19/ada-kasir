import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Image, FlatList } from 'react-native';
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
import { getProductImage } from '../../src/utils/product-images';

type ProductGridItemProps = {
  product: Product;
  onPress: (product: Product) => void;
  onLongPress: (product: Product) => void;
};

const ProductGridItem = memo(function ProductGridItem({ product, onPress, onLongPress }: ProductGridItemProps) {
  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onPress(product)}
      onLongPress={() => onLongPress(product)}
      activeOpacity={0.75}
    >
      <View style={styles.productImage}>
        <Image
          source={getProductImage(product.imageKey)}
          style={styles.productImageContent}
          resizeMode="cover"
        />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <View style={styles.productFooter}>
          <Text style={styles.productUnit}>{product.unit}</Text>
          <CurrencyText amount={product.sellPrice} size="sm" color={colors.primary} />
        </View>
        {product.trackStock && product.stock <= 5 && (
          <Text style={styles.stockWarning}>Stok: {product.stock}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

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
  const discount = useCartStore((state) => state.discount);

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
      if (products.length === 0) {
        setNeedsRefresh(true);
      }
    }, [products.length])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const totalItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.qty, 0),
    [cartItems]
  );
  const totalPrice = useMemo(
    () => Math.max(0, cartItems.reduce((sum, item) => sum + item.subtotal, 0) - discount),
    [cartItems, discount]
  );

  const availableCategories = useMemo(() => {
    const productCategoryIds = new Set(products.map((p) => p.categoryId));
    return categories.filter((category) => productCategoryIds.has(category.id));
  }, [categories, products]);

  const categoryChips = useMemo(() => [
    { id: null, name: 'Semua' },
    ...availableCategories.map((c) => ({ id: c.id, name: c.name })),
  ], [availableCategories]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = selectedCategory === null || product.categoryId === selectedCategory;
      const matchesSearch = query.length === 0 || product.name.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleProductPress = useCallback((product: Product) => {
    addItem(product);
  }, [addItem]);

  const handleProductLongPress = useCallback((product: Product) => {
    router.push(`/produk/detail/${product.id}`);
  }, [router]);

  const renderProductItem = useCallback(({ item }: { item: Product }) => (
    <ProductGridItem
      product={item}
      onPress={handleProductPress}
      onLongPress={handleProductLongPress}
    />
  ), [handleProductPress, handleProductLongPress]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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

      <FlatList
        style={styles.productsContainer}
        contentContainerStyle={[styles.productsContent, { paddingBottom: totalItems > 0 ? 96 : 24 }]}
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={colors.surfaceContainerHigh} />
            <Text style={styles.emptyTitle}>Belum ada produk</Text>
            <Text style={styles.emptyText}>Tambahkan produk di halaman Produk</Text>
          </View>
        }
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={80}
        windowSize={3}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
      />

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
  productRow: { gap: spacing.stackMd },
  productCard: {
    flex: 1, maxWidth: '50%', backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.stackMd,
  },
  productImage: {
    height: 84,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
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
