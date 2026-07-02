import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../../src/stores/app.store';
import { useLicenseStore } from '../../../src/stores/license.store';
import { LicenseService } from '../../../src/services/license.service';
import { StoreRepository } from '../../../src/database/store.repo';
import { colors, spacing, typography, borderRadius } from '../../../src/config/theme';
import { Card } from '../../../src/components/Card';
import { CustomHeader } from '../../../src/components/CustomHeader';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { ADMIN_WHATSAPP } from '../../../src/utils/constants';
import { AppImages } from '../../../src/constants/assets';

const STATUS_LABELS: Record<string, string> = {
  trial_active: 'Trial Aktif',
  trial_expired: 'Trial Berakhir',
  lifetime: 'Lifetime',
  premium_active: 'Premium Aktif',
  premium_expired: 'Premium Berakhir',
};

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('id-ID') : '-';
}

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeStore = useAppStore((state) => state.activeStore);
  const setActiveStore = useAppStore((state) => state.setActiveStore);
  const deviceCode = useLicenseStore((state) => state.deviceCode);
  const licenseStatus = useLicenseStore((state) => state.status);
  const trialEndsAt = useLicenseStore((state) => state.trialEndsAt);
  const expiresAt = useLicenseStore((state) => state.expiresAt);
  const activateLicense = useLicenseStore((state) => state.activateLicense);
  const refreshLicenseStatus = useLicenseStore((state) => state.refreshStatus);

  const [storeName, setStoreName] = useState(activeStore?.name || '');
  const [ownerName, setOwnerName] = useState(activeStore?.ownerName || '');
  const [phone, setPhone] = useState(activeStore?.phone || '');
  const [address, setAddress] = useState(activeStore?.address || '');
  const [logoUri, setLogoUri] = useState<string | null>(activeStore?.logoUri ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [licenseCode, setLicenseCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  /** Apakah user sedang dalam status Premium aktif */
  const isPremium = licenseStatus === 'premium_active';
  /** Toggle untuk menampilkan form ganti lisensi (hanya saat Premium) */
  const [showLicenseForm, setShowLicenseForm] = useState(false);

  useEffect(() => {
    if (activeStore) {
      setStoreName(activeStore.name);
      setOwnerName(activeStore.ownerName);
      setPhone(activeStore.phone);
      setAddress(activeStore.address);
      setLogoUri(activeStore.logoUri ?? null);
    }
  }, [activeStore]);

  useEffect(() => {
    refreshLicenseStatus();
  }, [refreshLicenseStatus]);

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses ke galeri foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!activeStore) {
      Alert.alert('Toko tidak ditemukan', 'Silakan kembali dan coba lagi.');
      return;
    }

    if (!storeName.trim()) {
      Alert.alert('Nama toko wajib diisi', 'Isi nama toko sebelum menyimpan.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedStore = await StoreRepository.update(activeStore.id, {
        name: storeName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        logoUri,
      });

      if (updatedStore) {
        setActiveStore(updatedStore);
        Alert.alert('Berhasil', 'Data toko berhasil diperbarui.');
      } else {
        Alert.alert('Gagal', 'Tidak dapat menyimpan data toko.');
      }
    } catch (error) {
      Alert.alert('Terjadi Kesalahan', (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseCode.trim()) {
      Alert.alert('Kode kosong', 'Masukkan kode lisensi terlebih dahulu.');
      return;
    }

    setIsActivating(true);
    try {
      const result = await activateLicense(licenseCode);
      if (result === 'device_mismatch') {
        Alert.alert('Kode tidak cocok', 'Kode lisensi tidak cocok dengan perangkat ini.');
        return;
      }
      if (result === 'expired') {
        Alert.alert('Kode kedaluwarsa', 'Kode lisensi Premium sudah melewati tanggal berlaku.');
        return;
      }
      if (result !== 'ok') {
        Alert.alert('Kode tidak valid', 'Format kode lisensi tidak dikenali.');
        return;
      }

      setLicenseCode('');
      // Refresh status lisensi agar UI langsung berubah
      await refreshLicenseStatus();
      setShowLicenseForm(false);
      Alert.alert('Berhasil', 'Lisensi berhasil diaktifkan.');
    } finally {
      setIsActivating(false);
    }
  };

  // Paket user saat ini untuk dikirim ke admin
  const userPlan = licenseStatus === 'premium_active' ? 'Premium' : 'Lifetime';

  const handleContactAdmin = async () => {
    const message = LicenseService.buildActivationMessage(
      activeStore?.name ?? '',
      deviceCode ?? '',
      activeStore?.ownerName,
      activeStore?.phone,
    );
    const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Gagal membuka WhatsApp', 'Pastikan WhatsApp tersedia di perangkat Anda.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <CustomHeader title="Akun & Lisensi" onBack={() => router.back()} />
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Informasi Warung</Text>

          <View style={styles.logoUpload}>
            <Text style={styles.label}>Logo Warung</Text>
            <TouchableOpacity style={styles.logoBox} onPress={pickLogo}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoPreview} />
              ) : (
                <Ionicons name="camera-outline" size={32} color={colors.onSurfaceVariant} />
              )}
            </TouchableOpacity>
          </View>

          <Input
            label="Nama Warung"
            value={storeName}
            onChangeText={setStoreName}
            placeholder="Contoh: Warung Berkah"
          />
          <Input
            label="Nama Pemilik"
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="Nama lengkap Anda"
          />
          <Input
            label="Nomor WhatsApp"
            value={phone}
            onChangeText={setPhone}
            placeholder="08xxxxxxxxxx"
            keyboardType="phone-pad"
          />
          <Input
            label="Alamat Lengkap"
            value={address}
            onChangeText={setAddress}
            placeholder="Masukkan alamat warung Anda"
            multiline
            numberOfLines={3}
          />

          <Button
            title="Simpan Perubahan"
            onPress={handleSave}
            fullWidth
            loading={isSaving}
          />
        </Card>

        <Card style={styles.licenseCard}>
          {/* Logo + identitas app */}
          <View style={styles.licenseHeader}>
            <Image source={AppImages.logo} style={styles.licenceLogo} resizeMode="contain" />
            <View style={styles.licenseHeaderText}>
              <Text style={styles.licenseAppName}>AdaKasir</Text>
              <Text style={styles.licenseStatusBadge}>{STATUS_LABELS[licenseStatus] ?? licenseStatus}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Lisensi</Text>

          <Text style={styles.infoLabel}>Nama Warung</Text>
          <Text style={styles.infoValue}>{activeStore?.name || '-'}</Text>

          <Text style={styles.infoLabel}>Kode Perangkat</Text>
          <Text selectable style={styles.infoValue}>{deviceCode || '-'}</Text>

          <Text style={styles.infoLabel}>Status Lisensi</Text>
          <Text style={styles.infoValue}>{STATUS_LABELS[licenseStatus]}</Text>

          <Text style={styles.infoLabel}>Tanggal Trial Berakhir</Text>
          <Text style={styles.infoValue}>{formatDate(trialEndsAt)}</Text>

          <Text style={styles.infoLabel}>Tanggal Premium Berakhir</Text>
          <Text style={styles.infoValue}>{formatDate(expiresAt)}</Text>

          {/* ── Jika Premium aktif → card status + tombol ganti lisensi ── */}
          {isPremium ? (
            <View style={styles.premiumActiveCard}>
              <View style={styles.premiumActiveHeader}>
                <Ionicons name="checkmark-circle" size={22} color={colors.secondary} />
                <Text style={styles.premiumActiveTitle}>Premium Aktif</Text>
              </View>
              <Text style={styles.premiumActiveDesc}>
                Semua fitur Premium tersedia untuk akun ini.
              </Text>

              {!showLicenseForm ? (
                <Button
                  title="Ganti / Perbarui Lisensi"
                  onPress={() => setShowLicenseForm(true)}
                  variant="outline"
                  fullWidth
                  size="sm"
                />
              ) : (
                <View>
                  <Input
                    label="Kode Lisensi Baru"
                    value={licenseCode}
                    onChangeText={(value) => setLicenseCode(value.toUpperCase())}
                    placeholder="ADK-LIFE-XXXX-YYYY"
                    editable={!isActivating}
                  />
                  <View style={styles.licenseButtonRow}>
                    <View style={styles.licenseBtnWrapper}>
                      <Button
                        title="Simpan"
                        onPress={handleActivateLicense}
                        fullWidth
                        size="sm"
                        loading={isActivating}
                      />
                    </View>
                    <View style={styles.licenseBtnWrapper}>
                      <Button
                        title="Batal"
                        onPress={() => { setShowLicenseForm(false); setLicenseCode(''); }}
                        variant="outline"
                        fullWidth
                        size="sm"
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          ) : (
            /* ── Jika belum Premium → tampilkan form aktivasi ── */
            <View>
              <Text style={styles.premiumCtaText}>
                Aktifkan Premium.{'\n'}
                Masukkan kode lisensi untuk membuka fitur Premium seperti Cadangan Data Cloud.
              </Text>

              <Input
                label="Kode Lisensi"
                value={licenseCode}
                onChangeText={(value) => setLicenseCode(value.toUpperCase())}
                placeholder="ADK-LIFE-XXXX-YYYY"
                editable={!isActivating}
              />

              <Button
                title="Aktifkan Lisensi"
                onPress={handleActivateLicense}
                fullWidth
                loading={isActivating}
              />
            </View>
          )}

          <View style={styles.contactButtonWrapper}>
            <Button
              title="Hubungi Admin via WhatsApp"
              onPress={handleContactAdmin}
              variant="outline"
              fullWidth
              icon={<Ionicons name="logo-whatsapp" size={20} color={colors.primary} />}
            />
          </View>
        </Card>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  licenseHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd, marginBottom: spacing.stackMd },
  licenceLogo: { width: 56, height: 56 },
  licenseHeaderText: { flex: 1 },
  licenseAppName: { ...typography.headlineMobile, color: colors.primary, fontWeight: '700' },
  licenseStatusBadge: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile, paddingBottom: 32 },
  formCard: { padding: spacing.stackMd, margin: spacing.marginMobile, marginTop: spacing.stackMd },
  licenseCard: { padding: spacing.stackMd, marginHorizontal: spacing.marginMobile, marginBottom: spacing.stackLg },
  sectionTitle: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackMd },
  infoLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: spacing.stackMd },
  infoValue: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '600', marginTop: 4 },
  contactButtonWrapper: { marginTop: spacing.stackMd },
  logoUpload: { alignItems: 'center', marginBottom: spacing.stackLg },
  label: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm, alignSelf: 'flex-start' },
  logoBox: {
    width: 104,
    height: 104,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
    overflow: 'hidden',
  },
  logoPreview: {
    width: '100%',
    height: '100%',
  },
  // ── Premium active section ──
  premiumActiveCard: {
    marginTop: spacing.stackMd,
    padding: spacing.stackMd,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.secondary + '40',
  },
  premiumActiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    marginBottom: spacing.stackSm,
  },
  premiumActiveTitle: { ...typography.bodyLg, color: colors.secondary, fontWeight: '700' },
  premiumActiveDesc: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd },
  premiumCtaText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd, lineHeight: 20 },
  licenseButtonRow: { flexDirection: 'row', gap: spacing.stackSm, marginTop: spacing.stackSm },
  licenseBtnWrapper: { flex: 1 },
});
