import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { CategoryRepository } from '../../src/database/category.repo';
import { Category } from '../../src/types/category';

export default function KategoriScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await CategoryRepository.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = (category: Category) => {
    Alert.alert(
      'Hapus Kategori',
      `Yakin ingin menghapus "${category.name}"? Produk dengan kategori ini akan menjadi tanpa kategori.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await CategoryRepository.delete(category.id);
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus kategori');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kategori Produk</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={styles.sectionTitle}>DAFTAR KATEGORI</Text>

        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetags-outline" size={64} color={colors.surfaceContainerHigh} />
            <Text style={styles.emptyTitle}>Belum ada kategori</Text>
            <Text style={styles.emptyText}>Tambahkan kategori untuk mengelompokkan produk</Text>
          </View>
        ) : (
          categories.map((category) => (
            <Card key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryOrder}>Urutan: {category.sortOrder}</Text>
                </View>
                <View style={styles.categoryActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push(`/kategori/edit/${category.id}`)}
                  >
                    <Ionicons name="pencil" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(category)}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: 16 + insets.bottom }]}
        onPress={() => router.push('/kategori/tambah')}
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
    paddingHorizontal: spacing.marginMobile, paddingVertical: spacing.stackMd,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  headerTitle: { ...typography.headlineMobile, color: colors.primary, fontWeight: '700' },
  content: { flex: 1 },
  contentContainer: { padding: spacing.marginMobile, paddingBottom: 100 },
  sectionTitle: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd },
  categoryCard: { padding: spacing.stackMd, marginBottom: spacing.stackSm },
  categoryRow: { flexDirection: 'row', alignItems: 'center' },
  categoryInfo: { flex: 1 },
  categoryName: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface },
  categoryOrder: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  categoryActions: { flexDirection: 'row', gap: spacing.stackSm },
  actionButton: { padding: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { ...typography.headlineMobile, color: colors.onSurface, marginTop: spacing.stackMd },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.stackSm },
  fab: {
    position: 'absolute', right: spacing.marginMobile,
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
});
