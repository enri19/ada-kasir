import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Image, Modal } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Card } from '../../src/components/Card';
import { CurrencyText } from '../../src/components/CurrencyText';
import { ProductRepository } from '../../src/database/product.repo';
import { CategoryRepository } from '../../src/database/category.repo';
import { Product } from '../../src/types/product';
import { Category } from '../../src/types/category';
import { useAppStore } from '../../src/stores/app.store';

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
  const storeName = activeStore?.name || 'Warung Madura';

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
      setNeedsRefresh(true);
    }, [])
  );

  useEffect(() => {
    if (inventory === 'low' || inventory === 'out' || inventory === 'all') {
      setSelectedInventoryFilter(inventory);
    }
  }, [inventory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getCategoryStyle = (categoryName: string) => {
    switch (categoryName) {
      case 'Makanan': return styles.categoryMakanan;
      case 'Minuman': return styles.categoryMinuman;
      case 'Sembako': return styles.categorySembako;
      case 'Rokok': return styles.categoryRokok;
      default: return styles.categoryLainnya;
    }
  };

  const getCategoryName = (categoryId: string | null): string | null => {
    if (!categoryId) return null;
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || null;
  };

  const availableCategories = categories.filter((category) =>
    products.some((product) => product.categoryId === category.id)
  );
  const categoryChips = [{ id: null, name: 'Semua' }, ...availableCategories.map(c => ({ id: c.id, name: c.name }))];
  const inventoryFilters = [
    { id: 'all', name: 'Semua' },
    { id: 'low', name: 'Menipis' },
    { id: 'out', name: 'Habis' },
  ];

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === null || product.categoryId === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesInventory =
      selectedInventoryFilter === 'all' ||
      (selectedInventoryFilter === 'low' && product.trackStock && product.stock > 0 && product.stock <= product.minStock) ||
      (selectedInventoryFilter === 'out' && product.trackStock && product.stock <= 0);
    return matchesCategory && matchesSearch && matchesInventory;
  });

  const handleToggleActive = async (product: Product) => {
    try {
      await ProductRepository.update(product.id, { isActive: !product.isActive });
      await loadData();
    } catch (error) {
      console.error('Error toggling product:', error);
    }
  };

  const handleDelete = async (product: Product) => {
    try {
      await ProductRepository.delete(product.id);
      await loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

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
          <Text style={styles.filterButtonText}>Filter Stok: {inventoryFilters.find((f) => f.id === selectedInventoryFilter)?.name || 'Semua'}</Text>
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

      <ScrollView 
        style={styles.productsContainer} 
        contentContainerStyle={styles.productsContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={colors.surfaceContainerHigh} />
            <Text style={styles.emptyTitle}>Belum ada produk</Text>
            <Text style={styles.emptyText}>Tambahkan produk pertama Anda</Text>
          </View>
        ) : (
          filteredProducts.map((product) => (
            <Card key={product.id} style={styles.productCard}>
              <View style={styles.productRow}>
                <View style={styles.productImage}>
                  {product.imageUri ? (
                    <Image source={{ uri: product.imageUri }} style={styles.productImageContent} />
                  ) : (
                    <Text style={styles.productImageText}>img</Text>
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, !product.isActive && styles.productNameInactive]}>
                    {product.name}
                  </Text>
                  <View style={styles.productMeta}>
                    <Text style={[styles.stockText, product.stock <= 5 && styles.stockLow]}>
                      Stok: {product.stock}
                    </Text>
                    {getCategoryName(product.categoryId) && (
                      <View style={[styles.categoryBadge, getCategoryStyle(getCategoryName(product.categoryId)!)]}>
                        <Text style={styles.categoryBadgeText}>{getCategoryName(product.categoryId)}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.productPrice}>
                  <CurrencyText amount={product.sellPrice} size="sm" color={colors.primary} />
                  <View style={styles.productActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleToggleActive(product)}
                    >
                      <Ionicons 
                        name={product.isActive ? 'eye-outline' : 'eye-off-outline'} 
                        size={18} 
                        color={product.isActive ? colors.secondary : colors.onSurfaceVariant} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => router.push(`/produk/edit/${product.id}`)}
                    >
                      <Ionicons name="pencil" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleDelete(product)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

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
  productsContent: { padding: spacing.marginMobile, paddingBottom: 150 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { ...typography.headlineMobile, color: colors.onSurface, marginTop: spacing.stackMd },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.stackSm },
  productCard: { marginBottom: spacing.stackSm, padding: spacing.stackMd },
  productRow: { flexDirection: 'row', alignItems: 'center' },
  productImage: {
    width: 60, height: 60, borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.stackMd, overflow: 'hidden',
  },
  productImageContent: { width: '100%', height: '100%' },
  productImageText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  productInfo: { flex: 1 },
  productName: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface, marginBottom: 4 },
  productNameInactive: { color: colors.onSurfaceVariant, textDecorationLine: 'line-through' },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  stockText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  stockLow: { color: colors.error, fontWeight: '700' },
  categoryBadge: { paddingHorizontal: spacing.stackSm, paddingVertical: 2, borderRadius: borderRadius.sm },
  categoryBadgeText: { ...typography.labelSm, fontSize: 10 },
  categoryMakanan: { backgroundColor: '#fff3e0' },
  categoryMinuman: { backgroundColor: '#e3f2fd' },
  categorySembako: { backgroundColor: '#f3e5f5' },
  categoryRokok: { backgroundColor: '#ffebee' },
  categoryLainnya: { backgroundColor: colors.surfaceContainerHigh },
  productPrice: { alignItems: 'flex-end' },
  productActions: { flexDirection: 'row', gap: 4, marginTop: spacing.stackSm },
  actionButton: { padding: 4 },
  fab: {
    position: 'absolute', right: spacing.marginMobile,
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
});
