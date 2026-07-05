import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
import { useCloudAccount } from '../../src/hooks/useCloudAccount';

// ─── Constants ──────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  trial_active: 'Trial Aktif',
  trial_expired: 'Trial Berakhir',
  lifetime: 'Lifetime Basic',
  premium_active: 'Premium Aktif',
  premium_expired: 'Premium Berakhir',
};

const SOURCE_LABELS: Record<string, string> = {
  trial: 'Trial Gratis',
  local_device: 'Kode Lisensi',
  manual_fallback: 'Kode Premium',
  account: 'Premium Account (legacy)',
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
  const refreshLicenseStatus = useLicenseStore((state) => state.refreshStatus);
  const isReadOnly = useLicenseStore((s) => s.isReadOnlyMode());
  const source = useLicenseStore((s) => s.source);
  const hasLifetime = useLicenseStore((s) => s.hasLifetime);
  const cloudUserId = useLicenseStore((s) => s.cloudUserId);
  const cloudEmail = useLicenseStore((s) => s.cloudEmail);
  const isCloudLoggedIn = useLicenseStore((s) => s.isCloudLoggedIn);
  const canUsePremiumFeatures = useLicenseStore((s) => s.canUsePremiumFeatures);

  const isPremium = licenseStatus === 'premium_active';

  const {
    loginCloud,
    isLoggingIn,
    registerCloud,
    isRegistering,
    logoutCloud,
  } = useCloudAccount();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Login modal state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register modal state
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');

  // ── Store form state ──
  const [storeName, setStoreName] = useState(activeStore?.name || '');
  const [ownerName, setOwnerName] = useState(activeStore?.ownerName || '');
  const [phone, setPhone] = useState(activeStore?.phone || '');
  const [address, setAddress] = useState(activeStore?.address || '');
  const [logoUri, setLogoUri] = useState<string | null>(activeStore?.logoUri ?? null);
  const [isSaving, setIsSaving] = useState(false);
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

  useFocusEffect(
    React.useCallback(() => {
      refreshLicenseStatus();
    }, [refreshLicenseStatus])
  );

  // ── Pick logo ──
  const pickLogo = useCallback(async () => {
    if (isReadOnly) {
      handleReadOnly('Anda tidak dapat mengubah foto warung saat lisensi sudah berakhir.');
      return;
    }
    const uri = await openImagePicker({ aspect: [1, 1], quality: 0.7 }, 'Ganti Foto Warung');
    if (uri) setLogoUri(uri);
  }, [isReadOnly, handleReadOnly, openImagePicker]);

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

  // ─── Login Cloud ──────────────────────────────────────────────────────
  const handleLoginCloud = async () => {
    setLoginError('');
    if (!loginEmail.trim()) { setLoginError('Masukkan email.'); return; }
    if (!loginPassword) { setLoginError('Masukkan password.'); return; }
    const result = await loginCloud(loginEmail.trim(), loginPassword);
    if (!result.success) {
      setLoginError(result.message);
      return;
    }
    // Success — show confirmation
    setShowLoginModal(false);
    setLoginEmail('');
    setLoginPassword('');
    setSuccessTitle('Login Berhasil');
    setSuccessMessage('Akun Cloud berhasil dihubungkan. Data Anda dapat dicadangkan ke cloud.');
    setShowSuccessModal(true);
  };

  const resetLoginModal = () => {
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
    setShowLoginModal(false);
  };

  // ─── Register Cloud ───────────────────────────────────────────────────
  const handleRegisterCloud = async () => {
    setRegError('');
    if (!regEmail.trim()) { setRegError('Masukkan email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setRegError('Format email tidak valid.');
      return;
    }
    if (!regPassword || regPassword.length < 6) { setRegError('Password minimal 6 karakter.'); return; }
    if (regPassword !== regConfirmPassword) { setRegError('Konfirmasi password tidak cocok.'); return; }

    const result = await registerCloud(regEmail.trim(), regPassword);
    if (!result.success) {
      setRegError(result.message);
      return;
    }
    setShowRegisterModal(false);
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
    setSuccessTitle('Pendaftaran Berhasil');
    setSuccessMessage(result.message);
    setShowSuccessModal(true);
  };

  const resetRegisterModal = () => {
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegError('');
    setShowRegisterModal(false);
  };

  // ─── Logout Cloud ─────────────────────────────────────────────────────
  const handleLogoutCloud = () => {
    Alert.alert(
      'Logout Akun Cloud',
      'Anda akan logout dari akun cloud. Lisensi Premium di perangkat ini tetap aktif. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logoutCloud();
            // Also cleanup legacy premium account data if any
            await PremiumAccountService.clearAccount().catch(() => {});
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader title="Akun & Lisensi" onBack={() => router.back()} />
      <ScrollView style={styles.content} contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}>
        {/* ════════════════════════════════════════════════════════════
            SECTION 1: Status Paket / Lisensi
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

          {/* Detail lisensi */}
          <View style={styles.statusMetaRow}>
            <Text style={styles.statusMetaLabel}>Sumber</Text>
            <Text style={styles.statusMetaValue}>{SOURCE_LABELS[source] || source}</Text>
          </View>

          {isPremium && expiresAt && (
            <View style={styles.statusMetaRow}>
              <Text style={styles.statusMetaLabel}>Masa Aktif</Text>
              <Text style={styles.statusMetaValue}>{formatDate(expiresAt)}</Text>
            </View>
          )}

          {hasLifetime && (
            <View style={styles.statusMetaRow}>
              <Text style={styles.statusMetaLabel}>Lifetime Basic</Text>
              <Text style={styles.statusMetaValue}>Aktif Selamanya</Text>
            </View>
          )}

          {!isPremium && !hasLifetime && (
            <View style={styles.statusMetaRow}>
              <Text style={styles.statusMetaLabel}>Trial Berakhir</Text>
              <Text style={styles.statusMetaValue}>{formatDate(trialEndsAt)}</Text>
            </View>
          )}

          {/* Tombol aktivasi jika perlu */}
          {!isPremium && (
            <View style={styles.sectionAction}>
              <AppButton
                title="Aktivasi Lisensi"
                onPress={() => router.push('/settings/activation')}
                variant="primary"
                fullWidth
                size="md"
                icon={<Ionicons name="key-outline" size={18} color={colors.onPrimary} />}
              />
              <View style={styles.sectionActionSpacer} />
              <AppButton
                title="Hubungi Admin"
                onPress={handleContactAdmin}
                variant="outline"
                fullWidth
                size="sm"
                icon={<Ionicons name="logo-whatsapp" size={16} color={colors.primary} />}
              />
            </View>
          )}
        </Card>

        {/* ════════════════════════════════════════════════════════════
            SECTION 2: Akun Cloud
            ════════════════════════════════════════════════════════════ */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Akun Cloud AdaKasir</Text>
          </View>

          {isCloudLoggedIn && cloudUserId ? (
            // ── Terhubung ──
            <>
              <View style={styles.cloudStatusRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.secondary} />
                <Text style={styles.cloudStatusLabel}>Terhubung</Text>
              </View>
              <Text style={styles.cloudEmailText}>{cloudEmail || '-'}</Text>
              <View style={styles.cloudActionSpacer} />
              <AppButton
                title="Logout Akun Cloud"
                onPress={handleLogoutCloud}
                variant="ghost"
                fullWidth
                size="sm"
                icon={<Ionicons name="log-out-outline" size={16} color={colors.error} />}
              />
            </>
          ) : (
            // ── Belum Terhubung ──
            <>
              <Text style={styles.cloudDesc}>
                {isPremium
                  ? 'Masuk atau daftar Akun Cloud untuk menyimpan dan memulihkan backup data Anda.'
                  : 'Cloud Backup tersedia untuk pengguna Premium. Aktifkan Premium terlebih dahulu.'}
              </Text>
              {isPremium && (
                <View style={styles.cloudActions}>
                  <AppButton
                    title="Masuk Akun Cloud"
                    onPress={() => setShowLoginModal(true)}
                    variant="primary"
                    fullWidth
                    size="md"
                    icon={<Ionicons name="log-in-outline" size={18} color={colors.onPrimary} />}
                  />
                  <View style={styles.cloudActionSpacer} />
                  <AppButton
                    title="Daftar Akun Cloud"
                    onPress={() => setShowRegisterModal(true)}
                    variant="outline"
                    fullWidth
                    size="md"
                    icon={<Ionicons name="person-add-outline" size={18} color={colors.primary} />}
                  />
                </View>
              )}
            </>
          )}
        </Card>

        {/* ════════════════════════════════════════════════════════════
            SECTION 3: Fitur Premium (navigasi)
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

        {/* ════════════════════════════════════════════════════════════
            SECTION 4: Data Akun / Toko
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
      </ScrollView>

      {/* ─── Modal: Login Akun Cloud ─────────────────────────────── */}
      <AppModal
        visible={showLoginModal}
        onClose={resetLoginModal}
        type="info"
        title="Masuk Akun Cloud"
        icon="log-in"
        message="Masukkan email dan password akun cloud Anda."
        primaryAction={{
          label: isLoggingIn ? 'Memproses...' : 'Masuk',
          onPress: handleLoginCloud,
          variant: 'primary',
          loading: isLoggingIn,
        }}
        secondaryAction={{
          label: 'Daftar Akun Cloud',
          onPress: () => { resetLoginModal(); setShowRegisterModal(true); },
          variant: 'ghost',
        }}
      >
        {loginError ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{loginError}</Text>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={loginEmail}
            onChangeText={setLoginEmail}
            placeholder="email@contoh.com"
            placeholderTextColor={colors.onSurfaceVariant}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoggingIn}
          />
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={loginPassword}
            onChangeText={setLoginPassword}
            placeholder="Password"
            placeholderTextColor={colors.onSurfaceVariant}
            secureTextEntry
            autoCapitalize="none"
            editable={!isLoggingIn}
          />
        </View>
      </AppModal>

      {/* ─── Modal: Daftar Akun Cloud ────────────────────────────── */}
      <AppModal
        visible={showRegisterModal}
        onClose={resetRegisterModal}
        type="info"
        title="Daftar Akun Cloud"
        icon="person-add"
        message="Buat akun cloud untuk menyimpan backup data AdaKasir."
        primaryAction={{
          label: isRegistering ? 'Mendaftarkan...' : 'Daftar',
          onPress: handleRegisterCloud,
          variant: 'primary',
          loading: isRegistering,
        }}
        secondaryAction={{
          label: 'Sudah punya akun? Masuk',
          onPress: () => { resetRegisterModal(); setShowLoginModal(true); },
          variant: 'outline',
        }}
      >
        {regError ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{regError}</Text>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={regEmail}
            onChangeText={setRegEmail}
            placeholder="Email"
            placeholderTextColor={colors.onSurfaceVariant}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isRegistering}
          />
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={regPassword}
            onChangeText={setRegPassword}
            placeholder="Password (min. 6 karakter)"
            placeholderTextColor={colors.onSurfaceVariant}
            secureTextEntry
            autoCapitalize="none"
            editable={!isRegistering}
          />
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={regConfirmPassword}
            onChangeText={setRegConfirmPassword}
            placeholder="Konfirmasi Password"
            placeholderTextColor={colors.onSurfaceVariant}
            secureTextEntry
            autoCapitalize="none"
            editable={!isRegistering}
          />
        </View>
      </AppModal>

      {/* ─── Modal: Sukses Login/Daftar Cloud ────────────────────── */}
      <AppModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        type="success"
        title={successTitle}
        icon="checkmark-circle"
        message={successMessage}
        primaryAction={{
          label: 'Kembali ke Kasir',
          onPress: () => router.replace('/(tabs)'),
          variant: 'primary',
        }}
        secondaryAction={{
          label: 'Tutup',
          onPress: () => setShowSuccessModal(false),
          variant: 'outline',
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
  sectionAction: { marginTop: spacing.stackLg },
  sectionActionSpacer: { height: spacing.stackSm },

  // ── Section ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    marginBottom: spacing.stackMd,
  },
  sectionTitle: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700' },

  // ── Cloud Account ──
  cloudStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cloudStatusLabel: { ...typography.bodyMd, color: colors.secondary, fontWeight: '600' },
  cloudEmailText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  cloudDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: spacing.stackMd,
  },
  cloudActions: { width: '100%' },
  cloudActionSpacer: { height: spacing.stackSm },

  // ── Features ──
  featureList: { gap: spacing.stackSm, marginBottom: spacing.stackMd },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  featureText: { ...typography.bodyMd, color: colors.onSurface },

  // ── Data Akun ──
  label: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm, alignSelf: 'flex-start' },
  logoUpload: { alignItems: 'center', marginBottom: spacing.stackLg },
  logoBox: {
    width: 104, height: 104,
    borderRadius: borderRadius.lg,
    borderWidth: 2, borderColor: colors.outlineVariant, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow, overflow: 'hidden',
  },
  logoPreview: { width: '100%', height: '100%' },
  logoCameraBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  logoHint: { ...typography.labelSm, color: colors.primary, fontWeight: '600', marginTop: spacing.stackSm, textAlign: 'center' },

  // ── Input ──
  inputRow: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: colors.surfaceContainerLow, borderRadius: 12,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.stackMd,
    marginBottom: 12,
  },
  input: { flex: 1, ...typography.bodyLg, color: colors.onSurface, paddingVertical: 0 },

  // ── Error ──
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    width: '100%', marginBottom: 12,
  },
  errorText: { flex: 1, ...typography.labelSm, color: colors.error },
});
