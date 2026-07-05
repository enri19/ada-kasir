import React, { useState, useEffect } from 'react';
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
import { useCloudAccount } from '../src/hooks/useCloudAccount';
import { useLicenseStore } from '../src/stores/license.store';

type OnboardingStep = 'choose' | 'form';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setIsOnboardingComplete = useAppStore((state) => state.setIsOnboardingComplete);
  const setActiveStore = useAppStore((state) => state.setActiveStore);
  const isOnboardingComplete = useAppStore((state) => state.isOnboardingComplete);
  const refreshLicenseStatus = useLicenseStore((s) => s.refreshStatus);

  // Guard: kalau sudah onboarding, redirect ke tabs
  React.useEffect(() => {
    refreshLicenseStatus(); // sync supabase session state
    if (isOnboardingComplete) {
      router.replace('/(tabs)');
    }
  }, [isOnboardingComplete]);

  // ── Step ──
  const [step, setStep] = useState<OnboardingStep>('choose');

  // ── Trial form state ──
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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
          </View>

          {/* Action cards */}
          <View style={styles.chooseActions}>
            {/* Mulai */}
            <AppButton
              title="Mulai"
              onPress={handleStartTrial}
              variant="primary"
              size="lg"
              fullWidth
              icon={<Ionicons name="rocket-outline" size={20} color={colors.onPrimary} />}
              style={styles.chooseBtn}
            />
            <Text style={styles.chooseHint}>
              Akses penuh selama 14 hari gratis. Tidak perlu kartu kredit.
            </Text>

            {/* Masukkan Kode Lisensi */}
            <AppButton
              title="Masukkan Kode Lisensi"
              onPress={handleEnterLicense}
              variant="outline"
              size="lg"
              fullWidth
              icon={<Ionicons name="key-outline" size={20} color={colors.primary} />}
              style={styles.chooseBtn}
            />
            <Text style={styles.chooseHint}>
              Sudah punya kode Lifetime atau Premium? Aktivasi di sini.
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
