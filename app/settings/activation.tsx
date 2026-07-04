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
          ? 'Fitur Premium sudah aktif di perangkat ini. Agar bisa backup dan restore saat pindah perangkat, hubungkan akun Premium Anda.'
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
    const message = LicenseService.buildActivationMessage(
      activeStore?.name ?? '',
      deviceCode ?? '',
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
      <CustomHeader title="Aktivasi Lisensi" onBack={() => router.back()} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Penjelasan */}
        <Text style={styles.subtitle}>
          Masukkan kode lisensi yang diberikan oleh admin AdaKasir.
        </Text>

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
            <StepItem number={1} text="Salin kode perangkat di atas." />
            <StepItem number={2} text="Kirim kode perangkat ke admin AdaKasir melalui WhatsApp." />
            <StepItem number={3} text="Admin akan mengirimkan kode lisensi setelah pembayaran dikonfirmasi." />
            <StepItem number={4} text="Masukkan kode lisensi pada kolom di bawah." />
            <StepItem number={5} text="Tekan tombol Aktivasi." />
          </View>
          <View style={styles.codeExample}>
            <Text style={styles.codeExampleLabel}>Contoh format kode:</Text>
            <Text style={styles.codeExampleText}>Lifetime: ADK-LIFE-XXXX-2026</Text>
            <Text style={styles.codeExampleText}>Premium: ADK-PREM-XXXX-20260731</Text>
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
        <Text style={styles.footerNote}>
          Lifetime Basic aktif untuk perangkat ini. Premium Account dapat digunakan dengan login saat
          pindah perangkat.
        </Text>
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
            label: 'Hubungkan Akun Premium',
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
              router.replace('/settings/account');
            },
            variant: 'primary',
          }}
          secondaryAction={{
            label: 'Mulai Gunakan AdaKasir',
            onPress: handleResultDone,
            variant: 'outline',
          }}
        />
      ) : (
        <AppModal
          visible={showResultModal}
          onClose={handleResultDone}
          type={resultType === 'success' ? 'success' : 'warning'}
          title={resultTitle}
          icon={resultType === 'success' ? 'checkmark-circle' : 'alert-circle'}
          message={resultMessage}
          primaryAction={{
            label: 'Mulai Gunakan AdaKasir',
            onPress: handleResultDone,
            variant: 'primary',
          }}
        />
      )}
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

  // Input & buttons
  label: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm, fontWeight: '700' },
  activateBtn: { marginTop: spacing.stackSm },
  contactBtn: { marginTop: spacing.stackSm },

  // Footer
  footerNote: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: spacing.stackSm,
  },
});
