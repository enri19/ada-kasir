import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Card } from '../../src/components/Card';
import { CurrencyText } from '../../src/components/CurrencyText';
import { ProductRepository } from '../../src/database/product.repo';
import { Product } from '../../src/types/product';

export default function StokMenipisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const items = await ProductRepository.getLowStockProducts();
      setProducts(items);
    } catch (error) {
      console.error('Error loading low stock products:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stok Menipis</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color={colors.surfaceContainerHigh} />
            <Text style={styles.emptyTitle}>Semua produk cukup stok</Text>
            <Text style={styles.emptyText}>Tidak ada item yang mencapai batas minimum saat ini.</Text>
          </View>
        ) : (
          products.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => router.push(`/produk/detail/${product.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.productImage}>
                {product.imageUri ? (
                  <Image source={{ uri: product.imageUri }} style={styles.productImageContent} />
                ) : (
                  <Text style={styles.productImageText}>img</Text>
                )}
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailLabel}>Stok</Text>
                  <Text style={[styles.detailValue, product.stock <= 0 && styles.stockLow]}>{product.stock}</Text>
                </View>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailLabel}>Min. Stok</Text>
                  <Text style={styles.detailValue}>{product.minStock}</Text>
                </View>
                <CurrencyText amount={product.sellPrice} size="sm" color={colors.primary} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.marginMobile, paddingVertical: spacing.stackSm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  backButton: { padding: 8 },
  headerTitle: { ...typography.headlineMobile, color: colors.primary },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { ...typography.headlineMobile, color: colors.onSurface, marginTop: spacing.stackMd },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.stackSm, textAlign: 'center' },
  productCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.stackMd, marginBottom: spacing.stackMd, borderWidth: 1, borderColor: colors.outlineVariant },
  productImage: { width: 72, height: 72, borderRadius: borderRadius.md, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center', marginRight: spacing.stackMd, overflow: 'hidden' },
  productImageContent: { width: '100%', height: '100%' },
  productImageText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  productInfo: { flex: 1 },
  productName: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface, marginBottom: spacing.stackSm },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  detailValue: { ...typography.bodyMd, color: colors.onSurface },
  stockLow: { color: colors.error, fontWeight: '700' },
});
