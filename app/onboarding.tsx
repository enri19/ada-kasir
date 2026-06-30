import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, borderRadius } from '../src/config/theme';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { Card } from '../src/components/Card';
import { useAppStore } from '../src/stores/app.store';
import { StoreRepository } from '../src/database/store.repo';
import { CategoryRepository } from '../src/database/category.repo';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setIsOnboardingComplete = useAppStore((state) => state.setIsOnboardingComplete);
  const setActiveStore = useAppStore((state) => state.setActiveStore);

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses ke galeri foto');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleStartSelling = async () => {
    if (!name.trim()) {
      alert('Nama warung harus diisi');
      return;
    }

    if (!agreedToTerms) {
      alert('Anda harus menyetujui Syarat & Ketentuan');
      return;
    }

    try {
      const store = await StoreRepository.create({
        name: name.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        receiptNote: 'Terima kasih atas kunjungan Anda.',
      });

      // Seed default categories
      await CategoryRepository.seedDefaultCategories();

      if (logoUri) {
        await StoreRepository.update(store.id, { name: store.name });
      }

      setActiveStore(store);
      setIsOnboardingComplete(true);
      router.replace('/(tabs)');
    } catch (error) {
      alert('Gagal menyimpan data toko: ' + (error as Error).message);
    }
  };

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
        {/* Logo Upload */}
        <View style={styles.logoUpload}>
          <Text style={styles.label}>Logo Warung (Opsional)</Text>
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
          placeholder="+62 8123456789"
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
            Saya menyetujui <Text style={styles.termsLink}>Syarat & Ketentuan</Text> serta Kebijakan Privasi Warung Madura.
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Mulai Berjualan"
            onPress={handleStartSelling}
            size="lg"
            fullWidth
          />
        </View>
      </Card>

      {/* Help Footer */}
      <Text style={styles.footer}>
        Butuh bantuan dalam setup?{' '}
        <Text style={styles.footerLink}>Hubungi Support</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.marginMobile,
  },
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
  title: {
    ...typography.headlineLg,
    color: colors.primary,
    marginBottom: spacing.stackSm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  form: {
    padding: spacing.stackMd,
    marginBottom: spacing.stackLg,
  },
  logoUpload: {
    alignItems: 'center',
    marginBottom: spacing.stackLg,
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.stackSm,
    alignSelf: 'flex-start',
  },
  logoBox: {
    width: 100,
    height: 100,
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
  footer: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '700',
  },
});
