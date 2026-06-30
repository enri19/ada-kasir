import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../../src/config/theme';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { CategoryRepository } from '../../../src/database/category.repo';
import { Category } from '../../../src/types/category';

export default function EditKategoriScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      CategoryRepository.getById(id).then((cat) => {
        if (cat) {
          setCategory(cat);
          setName(cat.name);
          setSortOrder(String(cat.sortOrder));
        }
      }).catch(console.error);
    }
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Nama kategori harus diisi');
      return;
    }

    setSaving(true);
    try {
      await CategoryRepository.update(id!, {
        name: name.trim(),
        sortOrder: parseInt(sortOrder, 10) || 0,
      });
      Alert.alert('Berhasil', 'Kategori berhasil diperbarui', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Gagal menyimpan kategori');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Hapus Kategori',
      `Yakin ingin menghapus "${category?.name}"? Produk dengan kategori ini akan menjadi tanpa kategori.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await CategoryRepository.delete(id!);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus kategori');
            }
          },
        },
      ]
    );
  };

  if (!category) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingText}>Memuat kategori...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Kategori</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={0}>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.label}>Nama Kategori *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Sembako, Minuman, Rokok"
            placeholderTextColor={colors.onSurfaceVariant}
          />

          <Text style={styles.label}>Urutan Tampil</Text>
          <TextInput
            style={styles.input}
            value={sortOrder}
            onChangeText={(text) => setSortOrder(text.replace(/[^0-9]/g, ''))}
            placeholder="0"
            placeholderTextColor={colors.onSurfaceVariant}
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>Angka lebih kecil akan tampil lebih dulu</Text>
        </Card>

        <Button
          title="Simpan Perubahan"
          onPress={handleSave}
          size="lg"
          fullWidth
          loading={saving}
          icon={<Ionicons name="save-outline" size={20} color={colors.onPrimary} />}
        />

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
          <Text style={styles.deleteButtonText}>Hapus Kategori</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  loadingText: { ...typography.bodyLg, color: colors.onSurfaceVariant },
  card: { padding: spacing.stackMd, marginBottom: spacing.stackLg },
  label: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm, marginTop: spacing.stackMd },
  input: {
    ...typography.bodyLg, color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackSm,
    minHeight: 48,
  },
  hint: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 4, fontStyle: 'italic' },
  deleteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.error,
    borderRadius: borderRadius.md, paddingVertical: 14, marginTop: spacing.stackLg,
  },
  deleteButtonText: { ...typography.bodyLg, color: colors.error, fontWeight: '600' },
});
