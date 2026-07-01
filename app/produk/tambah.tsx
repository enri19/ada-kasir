import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Image, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { ProductRepository } from '../../src/database/product.repo';
import { CategoryRepository } from '../../src/database/category.repo';
import { ProductFormData, PRODUCT_UNITS, ProductUnit, ProductImageKey } from '../../src/types/product';
import { Category } from '../../src/types/category';
import { formatRupiah, parseRupiah } from '../../src/utils/currency';
import { getProductImage } from '../../src/utils/product-images';
import { compressImage } from '../../src/utils/compress-image';

export default function TambahProdukScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<ProductImageKey>('default');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [unit, setUnit] = useState<ProductUnit>('pcs');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [minStock, setMinStock] = useState('0');
  const [trackStock, setTrackStock] = useState(true);
  const [allowNegativeStock, setAllowNegativeStock] = useState(true);

  useEffect(() => {
    CategoryRepository.getAll().then(setCategories).catch(console.error);
  }, []);

  const getCategoryImageKey = (categoryName?: string): ProductImageKey => {
    const normalized = categoryName?.toLowerCase() ?? '';
    if (normalized.includes('mie')) return 'mie';
    if (normalized.includes('minum')) return 'minuman';
    if (normalized.includes('rokok')) return 'rokok';
    if (normalized.includes('sembako')) return 'sembako';
    if (normalized.includes('snack')) return 'snack';
    if (normalized.includes('kopi')) return 'kopi';
    if (normalized.includes('sabun')) return 'sabun';
    if (normalized.includes('obat')) return 'obat';
    if (normalized.includes('pulsa') || normalized.includes('token')) return 'pulsa';
    return 'default';
  };

  const selectedCategory = categories.find(c => c.id === categoryId);

  useEffect(() => {
    setImageKey(getCategoryImageKey(selectedCategory?.name));
  }, [selectedCategory?.id, selectedCategory?.name]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses ke galeri foto');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const compressed = await compressImage(result.assets[0].uri);
      setImageUri(compressed);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Nama produk harus diisi');
      return;
    }
    if (!sellPrice.trim() || parseRupiah(sellPrice) <= 0) {
      Alert.alert('Error', 'Harga jual harus diisi');
      return;
    }

    setSaving(true);
    try {
      const data: ProductFormData = {
        name: name.trim(),
        categoryId,
        sku: sku.trim() || '',
        barcode: barcode.trim() || '',
        costPrice: parseRupiah(costPrice),
        sellPrice: parseRupiah(sellPrice),
        stock: parseInt(stock, 10) || 0,
        minStock: parseInt(minStock, 10) || 0,
        trackStock,
        allowNegativeStock,
        unit,
        imageUri,
        imageKey,
        isActive: true,
      };
      await ProductRepository.create(data);
      Alert.alert('Berhasil', 'Produk berhasil ditambahkan', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Save product error:', error);
      Alert.alert('Error', `Gagal menyimpan produk: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={0}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      {/* Image Section */}
      <View style={styles.imageSection}>
        <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
          ) : (
            <Image
              source={getProductImage(imageKey)}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.imageEditButton} onPress={pickImage}>
          <Ionicons name="pencil" size={16} color={colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.imageHint}>Ketuk untuk menambah foto produk</Text>
      </View>

      {/* Product Info Card */}
      <Card style={styles.card}>
        <Text style={styles.label}>Nama Produk</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Indomie Goreng"
            placeholderTextColor={colors.onSurfaceVariant}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Kategori</Text>
            <TouchableOpacity 
              style={styles.selectInput}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={[styles.selectText, !selectedCategory && styles.selectPlaceholder]}>
                {selectedCategory?.name || 'Pilih Kategori'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Satuan</Text>
            <TouchableOpacity 
              style={styles.selectInput}
              onPress={() => setShowUnitPicker(true)}
            >
              <Text style={styles.selectText}>{unit}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.label}>SKU / Barcode</Text>
        <View style={styles.skuRow}>
          <View style={styles.skuInputContainer}>
            <TextInput
              style={styles.textInput}
              value={sku}
              onChangeText={setSku}
              placeholder="899123456789"
              placeholderTextColor={colors.onSurfaceVariant}
            />
          </View>
          <TouchableOpacity style={styles.barcodeButton}>
            <Ionicons name="barcode-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Price Card */}
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Harga Modal</Text>
            <View style={styles.priceInput}>
              <Text style={styles.pricePrefix}>Rp</Text>
              <TextInput
                style={styles.priceTextInput}
                value={costPrice}
                onChangeText={(text: string) => {
                  const num = text.replace(/[^0-9]/g, '');
                  setCostPrice(num ? formatRupiah(parseInt(num, 10)).replace('Rp', '') : '');
                }}
                placeholder="0"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Harga Jual</Text>
            <View style={styles.priceInput}>
              <Text style={styles.pricePrefix}>Rp</Text>
              <TextInput
                style={[styles.priceTextInput, styles.priceTextSell]}
                value={sellPrice}
                onChangeText={(text: string) => {
                  const num = text.replace(/[^0-9]/g, '');
                  setSellPrice(num ? formatRupiah(parseInt(num, 10)).replace('Rp', '') : '');
                }}
                placeholder="0"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        <Text style={styles.label}>Stok Awal</Text>
        <View style={[styles.stockControl, styles.stockControlSpacing]}>
          <TouchableOpacity 
            style={styles.stockButton}
            onPress={() => setStock(String(Math.max(0, parseInt(stock, 10) - 1)))}
          >
            <Ionicons name="remove" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.stockInput}
            value={stock}
            onChangeText={(text: string) => setStock(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
          <TouchableOpacity 
            style={styles.stockButton}
            onPress={() => setStock(String(parseInt(stock, 10) + 1))}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Stok Minimum</Text>
        <View style={[styles.stockControl, styles.stockControlSpacing]}>
          <TouchableOpacity 
            style={styles.stockButton}
            onPress={() => setMinStock(String(Math.max(0, parseInt(minStock, 10) - 1)))}
          >
            <Ionicons name="remove" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.stockInput}
            value={minStock}
            onChangeText={(text: string) => setMinStock(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
          <TouchableOpacity 
            style={styles.stockButton}
            onPress={() => setMinStock(String(parseInt(minStock, 10) + 1))}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.switchRow}>
          <TouchableOpacity style={styles.switchOption} onPress={() => setTrackStock(!trackStock)}>
            <Text style={styles.switchLabel}>Pantau Stok</Text>
            <Text style={styles.switchValue}>{trackStock ? 'Ya' : 'Tidak'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.switchOption} onPress={() => setAllowNegativeStock(!allowNegativeStock)}>
            <Text style={styles.switchLabel}>Izinkan Stok Minus</Text>
            <Text style={styles.switchValue}>{allowNegativeStock ? 'Ya' : 'Tidak'}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Save Button */}
      <Button 
        title="Simpan Produk" 
        onPress={handleSave} 
        size="lg" 
        fullWidth 
        loading={saving}
        icon={<Ionicons name="save-outline" size={20} color={colors.onPrimary} />}
      />

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Kategori</Text>
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => { setCategoryId(null); setShowCategoryPicker(false); }}
              >
                <Text style={[styles.modalOptionText, !categoryId && styles.modalOptionSelected]}>
                  Tanpa Kategori
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.modalOption}
                  onPress={() => { setCategoryId(cat.id); setShowCategoryPicker(false); }}
                >
                  <Text style={[styles.modalOptionText, categoryId === cat.id && styles.modalOptionSelected]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryPicker(false)}
            >
              <Text style={styles.modalCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Unit Picker Modal */}
      <Modal visible={showUnitPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Satuan</Text>
            <ScrollView style={styles.modalScroll}>
              {PRODUCT_UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={styles.modalOption}
                  onPress={() => { setUnit(u as ProductUnit); setShowUnitPicker(false); }}
                >
                  <Text style={[styles.modalOptionText, unit === u && styles.modalOptionSelected]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowUnitPicker(false)}
            >
              <Text style={styles.modalCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  content: { padding: spacing.marginMobile },
  
  imageSection: { alignItems: 'center', marginBottom: spacing.stackLg },
  imageBox: {
    width: 180, height: 180, borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainerLow, overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageEditButton: {
    position: 'absolute', bottom: 20, right: '50%', marginRight: -90,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  imageHint: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: spacing.stackSm, textAlign: 'center' },
  
  card: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  
  label: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  inputContainer: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.md, marginBottom: spacing.stackMd,
  },
  textInput: { ...typography.bodyLg, color: colors.onSurface, minHeight: 48, paddingHorizontal: 12 },
  
  row: { flexDirection: 'row', gap: spacing.stackMd, marginBottom: spacing.stackMd },
  rowItem: { flex: 1 },
  selectInput: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.md, minHeight: 48, paddingHorizontal: 12,
  },
  selectText: { ...typography.bodyLg, color: colors.onSurface },
  selectPlaceholder: { color: colors.onSurfaceVariant },
  
  skuRow: { flexDirection: 'row', gap: spacing.stackSm },
  skuInputContainer: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.md,
  },
  barcodeButton: {
    width: 48, height: 48, borderRadius: borderRadius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  
  priceInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.md, paddingHorizontal: 12,
  },
  pricePrefix: { ...typography.bodyLg, color: colors.onSurfaceVariant, marginRight: 4 },
  priceTextInput: { flex: 1, ...typography.bodyLg, color: colors.onSurface, minHeight: 48 },
  priceTextSell: { fontWeight: '600', color: colors.primary },
  
  stockControl: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  stockControlSpacing: { marginBottom: spacing.stackMd },
  stockButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  stockInput: { flex: 1, textAlign: 'center', ...typography.bodyLg, color: colors.onSurface, minHeight: 48 },
  switchRow: { flexDirection: 'row', gap: spacing.stackMd, marginTop: spacing.stackSm },
  switchOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.stackSm,
  },
  switchLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 4 },
  switchValue: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.stackMd, width: '85%', maxHeight: '70%',
  },
  modalScroll: { maxHeight: 300 },
  modalTitle: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface, marginBottom: spacing.stackMd },
  modalOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  modalOptionText: { ...typography.bodyLg, color: colors.onSurface },
  modalOptionSelected: { color: colors.primary, fontWeight: '600' },
  modalCloseButton: { marginTop: spacing.stackMd, alignItems: 'center' },
  modalCloseText: { ...typography.bodyLg, color: colors.primary, fontWeight: '600' },
});
