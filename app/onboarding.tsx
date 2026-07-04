import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { colors, spacing, typography, borderRadius } from '../src/config/theme';
import { AppButton } from '../src/components/ui/AppButton';
import { AppModal } from '../src/components/ui/AppModal';
import { RestoreProgressModal } from '../src/components/ui/RestoreProgressModal';
import { Input } from '../src/components/Input';
import { Card } from '../src/components/Card';
import { useAppStore } from '../src/stores/app.store';
import { StoreRepository } from '../src/database/store.repo';
import { CategoryRepository } from '../src/database/category.repo';
import { ADMIN_WHATSAPP } from '../src/utils/constants';
import { usePremiumLogin } from '../src/hooks/usePremiumLogin';

type OnboardingStep = 'choose' | 'form';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setIsOnboardingComplete = useAppStore((state) => state.setIsOnboardingComplete);
  const setActiveStore = useAppStore((state) => state.setActiveStore);

  // ── Step ──
  const [step, setStep] = useState<OnboardingStep>('choose');

  // ── Trial form state ──
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // ── Premium login state ──
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLoginError, setShowLoginError] = useState(false);
  const [loginErrorTitle, setLoginErrorTitle] = useState('Login Premium');
  const [loginErrorMessage, setLoginErrorMessage] = useState('');
  const [loginInput, setLoginInput] = useState('');

  // ── Premium login / restore hook ──
  const {
    login,
    isLoggingIn,
    restoreState,
    restoreMessage,
    backupInfo,
    isRestoring,
    executeRestore,
    skipRestore,
    resetRestoreFlow,
    restoreProgress,
  } = usePremiumLogin();

  // ── Start trial form ──
  const handleStartTrial = () => {
    setStep('form');
  };

  const handleStartSelling = async () => {
    if (!name.trim()) {
      Alert.alert('Lengkapi Data', 'Nama warung harus diisi');
      return;
    }

    if (!agreedToTerms) {
      Alert.alert('Syarat & Ketentuan', 'Anda harus menyetujui Syarat & Ketentuan');
      return;
    }

    try {
      const store = await StoreRepository.create({
        name: name.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        receiptNote: 'Terima kasih atas kunjungan Anda.',
        logoUri: null,
      });

      // Seed default categories
      await CategoryRepository.seedDefaultCategories();

      setActiveStore(store);
      setIsOnboardingComplete(true);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Gagal', 'Gagal menyimpan data toko: ' + (error as Error).message);
    }
  };

  // ── Login Premium ──
  const handleOpenLogin = () => {
    setLoginInput('');
    setShowLoginModal(true);
  };

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
      setShowLoginError(true);
      return;
    }

    // Login sukses — restore flow dijalankan otomatis oleh hook
    setShowLoginModal(false);
    setLoginInput('');
  };

  // ── Restore ──
  const handleRestoreFromBackup = async () => {
    await executeRestore();
  };

  const handleSkipRestore = async () => {
    skipRestore();
    await setIsOnboardingComplete(true);
    router.replace('/settings/account');
  };

  const handleRestoreDone = async () => {
    resetRestoreFlow();
    await setIsOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  // ── Kode Lisensi ──
  const handleEnterLicense = () => {
    router.push('/settings/activation');
  };

  // ── Hubungi Admin ──
  const handleContactSupport = async (presetMessage?: string) => {
    const message = presetMessage || 'Halo Admin, saya butuh bantuan setup awal aplikasi AdaKasir.';
    const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Gagal', 'Pastikan WhatsApp tersedia di perangkat Anda.');
    }
  };

  // ── Render: Choose step ──
  if (step === 'choose') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.chooseContent}>
          {/* Hero */}
          <View style={styles.heroSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="storefront" size={56} color={colors.primary} />
            </View>
            <Text style={styles.title}>AdaKasir</Text>
            <Text style={styles.subtitle}>Jualan cepat, laporan rapi.</Text>
            <Text style={styles.description}>
              Pilih cara memulai yang paling sesuai untuk Anda.
            </Text>
          </View>

          {/* Action cards */}
          <View style={styles.chooseActions}>
            {/* Mulai Trial Gratis */}
            <AppButton
              title="Mulai Trial Gratis"
              onPress={handleStartTrial}
              variant="primary"
              size="lg"
              fullWidth
              icon={<Ionicons name="rocket-outline" size={20} color={colors.onPrimary} />}
              style={styles.chooseBtn}
            />
            <Text style={styles.chooseHint}>
              Nikmati 14 hari gratis full fitur. Tidak perlu kartu kredit.
            </Text>

            {/* Login Premium */}
            <AppButton
              title="Login Premium"
              onPress={handleOpenLogin}
              variant="outline"
              size="lg"
              fullWidth
              icon={<Ionicons name="log-in-outline" size={20} color={colors.primary} />}
              style={styles.chooseBtn}
            />
            <Text style={styles.chooseHint}>
              Sudah punya akun Premium? Login dan pulihkan data dari backup cloud.
            </Text>

            {/* Masukkan Kode Lisensi */}
            <AppButton
              title="Masukkan Kode Lisensi"
              onPress={handleEnterLicense}
              variant="ghost"
              size="md"
              fullWidth
              icon={<Ionicons name="key-outline" size={18} color={colors.primary} />}
              style={styles.chooseBtn}
            />
            <Text style={styles.chooseHint}>
              Punya kode dari admin? Aktivasi Lifetime atau Premium di sini.
            </Text>
          </View>

          {/* Help */}
          <View style={styles.helpRow}>
            <Text style={styles.helpText}>Butuh bantuan? </Text>
            <Text style={styles.helpLink} onPress={() => handleContactSupport()}>
              Hubungi Support
            </Text>
          </View>
        </View>

        {/* ── Modal Login Premium ── */}
        <AppModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          type="info"
          title="Login Premium"
          icon="log-in"
          message="Masukkan nomor WhatsApp atau email yang terdaftar untuk login akun Premium."
          primaryAction={{
            label: isLoggingIn ? 'Memproses...' : 'Login',
            onPress: handleLoginPremium,
            variant: 'primary',
            loading: isLoggingIn,
          }}
          secondaryAction={{
            label: 'Batal',
            onPress: () => { setShowLoginModal(false); setLoginInput(''); },
            variant: 'outline',
          }}
        >
          <View style={modalStyles.inputRow}>
            <TextInput
              style={modalStyles.input}
              value={loginInput}
              onChangeText={setLoginInput}
              placeholder="08xxxxxx atau email@contoh.com"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoggingIn}
            />
          </View>
        </AppModal>

        {/* ── Modal Login Error ── */}
        <AppModal
          visible={showLoginError}
          onClose={() => setShowLoginError(false)}
          type="warning"
          title={loginErrorTitle}
          icon="alert-circle"
          message={loginErrorMessage}
          primaryAction={{
            label: 'Hubungi Admin',
            onPress: () => {
              setShowLoginError(false);
              handleContactSupport('Halo Admin AdaKasir, saya ingin aktivasi Premium. Mohon bantuan untuk login Premium.');
            },
            variant: 'primary',
          }}
          secondaryAction={{
            label: 'Tutup',
            onPress: () => setShowLoginError(false),
            variant: 'ghost',
          }}
        />

        {/* ── Modal Backup Ditemukan ── */}
        <AppModal
          visible={restoreState === 'backup_found'}
          onClose={handleSkipRestore}
          type="info"
          title="Backup Ditemukan"
          icon="cloud-download"
          message={restoreMessage}
          primaryAction={{
            label: isRestoring ? 'Memulihkan...' : 'Restore Sekarang',
            onPress: handleRestoreFromBackup,
            variant: 'primary',
            loading: isRestoring,
          }}
          secondaryAction={{
            label: 'Lewati Dulu',
            onPress: handleSkipRestore,
            variant: 'outline',
          }}
        >
          {backupInfo && (
            <View style={modalStyles.backupDetail}>
              {backupInfo.storeName && (
                <Text style={modalStyles.backupText}>Toko: {backupInfo.storeName}</Text>
              )}
              <Text style={modalStyles.backupText}>
                Backup: {new Date(backupInfo.createdAt).toLocaleDateString('id-ID')}
              </Text>
              <Text style={modalStyles.backupText}>
                Data: {backupInfo.recordCounts.products || 0} produk, {backupInfo.recordCounts.customers || 0} pelanggan
              </Text>
            </View>
          )}
        </AppModal>

        {/* ── Modal Konfirmasi Overwrite ── */}
        <AppModal
          visible={restoreState === 'confirm_overwrite'}
          onClose={handleSkipRestore}
          type="warning"
          title="Timpa Data Lokal?"
          icon="warning"
          message={restoreMessage}
          primaryAction={{
            label: isRestoring ? 'Memulihkan...' : 'Restore',
            onPress: handleRestoreFromBackup,
            variant: 'danger',
            loading: isRestoring,
          }}
          secondaryAction={{
            label: 'Batal',
            onPress: handleSkipRestore,
            variant: 'outline',
          }}
        >
          {backupInfo && (
            <View style={modalStyles.backupDetail}>
              {backupInfo.storeName && (
                <Text style={modalStyles.backupText}>Toko: {backupInfo.storeName}</Text>
              )}
              <Text style={modalStyles.backupText}>
                Backup: {new Date(backupInfo.createdAt).toLocaleDateString('id-ID')}
              </Text>
              <Text style={modalStyles.backupText}>
                Data: {backupInfo.recordCounts.products || 0} produk, {backupInfo.recordCounts.customers || 0} pelanggan
              </Text>
            </View>
          )}
        </AppModal>

        {/* ── Modal Restore Berhasil ── */}
        <AppModal
          visible={restoreState === 'restore_success'}
          onClose={handleRestoreDone}
          type="success"
          title="Restore Berhasil"
          icon="checkmark-circle"
          message="Data toko berhasil dipulihkan ke perangkat ini."
          primaryAction={{
            label: 'Mulai Berjualan',
            onPress: handleRestoreDone,
            variant: 'primary',
          }}
        />

        {/* ── Modal Restore Gagal ── */}
        <AppModal
          visible={restoreState === 'restore_error'}
          onClose={resetRestoreFlow}
          type="warning"
          title="Restore Gagal"
          icon="alert-circle"
          message={restoreMessage || 'Data belum berhasil dipulihkan. Coba lagi atau hubungi admin AdaKasir.'}
          primaryAction={{
            label: 'Coba Lagi',
            onPress: handleRestoreFromBackup,
            variant: 'primary',
            loading: isRestoring,
          }}
          secondaryAction={{
            label: 'Tutup',
            onPress: resetRestoreFlow,
            variant: 'outline',
          }}
        />

        {/* ── Modal No Backup ── */}
        <AppModal
          visible={restoreState === 'no_backup'}
          onClose={() => { resetRestoreFlow(); setIsOnboardingComplete(true).then(() => router.replace('/(tabs)')); }}
          type="success"
          title="Login Premium Berhasil"
          icon="checkmark-circle"
          message="Akun Premium Anda sudah aktif. Belum ada backup data yang ditemukan."
          primaryAction={{
            label: 'Mulai Gunakan AdaKasir',
            onPress: () => { resetRestoreFlow(); setIsOnboardingComplete(true).then(() => router.replace('/(tabs)')); },
            variant: 'primary',
          }}
        />

        {/* ── Modal Skipped ── */}
        <AppModal
          visible={restoreState === 'skipped'}
          onClose={() => { resetRestoreFlow(); setIsOnboardingComplete(true).then(() => router.replace('/settings/account')); }}
          type="info"
          title="Restore Dilewati"
          icon="information-circle"
          message="Anda dapat melakukan restore kapan saja dari menu Akun & Lisensi."
          primaryAction={{
            label: 'Oke',
            onPress: () => { resetRestoreFlow(); setIsOnboardingComplete(true).then(() => router.replace('/settings/account')); },
            variant: 'primary',
          }}
        />

        <RestoreProgressModal progress={restoreProgress} />
      </View>
    );
  }

  // ── Render: Trial form ──
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(100, insets.bottom + 24) }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="storefront" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>Mulai Tokomu Sekarang</Text>
        <Text style={styles.subtitle}>
          Hanya beberapa langkah lagi untuk mulai berjualan dengan cara yang lebih modern.
        </Text>
      </View>

      {/* Form Card */}
      <Card style={styles.form}>
        <Input
          label="Nama Warung"
          value={name}
          onChangeText={setName}
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

        {/* Terms Checkbox */}
        <TouchableOpacity
          style={styles.termsContainer}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
            {agreedToTerms && <Ionicons name="checkmark" size={16} color={colors.onPrimary} />}
          </View>
          <Text style={styles.termsText}>
            Saya menyetujui <Text style={styles.termsLink}>Syarat & Ketentuan</Text> serta Kebijakan Privasi AdaKasir.
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <AppButton
            title="Mulai Berjualan"
            onPress={handleStartSelling}
            variant="primary"
            size="lg"
            fullWidth
            icon={<Ionicons name="rocket-outline" size={20} color={colors.onPrimary} />}
          />
        </View>
      </Card>

      {/* Footer */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Kembali ke pilihan awal? </Text>
        <Text style={styles.footerLink} onPress={() => setStep('choose')}>Pilih Cara Lain</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.marginMobile },

  // ── Choose step ──
  chooseContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.marginMobile,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.stackLg,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackMd,
  },
  title: {
    ...typography.headlineLg,
    color: colors.primary,
    marginBottom: spacing.stackSm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.stackSm,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  chooseActions: {
    marginBottom: spacing.stackLg,
  },
  chooseBtn: {
    marginBottom: spacing.stackSm,
  },
  chooseHint: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.stackLg,
    lineHeight: 16,
  },
  helpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  helpLink: {
    ...typography.bodyMd,
    color: colors.primary,
    fontWeight: '700',
  },

  // ── Form step ──
  header: {
    alignItems: 'center',
    marginBottom: spacing.stackLg,
    marginTop: spacing.stackLg,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackMd,
  },
  form: {
    padding: spacing.stackMd,
    marginBottom: spacing.stackLg,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.stackLg,
    marginTop: spacing.stackSm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    marginRight: spacing.stackSm,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '700',
  },
  buttonContainer: {
    marginTop: spacing.stackMd,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  footerLink: {
    ...typography.bodyMd,
    color: colors.primary,
    fontWeight: '700',
  },
});

const modalStyles = StyleSheet.create({
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
