import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { CustomerRepository } from '../../src/database/customer.repo';

export default function TambahPelangganScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Nama pelanggan harus diisi');
      return;
    }

    setSaving(true);
    try {
      await CustomerRepository.create({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: note.trim(),
      });
      Alert.alert('Berhasil', 'Pelanggan berhasil ditambahkan', [
        {
          text: 'OK',
          onPress: () => {
            if (returnTo === 'pembayaran') {
              router.back();
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Gagal menyimpan pelanggan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tambah Pelanggan</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={0}>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.label}>Nama Pelanggan *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Pak Haji Mansur"
            placeholderTextColor={colors.onSurfaceVariant}
          />

          <Text style={styles.label}>Nomor WhatsApp</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="08xxxxxxxxxx"
            placeholderTextColor={colors.onSurfaceVariant}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Alamat</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={address}
            onChangeText={setAddress}
            placeholder="Masukkan alamat pelanggan"
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Catatan</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={note}
            onChangeText={setNote}
            placeholder="Catatan tambahan (opsional)"
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </Card>

        <Button
          title="Simpan Pelanggan"
          onPress={handleSave}
          size="lg"
          fullWidth
          loading={saving}
          icon={<Ionicons name="person-add-outline" size={20} color={colors.onPrimary} />}
        />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, paddingVertical: spacing.stackMd,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  headerTitle: { ...typography.headlineMobile, color: colors.primary, fontWeight: '700' },
  content: { flex: 1 },
  contentContainer: { padding: spacing.marginMobile, paddingBottom: 100 },
  card: { padding: spacing.stackMd, marginBottom: spacing.stackLg },
  label: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm, marginTop: spacing.stackMd },
  input: {
    ...typography.bodyLg, color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackSm,
    minHeight: 48,
  },
  multilineInput: { minHeight: 80, paddingTop: spacing.stackMd },
});
