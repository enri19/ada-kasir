import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppModal } from '../../src/components/ui/AppModal';
import { Card } from '../../src/components/Card';
import { CustomHeader } from '../../src/components/CustomHeader';
import { Input } from '../../src/components/Input';
import { useLicenseStore } from '../../src/stores/license.store';
import { useAppStore } from '../../src/stores/app.store';
import { LicenseService } from '../../src/services/license.service';
import { StoreRepository } from '../../src/database/store.repo';
import { CategoryRepository } from '../../src/database/category.repo';
import { ADMIN_WHATSAPP } from '../../src/utils/constants';

export default function ActivationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const deviceCode = useLicenseStore((s) => s.deviceCode);
  const licenseStatus = useLicenseStore((s) => s.status);
  const activateLicense = useLicenseStore((s) => s.activateLicense);
  const refreshLicenseStatus = useLicenseStore((s) => s.refreshStatus);
  const setActiveStore = useAppStore((s) => s.setActiveStore);
  const setIsOnboardingComplete = useAppStore((s) => s.setIsOnboardingComplete);
  const activeStore = useAppStore((s) => s.activeStore);
  const isOnboardingComplete = useAppStore((s) => s.isOnboardingComplete);

  const [licenseCode, setLicenseCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultType, setResultType] = useState<'success' | 'error'>('success');
  const [resultTitle, setResultTitle] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [isPremiumManualSuccess, setIsPremiumManualSuccess] = useState(false);
  const [showPaketPicker, setShowPaketPicker] = useState(false);

  const isPremium = licenseStatus === 'premium_active';

  const handleCopyDevice = () => {
    if (!deviceCode) {
      Alert.alert('Kode Perangkat', 'Kode perangkat belum tersedia.');
      return;
    }
    Alert.alert('Kode Perangkat', deviceCode, [
      { text: 'Tutup', style: 'cancel' },
    ]);
  };

  const handleActivate = async () => {
    const code = licenseCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Kode kosong', 'Masukkan kode lisensi terlebih dahulu.');
      return;
    }

    setIsActivating(true);
    try {
      const result = await activateLicense(code);
      if (result === 'no_internet') {
        setResultType('error');
        setResultTitle('Aktivasi Gagal');
        setResultMessage('Tidak ada koneksi internet. Aktivasi lisensi membutuhkan koneksi internet.');
        setShowResultModal(true);
        return;
      }
      if (result === 'device_mismatch') {
        setResultType('error');
        setResultTitle('Aktivasi Gagal');
        setResultMessage('Kode lisensi tidak cocok dengan perangkat ini.');
        setShowResultModal(true);
        return;
      }
      if (result === 'expired') {
        setResultType('error');
        setResultTitle('Aktivasi Gagal');
        setResultMessage('Kode lisensi Premium sudah melewati tanggal berlaku.');
        setShowResultModal(true);
        return;
      }
      if (result !== 'ok') {
        setResultType('error');
        setResultTitle('Aktivasi Gagal');
        setResultMessage('Format kode lisensi tidak dikenali. Pastikan Anda memasukkan kode lengkap dengan signature.');
        setShowResultModal(true);
        return;
      }

      // Berhasil
      setLicenseCode('');
      await refreshLicenseStatus();

      // Baca expiresAt langsung dari store setelah aktivasi selesai
      const freshExpiresAt = useLicenseStore.getState().expiresAt;

      const isLifetime = code.startsWith('ADK-LIFE-');
      const isPremiumManual = code.startsWith('ADK-PREM-');
      setIsPremiumManualSuccess(isPremiumManual);
      setResultType('success');
      setResultTitle(isLifetime ? 'Lisensi Berhasil Diaktifkan' : 'Premium Berhasil Diaktifkan');
      const expiryDate = freshExpiresAt ? new Date(freshExpiresAt).toLocaleDateString('id-ID') : null;
      setResultMessage(
        isLifetime
          ? 'Lifetime Basic berhasil diaktifkan di perangkat ini.'
          : isPremiumManual
          ? 'Fitur Premium sudah aktif di perangkat ini. Masuk atau daftar Akun Cloud untuk backup dan restore data.'
          : `Fitur Premium AdaKasir sudah aktif sampai tanggal ${expiryDate}.`
      );
      setShowResultModal(true);
    } catch {
      setResultType('error');
      setResultTitle('Aktivasi Gagal');
      setResultMessage('Terjadi kesalahan. Coba lagi atau hubungi admin AdaKasir.');
      setShowResultModal(true);
    } finally {
      setIsActivating(false);
    }
  };

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
    Linking.openURL(url).catch(() => {
      Alert.alert('Gagal', 'Pastikan WhatsApp tersedia di perangkat Anda.');
    });
  };

  const handleResultDone = async () => {
    setShowResultModal(false);
    if (!isOnboardingComplete) {
      // Buat toko default jika belum ada (user masuk dari onboarding via kode lisensi)
      if (!activeStore) {
        try {
          const store = await StoreRepository.create({
            name: 'Toko Saya',
            ownerName: '',
            phone: '',
            address: '',
            receiptNote: 'Terima kasih atas kunjungan Anda.',
            logoUri: null,
          });
          await CategoryRepository.seedDefaultCategories();
          setActiveStore(store);
        } catch {}
      }
      setIsOnboardingComplete(true);
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  };

  const formatCode = (code: string) => {
    const cleaned = code.replace(/[^A-Z0-9-]/g, '');
    if (cleaned.length > 32) return cleaned.substring(0, 32);
    return cleaned;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader
        title="Aktivasi Lisensi"
        onBack={() => {
          // Jika dari onboarding atau sudah Premium, langsung ke kasir
          if (!isOnboardingComplete || isPremium) {
            router.replace('/(tabs)');
          } else {
            router.back();
          }
        }}
      />
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Penjelasan */}
        <Text style={styles.subtitle}>
          Masukkan kode lisensi Lifetime atau Premium yang diberikan oleh admin AdaKasir.
        </Text>

        {/* Card Jenis Lisensi */}
        <Card style={styles.sectionCard}>
          <View style={styles.codeCardHeader}>
            <Ionicons name="diamond-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Jenis Lisensi</Text>
          </View>
          <View style={styles.planList}>
            <View style={styles.planRow}>
              <View style={[styles.planBadge, { backgroundColor: '#6a4e9c' + '20' }]}>
                <Text style={[styles.planBadgeText, { color: '#6a4e9c' }]}>Lifetime</Text>
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Lifetime Basic</Text>
                <Text style={styles.planDesc}>Akses penuh selamanya di perangkat ini. Untuk pindah perangkat, hubungi admin.</Text>
              </View>
            </View>
            <View style={styles.planDivider} />
            <View style={styles.planRow}>
              <View style={[styles.planBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.planBadgeText, { color: colors.primary }]}>Premium</Text>
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Premium Bulanan / Tahunan</Text>
                <Text style={styles.planDesc}>Fitur lengkap + cloud backup & restore. Masuk Akun Cloud setelah aktivasi untuk backup data.</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Card Kode Perangkat */}
        <Card style={styles.sectionCard}>
          <View style={styles.codeCardHeader}>
            <Ionicons name="hardware-chip-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Kode Perangkat</Text>
          </View>
          <View style={styles.deviceCodeBox}>
            <Text selectable style={styles.deviceCodeText}>
              {deviceCode || 'Memuat...'}
            </Text>
          </View>
          <AppButton
            title="Salin Kode Perangkat"
            onPress={handleCopyDevice}
            variant="outline"
            fullWidth
            size="sm"
            icon={<Ionicons name="copy-outline" size={16} color={colors.primary} />}
          />
        </Card>

        {/* Card Cara Aktivasi */}
        <Card style={styles.sectionCard}>
          <View style={styles.codeCardHeader}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Cara Aktivasi Lisensi</Text>
          </View>
          <View style={styles.stepsList}>
            <StepItem number={1} text='Klik "Hubungi Admin" dan pilih paket Lifetime atau Premium.' />
            <StepItem number={2} text="WhatsApp akan terbuka dengan data toko & kode perangkat otomatis tercantum. Kirim pesan tersebut." />
            <StepItem number={3} text="Admin akan mengirimkan kode lisensi setelah pembayaran dikonfirmasi." />
            <StepItem number={4} text="Salin kode lisensi yang diterima, lalu tempel di kolom input di bawah." />
            <StepItem number={5} text='Tekan tombol "Aktivasi Lisensi".' />
            <StepItem number={6} text="(Premium) Setelah aktivasi, masuk atau daftar Akun Cloud untuk backup & restore data." />
          </View>
        </Card>

        {/* Input Kode Lisensi */}
        <Card style={styles.sectionCard}>
          <Text style={styles.label}>Kode Lisensi</Text>
          <Input
            label=""
            value={licenseCode}
            onChangeText={(v) => setLicenseCode(formatCode(v))}
            placeholder="ADK-LIFE-XXXX-2026"
          />

          <AppButton
            title={isActivating ? 'Mengaktivasi...' : 'Aktivasi Lisensi'}
            onPress={handleActivate}
            variant="primary"
            fullWidth
            size="lg"
            loading={isActivating}
            disabled={isActivating}
            style={styles.activateBtn}
          />

          <AppButton
            title="Hubungi Admin"
            onPress={handleContactAdmin}
            variant="outline"
            fullWidth
            size="md"
            icon={<Ionicons name="logo-whatsapp" size={16} color={colors.primary} />}
            style={styles.contactBtn}
          />
        </Card>

        {/* Catatan */}
        {isPremium ? (
          <View style={styles.footerNoteBox}>
            <Ionicons name="checkmark-circle" size={16} color={colors.secondary} />
            <Text style={styles.footerNoteText}>
              Premium sudah aktif di perangkat ini. {'\n'}
              Masuk atau daftar{' '}
              <Text style={styles.footerNoteLink} onPress={() => router.push('/settings/cloud-backup')}>
                Akun Cloud
              </Text>
              {' '}untuk backup & restore data.
            </Text>
          </View>
        ) : licenseStatus === 'lifetime' ? (
          <View style={styles.footerNoteBox}>
            <Ionicons name="checkmark-circle" size={16} color={colors.secondary} />
            <Text style={styles.footerNoteText}>
              Lifetime Basic aktif di perangkat ini. {'\n'}
              Cloud backup hanya tersedia untuk pengguna Premium.
              Untuk pindah perangkat, hubungi admin.
            </Text>
          </View>
        ) : (
          <View style={styles.footerNoteBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.footerNoteText}>
              Kode lisensi didapat dari admin AdaKasir setelah pembayaran. {'\n'}
              Lisensi berlaku untuk satu perangkat. Untuk pindah perangkat, hubungi admin.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal Hasil Aktivasi */}
      {isPremiumManualSuccess ? (
        <AppModal
          visible={showResultModal}
          onClose={handleResultDone}
          type="success"
          title={resultTitle}
          icon="checkmark-circle"
          message={resultMessage}
          primaryAction={{
            label: 'Masuk Akun Cloud',
            onPress: async () => {
              setShowResultModal(false);
              if (!isOnboardingComplete) {
                if (!activeStore) {
                  try {
                    const store = await StoreRepository.create({
                      name: 'Toko Saya',
                      ownerName: '',
                      phone: '',
                      address: '',
                      receiptNote: 'Terima kasih atas kunjungan Anda.',
                      logoUri: null,
                    });
                    await CategoryRepository.seedDefaultCategories();
                    setActiveStore(store);
                  } catch {}
                }
                setIsOnboardingComplete(true);
              }
              // Navigasi ke Cloud Backup
              if (!isOnboardingComplete) {
                await setIsOnboardingComplete(true);
              }
              router.push('/settings/cloud-backup');
            },
            variant: 'primary',
          }}
          secondaryAction={{
            label: 'Mulai Gunakan AdaKasir',
            onPress: () => {
              setIsOnboardingComplete(true).then(() => router.replace('/(tabs)'));
            },
            variant: 'outline',
          }}
        />
      ) : resultType === 'success' ? (
        // Sukses aktivasi Lifetime / Premium normal
        <AppModal
          visible={showResultModal}
          onClose={handleResultDone}
          type="success"
          title={resultTitle}
          icon="checkmark-circle"
          message={resultMessage}
          primaryAction={{
            label: 'Mulai Gunakan AdaKasir',
            onPress: handleResultDone,
            variant: 'primary',
          }}
        />
      ) : (
        // Gagal aktivasi — jangan kasih akses ke kasir
        <AppModal
          visible={showResultModal}
          onClose={() => setShowResultModal(false)}
          type="warning"
          title={resultTitle}
          icon="alert-circle"
          message={resultMessage}
          primaryAction={{
            label: 'Coba Lagi',
            onPress: () => setShowResultModal(false),
            variant: 'primary',
          }}
          secondaryAction={{
            label: 'Kembali',
            onPress: () => { setShowResultModal(false); router.back(); },
            variant: 'outline',
          }}
        />
      )}

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
    </View>
  );
}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile },

  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.stackLg,
    lineHeight: 20,
  },

  sectionCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },

  codeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    marginBottom: spacing.stackMd,
  },
  sectionTitle: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700' },

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

  // Steps
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

  // Plan list
  planList: { gap: spacing.stackSm },
  planRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.stackSm },
  planBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.md,
    minWidth: 72, alignItems: 'center',
  },
  planBadgeText: { ...typography.labelSm, fontWeight: '700', fontSize: 11 },
  planInfo: { flex: 1 },
  planName: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700' },
  planDesc: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2, lineHeight: 16 },
  planDivider: { height: 1, backgroundColor: colors.outlineVariant, marginVertical: 2 },

  // Code example
  codeExample: {
    marginTop: spacing.stackMd,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: spacing.stackMd,
  },
  codeExampleLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.stackSm,
    fontWeight: '600',
  },
  codeExampleText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontFamily: 'monospace',
    fontSize: 13,
    marginBottom: 2,
  },
  codeExampleHint: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.stackSm,
    lineHeight: 16,
    fontStyle: 'italic',
  },

  // Input & buttons
  label: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm, fontWeight: '700' },
  activateBtn: { marginTop: spacing.stackSm },
  contactBtn: { marginTop: spacing.stackSm },

  // Footer
  footerNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: spacing.stackMd,
    marginTop: spacing.stackMd,
  },
  footerNoteText: {
    flex: 1,
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  footerNoteLink: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
