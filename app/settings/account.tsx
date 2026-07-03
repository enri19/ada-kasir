import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePickImage } from '../../src/components/PickImageModal';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/stores/app.store';
import { useLicenseStore } from '../../src/stores/license.store';
import { LicenseService } from '../../src/services/license.service';
import { PremiumAccountService } from '../../src/services/premium-account.service';
import { StoreRepository } from '../../src/database/store.repo';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Card } from '../../src/components/Card';
import { CustomHeader } from '../../src/components/CustomHeader';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { AppModal } from '../../src/components/ui/AppModal';
import { AppButton } from '../../src/components/ui/AppButton';
import { ADMIN_WHATSAPP } from '../../src/utils/constants';
import { AppImages } from '../../src/constants/assets';
import { usePremiumLogin } from '../../src/hooks/usePremiumLogin';
import { getUserId } from '../../src/services/supabase.client';
import { BackupService } from '../../src/services/backup.service';

// ─── Constants ──────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  trial_active: 'Trial Aktif',
  trial_expired: 'Trial Berakhir',
  lifetime: 'Lifetime',
  premium_active: 'Premium Aktif',
  premium_expired: 'Premium Berakhir',
};

const SOURCE_LABELS: Record<string, string> = {
  trial: 'Trial',
  local_device: 'Kode Perangkat',
  manual_fallback: 'Kode Premium',
  account: 'Akun Premium',
};

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('id-ID') : '-';
}

// ─── Component ──────────────────────────────────────────────────────────
export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pickImage: openImagePicker, modal, handleReadOnly } = usePickImage();
  const activeStore = useAppStore((state) => state.activeStore);
  const setActiveStore = useAppStore((state) => state.setActiveStore);
  const deviceCode = useLicenseStore((state) => state.deviceCode);
  const licenseStatus = useLicenseStore((state) => state.status);
  const trialEndsAt = useLicenseStore((state) => state.trialEndsAt);
  const expiresAt = useLicenseStore((state) => state.expiresAt);
  const activateLicense = useLicenseStore((state) => state.activateLicense);
  const refreshLicenseStatus = useLicenseStore((state) => state.refreshStatus);
  const isReadOnly = useLicenseStore((s) => s.isReadOnlyMode());
  const source = useLicenseStore((s) => s.source);
  const premiumAccountId = useLicenseStore((s) => s.premiumAccountId);
  const setPremiumAccount = useLicenseStore((s) => s.setPremiumAccount);
  const clearPremiumAccount = useLicenseStore((s) => s.clearPremiumAccount);

  const isPremium = licenseStatus === 'premium_active';
  const isPremiumAccount = source === 'account';
  const canUsePremiumFeatures = useLicenseStore((s) => s.canUsePremiumFeatures);

  // ── Premium login / restore ──
  const {
    login,
    loginLoading,
    restoreState,
    restoreMessage,
    backupInfo,
    restoreLoading,
    executeRestore,
    skipRestore,
    resetRestore,
  } = usePremiumLogin();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLoginErrorModal, setShowLoginErrorModal] = useState(false);
  const [loginErrorTitle, setLoginErrorTitle] = useState('Login Premium');
  const [loginErrorMessage, setLoginErrorMessage] = useState('');
  const [loginInput, setLoginInput] = useState('');

  // ── Store form state ──
  const [storeName, setStoreName] = useState(activeStore?.name || '');
  const [ownerName, setOwnerName] = useState(activeStore?.ownerName || '');
  const [phone, setPhone] = useState(activeStore?.phone || '');
  const [address, setAddress] = useState(activeStore?.address || '');
  const [logoUri, setLogoUri] = useState<string | null>(activeStore?.logoUri ?? null);
  const [isSaving, setIsSaving] = useState(false);

  // ── License state ──
  const [licenseCode, setLicenseCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [copiedDevice, setCopiedDevice] = useState(false);
  const [showPaketPicker, setShowPaketPicker] = useState(false);

  // ── Init ──
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

  // ── Pick logo ──
  const pickLogo = useCallback(async () => {
    if (isReadOnly) {
      handleReadOnly('Anda tidak dapat mengubah foto warung saat lisensi sudah berakhir.');
      return;
    }
    const uri = await openImagePicker({ aspect: [1, 1], quality: 0.7 }, 'Ganti Foto Warung');
    if (uri) setLogoUri(uri);
  }, [isReadOnly, handleReadOnly, openImagePicker]);

  // ── Salin Kode Perangkat ──
  const handleCopyDeviceCode = () => {
    if (!deviceCode) {
      Alert.alert('Kode Perangkat', 'Kode perangkat belum tersedia.');
      return;
    }
    Alert.alert('Kode Perangkat', deviceCode, [
      { text: 'Tutup', style: 'cancel' },
    ]);
    setCopiedDevice(true);
    setTimeout(() => setCopiedDevice(false), 2000);
  };

  // ── Hubungi Admin ──
  const handleContactAdmin = () => {
    setShowPaketPicker(true);
  };

  const sendWaMessage = async (plan: string) => {
    const message = plan === 'Lifetime'
      ? LicenseService.buildActivationMessage(
          activeStore?.name ?? '',
          deviceCode ?? '',
          activeStore?.ownerName,
          activeStore?.phone,
        )
      : LicenseService.buildPremiumMessage(
          activeStore?.name ?? '',
          deviceCode ?? '',
          'Premium',
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

  // ── Login Premium ──
  const handleLoginPremium = async () => {
    if (!loginInput.trim()) {
      Alert.alert('Input kosong', 'Masukkan nomor WhatsApp atau email Anda.');
      return;
    }

    const result = await login({ phoneOrEmail: loginInput.trim() });

    if (!result.success) {
      setShowLoginModal(false);
      setLoginInput('');
      setLoginErrorTitle('Login Premium Gagal');
      setLoginErrorMessage(result.message || 'Email atau nomor HP tidak ditemukan sebagai pelanggan Premium.');
      setShowLoginErrorModal(true);
      return;
    }
    // Jika sukses — restore flow sudah dijalankan otomatis di hook
    setShowLoginModal(false);
    setLoginInput('');
  };

  // ── Handle restore dari backup ──
  const handleRestoreFromBackup = async () => {
    if (!canUsePremiumFeatures()) {
      Alert.alert('Fitur Premium', 'Restore backup hanya tersedia untuk akun Premium aktif.');
      return;
    }
    await executeRestore();
  };

  // ── Backup manual ──
  const handleBackupNow = async () => {
    if (!canUsePremiumFeatures()) {
      Alert.alert('Fitur Premium', 'Backup cloud hanya tersedia untuk akun Premium aktif.');
      return;
    }
    try {
      await BackupService.backupToCloud();
      Alert.alert('Berhasil', 'Data berhasil dicadangkan ke cloud.');
    } catch (error: any) {
      Alert.alert('Gagal', error?.message || 'Backup gagal.');
    }
  };

  // ── Logout Premium ──
  const handleLogoutPremium = async () => {
    Alert.alert(
      'Logout Premium',
      'Anda akan logout dari akun Premium. Fitur Premium akan dinonaktifkan. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await PremiumAccountService.clearAccount();
            await clearPremiumAccount();
            await refreshLicenseStatus();
          },
        },
      ]
    );
  };

  // ── Simpan Data Toko ──
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

  // ── Aktivasi Lisensi ──
  const handleActivateLicense = async () => {
    if (!licenseCode.trim()) {
      Alert.alert('Kode kosong', 'Masukkan kode lisensi terlebih dahulu.');
      return;
    }
    setIsActivating(true);
    try {
      const result = await activateLicense(licenseCode.trim().toUpperCase());
      if (result === 'no_internet') {
        Alert.alert('Tidak ada koneksi', 'Aktivasi lisensi membutuhkan koneksi internet. Periksa jaringan Anda dan coba lagi.');
        return;
      }
      if (result === 'device_mismatch') {
        Alert.alert('Kode tidak cocok', 'Kode lisensi tidak cocok dengan perangkat ini.');
        return;
      }
      if (result === 'expired') {
        Alert.alert('Kode kedaluwarsa', 'Kode lisensi Premium sudah melewati tanggal berlaku.');
        return;
      }
      if (result !== 'ok') {
        Alert.alert('Kode tidak valid', 'Format kode lisensi tidak dikenali. Pastikan Anda memasukkan kode lengkap dengan signature.');
        return;
      }
      setLicenseCode('');
      await refreshLicenseStatus();
      setShowLicenseForm(false);
      Alert.alert('Berhasil', 'Lisensi berhasil diaktifkan.');
    } finally {
      setIsActivating(false);
    }
  };

  // ── Render ──
  const renderStatusDescription = () => {
    if (isPremium && isPremiumAccount) {
      return (
        <Text style={styles.statusDesc}>
          Premium dapat digunakan dengan akun. Saat pindah perangkat, cukup login dan pulihkan data dari backup.
        </Text>
      );
    }
    if (isPremium && source === 'manual_fallback') {
      return (
        <Text style={styles.statusDesc}>
          Premium manual fallback. Untuk sementara sebelum Premium account login tersedia.
        </Text>
      );
    }
    if (licenseStatus === 'lifetime') {
      return (
        <Text style={styles.statusDesc}>
          Lifetime Basic aktif untuk perangkat ini.
        </Text>
      );
    }
    return null;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader title="Akun & Lisensi" onBack={() => router.back()} />
      <ScrollView style={styles.content} contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}>
        {/* ════════════════════════════════════════════════════════════
            SECTION 1: Status Paket
            ════════════════════════════════════════════════════════════ */}
        <Card style={styles.sectionCard}>
          <View style={styles.statusHeader}>
            <Image source={AppImages.logo} style={styles.statusLogo} resizeMode="contain" />
            <View style={styles.statusHeaderText}>
              <Text style={styles.appName}>AdaKasir</Text>
              <View style={styles.statusBadgeRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isPremium ? colors.secondary : colors.onSurfaceVariant },
                  ]}
                />
                <Text style={styles.statusLabel}>
                  {STATUS_LABELS[licenseStatus] ?? licenseStatus}
                </Text>
              </View>
            </View>
          </View>

          {renderStatusDescription()}

          <View style={styles.statusMetaRow}>
            <Text style={styles.statusMetaLabel}>Sumber</Text>
            <Text style={styles.statusMetaValue}>{SOURCE_LABELS[source] || source}</Text>
          </View>

          {isPremium && source === 'account' && premiumAccountId && (
            <View style={styles.statusMetaRow}>
              <Text style={styles.statusMetaLabel}>Akun Premium</Text>
              <Text style={styles.statusMetaValue} numberOfLines={1}>{premiumAccountId}</Text>
            </View>
          )}

          {isPremium && expiresAt && (
            <View style={styles.statusMetaRow}>
              <Text style={styles.statusMetaLabel}>Berlaku sampai</Text>
              <Text style={styles.statusMetaValue}>{formatDate(expiresAt)}</Text>
            </View>
          )}

          {!isPremium && (
            <View style={styles.statusMetaRow}>
              <Text style={styles.statusMetaLabel}>Trial berakhir</Text>
              <Text style={styles.statusMetaValue}>{formatDate(trialEndsAt)}</Text>
            </View>
          )}
        </Card>

        {/* ════════════════════════════════════════════════════════════
            SECTION 2: Login Premium / Akun Premium
            ════════════════════════════════════════════════════════════ */}
        <Card style={styles.sectionCard}>
          {isPremiumAccount ? (
            <>
              <View style={styles.premiumActiveHeader}>
                <Ionicons name="checkmark-circle" size={22} color={colors.secondary} />
                <Text style={styles.sectionTitle}>Akun Premium Aktif</Text>
              </View>
              <Text style={styles.premiumActiveDesc}>
                Anda sudah login akun Premium. Data dapat dicadangkan dan dipulihkan kapan saja.
              </Text>
              <View style={styles.premiumActionRow}>
                <AppButton
                  title="Restore Backup"
                  onPress={handleRestoreFromBackup}
                  variant="primary"
                  size="sm"
                  fullWidth
                />
              </View>
              <View style={styles.premiumActionRow}>
                <AppButton
                  title="Backup Sekarang"
                  onPress={handleBackupNow}
                  variant="outline"
                  size="sm"
                  fullWidth
                />
              </View>
              <View style={styles.premiumActionRow}>
                <AppButton
                  title="Logout Premium"
                  onPress={handleLogoutPremium}
                  variant="ghost"
                  size="sm"
                  fullWidth
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Login Premium</Text>
              <Text style={styles.premiumDesc}>
                Premium dapat digunakan dengan akun. Saat pindah perangkat, cukup login dan pulihkan data dari backup.
              </Text>
              <Button
                title="Login Premium"
                onPress={() => setShowLoginModal(true)}
                fullWidth
                icon={<Ionicons name="log-in-outline" size={18} color={colors.onPrimary} />}
              />
            </>
          )}
        </Card>

        {/* ════════════════════════════════════════════════════════════
            SECTION 3: Kode Perangkat
            ════════════════════════════════════════════════════════════ */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Kode Perangkat</Text>

          <View style={styles.deviceCodeBox}>
            <Text selectable style={styles.deviceCodeText}>
              {deviceCode || 'Memuat...'}
            </Text>
          </View>

          <Text style={styles.deviceCodeHint}>
            Kode ini diperlukan admin untuk membuat kode lisensi.
          </Text>

          <View style={styles.deviceActions}>
            <Button
              title={copiedDevice ? 'Tersalin!' : 'Salin Kode Perangkat'}
              onPress={handleCopyDeviceCode}
              variant="outline"
              size="sm"
              icon={<Ionicons name="copy-outline" size={16} color={colors.primary} />}
            />
            <Button
              title="Hubungi Admin"
              onPress={handleContactAdmin}
              variant="outline"
              size="sm"
              icon={<Ionicons name="logo-whatsapp" size={16} color={colors.primary} />}
            />
          </View>
        </Card>

        {/* ════════════════════════════════════════════════════════════
            SECTION 4: Kode Lisensi (Lifetime / Premium manual)
            ════════════════════════════════════════════════════════════ */}
        <Card style={styles.sectionCard}>
          {isPremium && !isPremiumAccount ? (
            <>
              <View style={styles.premiumActiveHeader}>
                <Ionicons name="checkmark-circle" size={22} color={colors.secondary} />
                <Text style={styles.sectionTitle}>Premium Aktif</Text>
              </View>
              <Text style={styles.premiumActiveDesc}>
                Semua fitur Premium tersedia.
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
                    onChangeText={(v) => setLicenseCode(v.toUpperCase())}
                    placeholder="ADK-LIFE-XXXX-YYYY-BBBBBBBB"
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
            </>
          ) : !isPremiumAccount && (
            <>
              <Text style={styles.sectionTitle}>Aktivasi Lisensi (Lifetime / Premium)</Text>

              <Text style={styles.activationDesc}>
                Masukkan kode lisensi dari admin untuk mengaktifkan. Kode baru memiliki signature HMAC 8 karakter di akhir.
              </Text>

              <Input
                label="Kode Lisensi"
                value={licenseCode}
                onChangeText={(v) => setLicenseCode(v.toUpperCase())}
                placeholder="ADK-LIFE-XXXX-YYYY-BBBBBBBB"
                editable={!isActivating}
              />

              <Button
                title="Aktifkan Lisensi"
                onPress={handleActivateLicense}
                fullWidth
                loading={isActivating}
              />

              <Text style={styles.activationHelp}>
                Belum punya kode lisensi?{' '}
                <Text style={styles.activationHelpBold}>Salin Kode Perangkat</Text> lalu kirim ke admin
                melalui WhatsApp.
              </Text>
            </>
          )}
        </Card>

        {/* ════════════════════════════════════════════════════════════
            SECTION 5: Cara Aktivasi (hanya jika belum Premium)
            ════════════════════════════════════════════════════════════ */}
        {!isPremium && !isPremiumAccount && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Cara Aktivasi Lisensi</Text>

            <View style={styles.stepsList}>
              <StepItem number={1} text="Salin Kode Perangkat dari halaman ini" />
              <StepItem number={2} text="Kirim ke admin melalui WhatsApp" />
              <StepItem number={3} text="Admin akan mengirimkan Kode Lisensi" />
              <StepItem
                number={4}
                text="Masukkan Kode Lisensi di bagian Aktivasi Lisensi di atas"
              />
            </View>
          </Card>
        )}

        {/* ════════════════════════════════════════════════════════════
            SECTION 6: Data Akun / Toko
            ════════════════════════════════════════════════════════════ */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Data Akun / Toko</Text>

          <View style={styles.logoUpload}>
            <Text style={styles.label}>Logo Warung</Text>
            <TouchableOpacity style={styles.logoBox} onPress={pickLogo} activeOpacity={0.7}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoPreview} />
              ) : (
                <Ionicons name="camera-outline" size={28} color={colors.primary} />
              )}
              <View style={styles.logoCameraBadge}>
                <Ionicons name="camera" size={14} color={colors.onPrimary} />
              </View>
            </TouchableOpacity>
            <Text style={styles.logoHint}>Ganti Foto Warung</Text>
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
            title="Update Data Akun"
            onPress={handleSave}
            fullWidth
            loading={isSaving}
          />
        </Card>

        {/* ════════════════════════════════════════════════════════════
            SECTION 7: Fitur Premium
            ════════════════════════════════════════════════════════════ */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Fitur Premium</Text>

          <View style={styles.featureList}>
            <FeatureRow icon="cloud-outline" text="Cadangan Data Cloud" />
            <FeatureRow icon="download-outline" text="Export laporan PDF/CSV" />
            <FeatureRow icon="print-outline" text="Printer Struk" />
            <FeatureRow icon="chatbubble-ellipses-outline" text="Support prioritas" />
          </View>

          <Button
            title="Lihat Fitur Premium"
            onPress={() => router.push('/settings/premium')}
            variant="outline"
            fullWidth
            icon={<Ionicons name="diamond-outline" size={18} color={colors.primary} />}
          />
        </Card>
      </ScrollView>

      {/* ── Modal Login Premium ── */}
      <AppModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        type="info"
        title="Login Premium"
        icon="log-in"
        message="Masukkan nomor WhatsApp atau email yang terdaftar untuk login akun Premium."
        primaryAction={{
          label: loginLoading ? 'Memproses...' : 'Login',
          onPress: handleLoginPremium,
          variant: 'primary',
          loading: loginLoading,
        }}
        secondaryAction={{
          label: 'Batal',
          onPress: () => { setShowLoginModal(false); setLoginInput(''); },
          variant: 'outline',
        }}
      >
        <View style={loginStyles.inputRow}>
          <TextInput
            style={loginStyles.input}
            value={loginInput}
            onChangeText={setLoginInput}
            placeholder="08xxxxxx atau email@contoh.com"
            placeholderTextColor={colors.onSurfaceVariant}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loginLoading}
          />
        </View>
      </AppModal>

      {/* ── Modal Restore Backup ── */}
      <AppModal
        visible={restoreState === 'backup_found'}
        onClose={skipRestore}
        type="info"
        title="Pulihkan Data?"
        icon="cloud-download"
        message={restoreMessage}
        primaryAction={{
          label: restoreLoading ? 'Memulihkan...' : 'Restore Sekarang',
          onPress: handleRestoreFromBackup,
          variant: 'primary',
          loading: restoreLoading,
        }}
        secondaryAction={{
          label: 'Lewati Dulu',
          onPress: skipRestore,
          variant: 'outline',
        }}
      >
        {backupInfo && (
          <View style={loginStyles.backupDetail}>
            {backupInfo.storeName && (
              <Text style={loginStyles.backupText}>Toko: {backupInfo.storeName}</Text>
            )}
            <Text style={loginStyles.backupText}>
              Backup: {new Date(backupInfo.createdAt).toLocaleDateString('id-ID')}
            </Text>
            <Text style={loginStyles.backupText}>
              Data: {backupInfo.recordCounts.products || 0} produk, {backupInfo.recordCounts.customers || 0} pelanggan
            </Text>
          </View>
        )}
      </AppModal>

      {/* ── Modal Konfirmasi Overwrite ── */}
      <AppModal
        visible={restoreState === 'confirm_overwrite'}
        onClose={skipRestore}
        type="warning"
        title="Timpa Data Lokal?"
        icon="warning"
        message={restoreMessage}
        primaryAction={{
          label: restoreLoading ? 'Memulihkan...' : 'Restore',
          onPress: handleRestoreFromBackup,
          variant: 'danger',
          loading: restoreLoading,
        }}
        secondaryAction={{
          label: 'Batal',
          onPress: skipRestore,
          variant: 'outline',
        }}
      >
        {backupInfo && (
          <View style={loginStyles.backupDetail}>
            {backupInfo.storeName && (
              <Text style={loginStyles.backupText}>Toko: {backupInfo.storeName}</Text>
            )}
            <Text style={loginStyles.backupText}>
              Backup: {new Date(backupInfo.createdAt).toLocaleDateString('id-ID')}
            </Text>
            <Text style={loginStyles.backupText}>
              Data: {backupInfo.recordCounts.products || 0} produk, {backupInfo.recordCounts.customers || 0} pelanggan
            </Text>
          </View>
        )}
      </AppModal>

      {/* ── Modal Restore Berhasil ── */}
      <AppModal
        visible={restoreState === 'restore_done'}
        onClose={() => { resetRestore(); router.replace('/(tabs)'); }}
        type="success"
        title="Restore Berhasil"
        icon="checkmark-circle"
        message="Data toko berhasil dipulihkan ke perangkat ini."
        primaryAction={{
          label: 'Ke Kasir',
          onPress: () => { resetRestore(); router.replace('/(tabs)'); },
          variant: 'primary',
        }}
      />

      {/* ── Modal Restore Gagal ── */}
      <AppModal
        visible={restoreState === 'restore_failed'}
        onClose={resetRestore}
        type="warning"
        title="Restore Gagal"
        icon="alert-circle"
        message={restoreMessage || 'Data belum berhasil dipulihkan. Coba lagi atau hubungi admin AdaKasir.'}
        primaryAction={{
          label: 'Coba Lagi',
          onPress: handleRestoreFromBackup,
          variant: 'primary',
          loading: restoreLoading,
        }}
        secondaryAction={{
          label: 'Tutup',
          onPress: resetRestore,
          variant: 'outline',
        }}
      />

      {/* ── Modal No Backup ── */}
      <AppModal
        visible={restoreState === 'no_backup'}
        onClose={resetRestore}
        type="info"
        title="Login Premium Berhasil"
        icon="checkmark-circle"
        message="Akun Premium Anda sudah aktif, namun belum ada backup data yang ditemukan."
        primaryAction={{
          label: 'OK',
          onPress: resetRestore,
          variant: 'primary',
        }}
      />

      {/* ── Modal Login Error ── */}
      <AppModal
        visible={showLoginErrorModal}
        onClose={() => setShowLoginErrorModal(false)}
        type="warning"
        title={loginErrorTitle}
        icon="alert-circle"
        message={loginErrorMessage}
        primaryAction={{
          label: 'Hubungi Admin',
          onPress: () => {
            setShowLoginErrorModal(false);
            setShowPaketPicker(true);
          },
          variant: 'primary',
        }}
        secondaryAction={{
          label: 'Tutup',
          onPress: () => setShowLoginErrorModal(false),
          variant: 'ghost',
        }}
      />

      {/* ── Modal Pilih Paket ── */}
      <AppModal
        visible={showPaketPicker}
        onClose={() => setShowPaketPicker(false)}
        type="info"
        title="Hubungi Admin"
        icon="logo-whatsapp"
        message="Pilih paket yang diinginkan untuk menghubungi admin."
        actions={[
          {
            label: 'Lifetime',
            onPress: () => { setShowPaketPicker(false); sendWaMessage('Lifetime'); },
            variant: 'primary',
          },
          {
            label: 'Premium',
            onPress: () => { setShowPaketPicker(false); sendWaMessage('Premium'); },
            variant: 'outline',
          },
          {
            label: 'Batal',
            onPress: () => setShowPaketPicker(false),
            variant: 'outline',
          },
        ]}
      />
      {modal}
    </View>
  );
}

// ─── Sub-komponen ────────────────────────────────────────────────────────
function StepItem({ number, text }: { number: number; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepCircle}>
        <Text style={styles.stepNumber}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={18} color={colors.secondary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile, paddingBottom: 32 },
  sectionCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },

  // ── Status Paket ──
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd },
  statusLogo: { width: 48, height: 48 },
  statusHeaderText: { flex: 1 },
  appName: { ...typography.headlineMobile, color: colors.primary, fontWeight: '700' },
  statusBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  statusDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.stackSm,
    lineHeight: 18,
  },
  statusMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.stackMd,
    paddingTop: spacing.stackMd,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  statusMetaLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  statusMetaValue: { ...typography.labelSm, color: colors.onSurface, fontWeight: '600' },

  // ── Kode Perangkat ──
  deviceCodeBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: spacing.stackMd,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.stackSm,
  },
  deviceCodeText: {
    ...typography.bodyLg,
    fontFamily: 'monospace',
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 16,
  },
  deviceCodeHint: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.stackMd,
  },
  deviceActions: {
    flexDirection: 'column',
    gap: spacing.stackSm,
  },

  // ── Premium ──
  premiumDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.stackMd,
    lineHeight: 20,
  },

  // ── Aktivasi Lisensi ──
  activationDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.stackMd,
    lineHeight: 20,
  },
  activationHelp: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.stackMd,
    textAlign: 'center',
    lineHeight: 18,
  },
  activationHelpBold: { fontWeight: '700', color: colors.primary },

  // ── Premium Active ──
  premiumActiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    marginBottom: spacing.stackSm,
  },
  premiumActiveDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.stackMd,
    lineHeight: 20,
  },
  premiumActionRow: {
    marginBottom: spacing.stackSm,
  },

  // ── Cara Aktivasi ──
  stepsList: { gap: spacing.stackSm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: { ...typography.labelSm, color: colors.primary, fontWeight: '700', fontSize: 13 },
  stepText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },

  // ── Section title ──
  sectionTitle: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700' },

  // ── Data Akun ──
  label: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm, alignSelf: 'flex-start' },
  logoUpload: { alignItems: 'center', marginBottom: spacing.stackLg },
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
  logoPreview: { width: '100%', height: '100%' },
  logoCameraBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  logoHint: {
    ...typography.labelSm, color: colors.primary, fontWeight: '600', marginTop: spacing.stackSm, textAlign: 'center',
  },

  // ── Fitur Premium ──
  featureList: { gap: spacing.stackSm, marginBottom: spacing.stackMd },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  featureText: { ...typography.bodyMd, color: colors.onSurface },

  // ── License button row ──
  licenseButtonRow: { flexDirection: 'row', gap: spacing.stackSm, marginTop: spacing.stackSm },
  licenseBtnWrapper: { flex: 1 },
});

const loginStyles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: colors.surfaceContainerLow, borderRadius: 12,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.stackMd,
    marginBottom: 16,
  },
  input: {
    flex: 1, ...typography.bodyLg, color: colors.onSurface,
    paddingVertical: 0,
  },
  backupDetail: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: spacing.stackMd,
    marginBottom: 16,
    gap: 4,
  },
  backupText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
});
