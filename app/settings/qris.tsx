import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Card } from '../../src/components/Card';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { CustomHeader } from '../../src/components/CustomHeader';
import { StoreRepository } from '../../src/database/store.repo';
import { useAppStore } from '../../src/stores/app.store';

export default function QrisSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const activeStore = useAppStore((state) => state.activeStore);
  const setActiveStore = useAppStore((state) => state.setActiveStore);
  const [qrisImageUri, setQrisImageUri] = useState<string | null>(activeStore?.qrisImageUri ?? null);
  const [qrisName, setQrisName] = useState(activeStore?.qrisName ?? activeStore?.name ?? '');
  const [qrisNote, setQrisNote] = useState(activeStore?.qrisNote ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const pickQrisImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin Dibutuhkan', 'Izinkan akses galeri untuk memilih gambar QRIS toko.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const imageUri = asset.base64
        ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;
      setQrisImageUri(imageUri);
    }
  };

  const saveQris = async () => {
    if (!activeStore) {
      Alert.alert('Toko Tidak Ditemukan', 'Silakan selesaikan pengaturan toko terlebih dahulu.');
      return;
    }

    if (!qrisImageUri) {
      Alert.alert('Gambar QRIS Belum Ada', 'Pilih gambar QRIS toko sebelum menyimpan.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedStore = await StoreRepository.update(activeStore.id, {
        qrisImageUri,
        qrisName: qrisName.trim() || activeStore.name,
        qrisNote: qrisNote.trim() || null,
      });

      if (!updatedStore) {
        throw new Error('Data toko tidak ditemukan.');
      }

      setActiveStore(updatedStore);
      Alert.alert('Berhasil', 'QRIS toko berhasil disimpan.', [
        {
          text: returnTo === 'pembayaran-qris' ? 'Lanjutkan Pembayaran' : 'OK',
          onPress: returnTo === 'pembayaran-qris' ? () => router.back() : undefined,
        },
      ]);
    } catch (error) {
      Alert.alert('Gagal Menyimpan', 'QRIS toko belum berhasil disimpan. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader title="QRIS Toko" onBack={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Gambar QRIS</Text>
          <Text style={styles.description}>
            Upload gambar QRIS yang akan dipindai pelanggan saat pembayaran.
          </Text>

          <TouchableOpacity style={styles.imagePicker} onPress={pickQrisImage} activeOpacity={0.8}>
            {qrisImageUri ? (
              <Image source={{ uri: qrisImageUri }} style={styles.qrisImage} resizeMode="contain" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="qr-code-outline" size={56} color={colors.onSurfaceVariant} />
                <Text style={styles.placeholderText}>Pilih Gambar QRIS</Text>
                <Text style={styles.placeholderHint}>Format gambar persegi disarankan</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.imageActions}>
            <TouchableOpacity style={styles.changeButton} onPress={pickQrisImage}>
              <Ionicons name="image-outline" size={18} color={colors.primary} />
              <Text style={styles.changeButtonText}>
                {qrisImageUri ? 'Ganti Gambar' : 'Pilih dari Galeri'}
              </Text>
            </TouchableOpacity>

          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Informasi QRIS</Text>
          <Input
            label="Nama QRIS"
            value={qrisName}
            onChangeText={setQrisName}
            placeholder={activeStore?.name || 'Nama warung'}
          />
          <Input
            label="Catatan (Opsional)"
            value={qrisNote}
            onChangeText={setQrisNote}
            placeholder="Contoh: Pastikan nama penerima sesuai"
            multiline
            numberOfLines={3}
          />
          <Button
            title="Simpan QRIS"
            onPress={saveQris}
            fullWidth
            size="lg"
            loading={isSaving}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile, paddingBottom: spacing.stackLg },
  card: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  sectionTitle: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackSm },
  description: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd },
  imagePicker: { width: '100%', aspectRatio: 1, maxHeight: 320, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.lg, overflow: 'hidden', backgroundColor: colors.surfaceContainerLow },
  qrisImage: { width: '100%', height: '100%', backgroundColor: colors.surface },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.stackLg },
  placeholderText: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700', marginTop: spacing.stackMd },
  placeholderHint: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: spacing.stackSm, textAlign: 'center' },
  imageActions: { flexDirection: 'row', gap: spacing.stackSm, marginTop: spacing.stackMd },
  changeButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm, borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.md },
  changeButtonText: { ...typography.bodyMd, color: colors.primary, fontWeight: '700' },
});
