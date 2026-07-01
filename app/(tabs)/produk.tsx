import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Image, Modal, FlatList } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { CurrencyText } from '../../src/components/CurrencyText';
import { ProductRepository } from '../../src/database/product.repo';
import { CategoryRepository } from '../../src/database/category.repo';
import { seedProducts } from '../../src/database/seed/seed-products';
import { Product } from '../../src/types/product';
import { Category } from '../../src/types/category';
import { useAppStore } from '../../src/stores/app.store';
import { getProductImage } from '../../src/utils/product-images';

type ProductListItemProps = {
  product: Product;
  categoryName: string | null;
  onPress: (product: Product) => void;
  onOpenMenu: (product: Product) => void;
};

const CATEGORY_STYLES: Record<string, object> = {
  Makanan: { backgroundColor: '#fff3e0' },
  Minuman: { backgroundColor: '#e3f2fd' },
  Sembako: { backgroundColor: '#f3e5f5' },
  Rokok: { backgroundColor: '#ffebee' },
};

const ProductListItem = React.memo(function ProductListItem({
  product, categoryName, onPress, onOpenMenu,
}: ProductListItemProps) {
  const categoryStyle = categoryName
    ? (CATEGORY_STYLES[categoryName] ?? { backgroundColor: '#f5f5f5' })
    : null;
  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onPress(product)}
      onLongPress={() => onOpenMenu(product)}
      activeOpacity={0.75}
    >
      <View style={styles.productRow}>
        <View style={styles.productImage}>
          <Image
            source={getProductImage(product.imageKey)}
            style={styles.productImageContent}
            resizeMode="cover"
          />
        </View>
        <View style={styles.productInfo}>
          <Text
            style={[styles.productName, !product.isActive && styles.productNameInactive]}
            numberOfLines={1}
          >
            {product.name}
          </Text>
          <View style={styles.productMeta}>
            <Text style={[styles.stockText, product.stock <= 5 && styles.stockLow]} numberOfLines={1}>
              Stok: {product.stock}
            </Text>
            {categoryName && categoryStyle && (
              <View style={[styles.categoryBadge, categoryStyle]}>
                <Text style={styles.categoryBadgeText} numberOfLines={1}>{categoryName}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.productRight}>
          <CurrencyText amount={product.sellPrice} size="sm" color={colors.primary} />
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => onOpenMenu(product)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function ProdukScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedInventoryFilter, setSelectedInventoryFilter] = useState<'all' | 'low' | 'out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { inventory } = useLocalSearchParams<{ inventory?: string }>();
  const [showInventoryFilter, setShowInventoryFilter] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activeStore = useAppStore((state) => state.activeStore);
  const storeName = activeStore?.name || 'AdaKasir';

  const [needsRefresh, setNeedsRefresh] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([
        ProductRepository.getAll(),
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

  useEffect(() => {
    if (inventory === 'low' || inventory === 'out' || inventory === 'all') {
      setSelectedInventoryFilter(inventory);
    }
  }, [inventory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const categoryNameMap = useMemo(() => {
    return categories.reduce<Record<string, string>>((acc, category) => {
      acc[category.id] = category.name;
      return acc;
    }, {});
  }, [categories]);

  const getCategoryName = useCallback(
    (categoryId: string | null): string | null => {
      if (!categoryId) return null;
      return categoryNameMap[categoryId] || null;
    },
    [categoryNameMap]
  );

  const availableCategories = useMemo(() => {
    const productCategoryIds = new Set(
      products.map((p) => p.categoryId).filter(Boolean)
    );
    return categories.filter((category) => productCategoryIds.has(category.id));
  }, [categories, products]);

  const categoryChips = useMemo(() => {
    return [
      { id: null, name: 'Semua' },
      ...availableCategories.map((c) => ({ id: c.id, name: c.name })),
    ];
  }, [availableCategories]);

  const inventoryFilters = useMemo(() => [
    { id: 'all', name: 'Semua' },
    { id: 'low', name: 'Menipis' },
    { id: 'out', name: 'Habis' },
  ], []);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = selectedCategory === null || product.categoryId === selectedCategory;
      const matchesSearch = query.length === 0 || product.name.toLowerCase().includes(query);
      const matchesInventory =
        selectedInventoryFilter === 'all' ||
        (selectedInventoryFilter === 'low' && product.trackStock && product.stock > 0 && product.stock <= product.minStock) ||
        (selectedInventoryFilter === 'out' && product.trackStock && product.stock <= 0);
      return matchesCategory && matchesSearch && matchesInventory;
    });
  }, [products, selectedCategory, searchQuery, selectedInventoryFilter]);

  const selectedInventoryFilterLabel = useMemo(
    () => inventoryFilters.find((f) => f.id === selectedInventoryFilter)?.name || 'Semua',
    [inventoryFilters, selectedInventoryFilter]
  );

  const handleToggleActive = useCallback(async (product: Product) => {
    try {
      await ProductRepository.update(product.id, { isActive: !product.isActive });
      await loadData();
    } catch (error) {
      console.error('Error toggling product:', error);
    }
  }, [loadData]);

  const handleSeedDummy = async () => {
    try {
      const { inserted, skipped } = await seedProducts();
      alert(`Selesai! ${inserted} produk ditambahkan, ${skipped} dilewati.`);
      await loadData();
    } catch (error) {
      console.error('Seed error:', error);
      alert('Gagal mengisi dummy produk.');
    }
  };

  const handleDelete = useCallback(async (product: Product) => {
    try {
      await ProductRepository.delete(product.id);
      await loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  }, [loadData]);

  const [selectedActionProduct, setSelectedActionProduct] = useState<Product | null>(null);

  const openActionMenu = useCallback((product: Product) => {
    setSelectedActionProduct(product);
  }, []);

  const closeActionMenu = useCallback(() => {
    setSelectedActionProduct(null);
  }, []);

  const handleProductPress = useCallback((product: Product) => {
    router.push(`/produk/edit/${product.id}`);
  }, [router]);

  const renderProductItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductListItem
        product={item}
        categoryName={getCategoryName(item.categoryId)}
        onPress={handleProductPress}
        onOpenMenu={openActionMenu}
      />
    ),
    [getCategoryName, handleProductPress, openActionMenu]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="storefront" size={24} color={colors.primary} />
          <Text style={styles.headerTitle}>{storeName}</Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Siap Jualan</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.onSurfaceVariant} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari Produk..."
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
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === cat.id && styles.categoryTextActive
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowInventoryFilter(true)}>
          <Text style={styles.filterButtonText}>Filter Stok: {selectedInventoryFilterLabel}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <Modal visible={showInventoryFilter} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter Stok</Text>
            {inventoryFilters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedInventoryFilter(filter.id as 'all' | 'low' | 'out');
                  setShowInventoryFilter(false);
                }}
              >
                <Text style={[styles.modalOptionText, selectedInventoryFilter === filter.id && styles.modalOptionSelected]}>
                  {filter.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowInventoryFilter(false)}>
              <Text style={styles.modalCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedActionProduct}
        transparent
        animationType="fade"
        onRequestClose={closeActionMenu}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle} numberOfLines={1}>{selectedActionProduct?.name}</Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                if (!selectedActionProduct) return;
                closeActionMenu();
                router.push(`/produk/edit/${selectedActionProduct.id}`);
              }}
            >
              <Text style={styles.modalOptionText}>Edit Produk</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                if (!selectedActionProduct) return;
                const product = selectedActionProduct;
                closeActionMenu();
                handleToggleActive(product);
              }}
            >
              <Text style={styles.modalOptionText}>
                {selectedActionProduct?.isActive ? 'Nonaktifkan Produk' : 'Aktifkan Produk'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                if (!selectedActionProduct) return;
                const product = selectedActionProduct;
                closeActionMenu();
                handleDelete(product);
              }}
            >
              <Text style={[styles.modalOptionText, { color: colors.error }]}>Hapus Produk</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCloseButton} onPress={closeActionMenu}>
              <Text style={styles.modalCloseText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FlatList
        style={styles.productsContainer}
        contentContainerStyle={styles.productsContent}
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={colors.surfaceContainerHigh} />
            <Text style={styles.emptyTitle}>Belum ada produk</Text>
            <Text style={styles.emptyText}>Tambahkan produk pertama Anda</Text>
          </View>
        }
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={80}
        windowSize={3}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
      />

      {__DEV__ && (
        <TouchableOpacity
          style={[styles.fabSeed, { bottom: 84 }]}
          onPress={handleSeedDummy}
        >
          <Ionicons name="flask-outline" size={20} color={colors.onPrimary} />
          <Text style={styles.fabSeedText}>Dummy</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity 
        style={[styles.fab, { bottom: 16 }]}
        onPress={() => router.push('/produk/tambah')}
      >
        <Ionicons name="add" size={28} color={colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, paddingVertical: spacing.stackSm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
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
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.stackSm, marginBottom: spacing.stackSm,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: colors.outlineVariant, minHeight: 36,
  },
  searchInput: { flex: 1, marginLeft: spacing.stackSm, ...typography.bodyMd, color: colors.onSurface, paddingVertical: 0 },
  categoriesContainer: { maxHeight: 36, marginBottom: spacing.stackSm },
  categoriesContent: { paddingHorizontal: spacing.marginMobile, gap: spacing.stackSm },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: spacing.marginMobile, marginBottom: spacing.stackSm,
  },
  filterButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1,
    backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  filterButtonText: { ...typography.bodyMd, color: colors.onSurface },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: spacing.marginMobile,
  },
  modalContent: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.stackMd,
  },
  modalTitle: { ...typography.headlineMobile, color: colors.onSurface, marginBottom: spacing.stackSm },
  modalOption: { paddingVertical: spacing.stackSm },
  modalOptionText: { ...typography.bodyMd, color: colors.onSurface },
  modalOptionSelected: { color: colors.primary, fontWeight: '700' },
  modalCloseButton: { marginTop: spacing.stackMd, alignItems: 'center' },
  modalCloseText: { ...typography.bodyMd, color: colors.primary, fontWeight: '700' },
  categoryChip: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14,
    backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant,
    minHeight: 28, justifyContent: 'center', alignItems: 'center',
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: '500', fontSize: 11 },
  categoryTextActive: { color: colors.onPrimary, fontWeight: '600', fontSize: 11 },
  productsContainer: { flex: 1 },
  productsContent: { paddingHorizontal: spacing.marginMobile, paddingTop: 4, paddingBottom: 120 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { ...typography.headlineMobile, color: colors.onSurface, marginTop: spacing.stackMd },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.stackSm },
  productCard: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  productRow: { flexDirection: 'row', alignItems: 'center' },
  productImage: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
    marginRight: 10,
  },
  productImageContent: { width: '100%', height: '100%' },
  productInfo: { flex: 1 },
  productName: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface, marginBottom: 4 },
  productNameInactive: { color: colors.onSurfaceVariant, textDecorationLine: 'line-through' },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  stockText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  stockLow: { color: colors.error, fontWeight: '700' },
  categoryBadge: { paddingHorizontal: spacing.stackSm, paddingVertical: 2, borderRadius: borderRadius.sm },
  categoryBadgeText: { ...typography.labelSm, fontSize: 10 },
  productRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  moreButton: { padding: 4 },
  fab: {
    position: 'absolute', right: spacing.marginMobile,
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  fabSeed: {
    position: 'absolute', right: spacing.marginMobile,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.secondary, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 6,
  },
  fabSeedText: { ...typography.labelSm, color: colors.onPrimary, fontWeight: '700' },
});
