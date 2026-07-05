import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Card } from '../../src/components/Card';
import { CustomHeader } from '../../src/components/CustomHeader';
import { Button } from '../../src/components/Button';
import { useLicenseStore } from '../../src/stores/license.store';
import { PrinterService } from '../../src/services/printer.service';
import { PrinterPaperSize, PrinterSettings } from '../../src/types/printer';

// ============================================================
// Premium gate hook
// ============================================================

function usePremiumStatus(): { isPremium: boolean; isChecking: boolean } {
  const status = useLicenseStore((s) => s.status);
  const refreshStatus = useLicenseStore((s) => s.refreshStatus);
  const [isChecking, setIsChecking] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await refreshStatus();
        if (active) setIsChecking(false);
      })();
      return () => { active = false; };
    }, [refreshStatus])
  );

  return { isPremium: status === 'premium_active' || status === 'lifetime', isChecking };
}

// ============================================================
// Locked view untuk akun Free
// ============================================================

function PremiumLockedView({ insets }: { insets: { top: number; bottom: number } }) {
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader title="Printer Struk" onBack={() => router.back()} />
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Lock icon */}
        <View style={styles.lockSection}>
          <View style={styles.lockIconCircle}>
            <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.lockTitle}>Printer Struk adalah fitur Premium</Text>
          <Text style={styles.lockDescription}>
            Aktifkan Premium untuk menghubungkan printer thermal Bluetooth dan mencetak struk transaksi.
          </Text>
        </View>

        {/* Manfaat */}
        <Card style={styles.benefitCard}>
          <Text style={styles.benefitTitle}>Keuntungan Printer Struk:</Text>
          {[
            { icon: 'print-outline', text: 'Cetak struk transaksi langsung dari aplikasi' },
            { icon: 'resize-outline', text: 'Mendukung format struk 58mm dan 80mm' },
            { icon: 'bluetooth-outline', text: 'Siap digunakan untuk printer thermal Bluetooth' },
            { icon: 'storefront-outline', text: 'Cocok untuk toko, warung, dan UMKM' },
          ].map((item, i) => (
            <View key={i} style={styles.benefitRow}>
              <Ionicons name={item.icon as any} size={18} color={colors.primary} />
              <Text style={styles.benefitText}>{item.text}</Text>
            </View>
          ))}
        </Card>

        {/* Tombol aktivasi */}
        <Button
          title="Aktifkan Premium"
          onPress={() => router.push('/settings/activation')}
          fullWidth
          icon={<Ionicons name="diamond-outline" size={20} color={colors.onPrimary} />}
        />
      </ScrollView>
    </View>
  );
}

// ============================================================
// Halaman pengaturan printer untuk Premium
// ============================================================

function PrinterSettingsView({ insets }: { insets: { top: number; bottom: number } }) {
  const router = useRouter();

  const [settings, setSettings] = useState<PrinterSettings>({
    paperSize: '58mm',
    autoPrintAfterSale: false,
    lastPrinterName: null,
    lastPrinterAddress: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<string>('Memeriksa status...');
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      const s = await PrinterService.getPrinterSettings();
      setSettings(s);
      const status = await PrinterService.getPrinterStatus();
      setPrinterStatus(status.message);
      setIsNativeAvailable(status.available);
    } catch {
      // Gunakan default
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  // Simpan pengaturan
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await PrinterService.savePrinterSettings(settings);
      Alert.alert('Berhasil', 'Pengaturan printer berhasil disimpan.');
    } catch (error: any) {
      Alert.alert('Gagal', error?.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  // Scan printer
  const handleScan = () => {
    Alert.alert(
      'Scan Printer Bluetooth',
      isNativeAvailable
        ? 'Memindai printer Bluetooth di sekitar...'
        : 'Scan printer Bluetooth akan tersedia pada development build.\n\nSaat ini Anda dapat menyiapkan pengaturan printer terlebih dahulu (ukuran kertas, auto print) untuk digunakan nanti.'
    );
  };

  // Test print
  const handleTestPrint = async () => {
    try {
      const result = await PrinterService.printTest();
      Alert.alert(
        'Preview Test Print',
        result,
        [
          { text: 'Tutup', style: 'cancel' },
          {
            text: 'Salin ke Log',
            onPress: () => {
              Alert.alert('Tersalin', 'Preview test print telah dicatat di log aplikasi.');
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Gagal', error?.message || 'Test print gagal.');
    }
  };

  // Ganti ukuran kertas
  const togglePaperSize = () => {
    setSettings((prev) => ({
      ...prev,
      paperSize: prev.paperSize === '58mm' ? '80mm' : '58mm',
    }));
  };

  // Toggle auto print
  const toggleAutoPrint = (value: boolean) => {
    setSettings((prev) => ({ ...prev, autoPrintAfterSale: value }));
  };

  if (!isLoaded) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <CustomHeader title="Printer Struk" onBack={() => router.back()} />
        <View style={styles.loadingFullScreen}>
          <Text style={styles.loadingText}>Memuat pengaturan...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader title="Printer Struk" onBack={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Header info */}
        <View style={styles.headerSection}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="print-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Pengaturan Printer Struk</Text>
          <Text style={styles.headerDescription}>
            Atur printer thermal untuk mencetak struk transaksi.
          </Text>
        </View>

        {/* Status printer */}
        <Card style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Status Printer</Text>
          <View style={styles.statusRow}>
            <Ionicons
              name={settings.lastPrinterName ? 'checkmark-circle' : 'time-outline'}
              size={18}
              color={settings.lastPrinterName ? colors.secondary : colors.onSurfaceVariant}
            />
            <Text style={styles.statusText}>{printerStatus}</Text>
          </View>
          {settings.lastPrinterName && (
            <View style={styles.printerInfoRow}>
              <Ionicons name="print-outline" size={16} color={colors.onSurfaceVariant} />
              <Text style={styles.printerInfoText}>
                {settings.lastPrinterName} ({settings.lastPrinterAddress})
              </Text>
            </View>
          )}
          {!isNativeAvailable && (
            <View style={styles.noteRow}>
              <Ionicons name="information-circle-outline" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.noteText}>
                Printer Bluetooth membutuhkan development build dan belum tersedia di Expo Go.
              </Text>
            </View>
          )}
        </Card>

        {/* Ukuran kertas */}
        <Card style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Ukuran Kertas</Text>
          <TouchableOpacity style={styles.optionRow} onPress={togglePaperSize}>
            <Ionicons name="resize-outline" size={22} color={colors.primary} />
            <View style={styles.optionTextArea}>
              <Text style={styles.optionLabel}>Lebar kertas printer</Text>
              <Text style={styles.optionValue}>
                {settings.paperSize === '58mm' ? '58 mm (struk kecil)' : '80 mm (struk besar)'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </Card>

        {/* Auto print */}
        <Card style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Cetak Otomatis</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchTextArea}>
              <Text style={styles.switchLabel}>Cetak otomatis setelah transaksi</Text>
              <Text style={styles.switchDescription}>
                Struk akan langsung dicetak setelah transaksi berhasil
              </Text>
            </View>
            <Switch
              value={settings.autoPrintAfterSale}
              onValueChange={toggleAutoPrint}
              trackColor={{ false: colors.outlineVariant, true: colors.secondary + '80' }}
              thumbColor={settings.autoPrintAfterSale ? colors.secondary : colors.onSurfaceVariant}
            />
          </View>
        </Card>

        {/* Printer terakhir */}
        <Card style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Printer Terakhir</Text>
          {settings.lastPrinterName ? (
            <View style={styles.printerDetailRow}>
              <Ionicons name="bluetooth-outline" size={20} color={colors.secondary} />
              <View style={styles.printerDetailTextArea}>
                <Text style={styles.printerDetailName}>{settings.lastPrinterName}</Text>
                <Text style={styles.printerDetailAddress}>{settings.lastPrinterAddress}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Belum ada printer yang terhubung.</Text>
          )}
        </Card>

        {/* Tombol aksi */}
        <Card style={styles.actionCard}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleScan}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Scan Printer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleTestPrint}
            activeOpacity={0.7}
          >
            <Ionicons name="print-outline" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Test Print</Text>
          </TouchableOpacity>
        </Card>

        {/* Tombol simpan */}
        <Button
          title="Simpan Pengaturan"
          onPress={handleSave}
          fullWidth
          loading={isSaving}
          icon={<Ionicons name="save-outline" size={20} color={colors.onPrimary} />}
        />

        {/* Catatan */}
        <View style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={14} color={colors.onSurfaceVariant} />
          <Text style={styles.footerNoteText}>
            Tahap 1: Fondasi fitur printer. Pengaturan sudah dapat disimpan, tetapi native Bluetooth
            membutuhkan development build untuk berfungsi penuh.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================
// Root component
// ============================================================

export default function PrinterScreen() {
  const insets = useSafeAreaInsets();
  const { isPremium, isChecking } = usePremiumStatus();

  if (isChecking) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <CustomHeader title="Printer Struk" onBack={() => {}} />
        <View style={styles.loadingFullScreen}>
          <Text style={styles.loadingText}>Memeriksa status lisensi...</Text>
        </View>
      </View>
    );
  }

  if (!isPremium) {
    return <PremiumLockedView insets={insets} />;
  }

  return <PrinterSettingsView insets={insets} />;
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile, paddingBottom: 32 },

  // ── Locked / Premium upsell ──
  lockSection: { alignItems: 'center', paddingVertical: spacing.stackLg, marginBottom: spacing.stackMd },
  lockIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackMd,
  },
  lockTitle: { ...typography.headlineMobile, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackSm, textAlign: 'center', paddingHorizontal: spacing.stackMd },
  lockDescription: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.stackMd },
  benefitCard: { padding: spacing.stackMd, marginBottom: spacing.stackLg },
  benefitTitle: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackMd },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm, marginBottom: spacing.stackSm },
  benefitText: { flex: 1, ...typography.bodyMd, color: colors.onSurfaceVariant },

  // ── Active premium header ──
  headerSection: { alignItems: 'center', paddingVertical: spacing.stackLg, marginBottom: spacing.stackMd },
  headerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackSm,
  },
  headerTitle: { ...typography.headlineMobile, color: colors.onSurface, fontWeight: '700' },
  headerDescription: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.stackSm, lineHeight: 20 },

  // ── Loading ──
  loadingFullScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.stackMd },
  loadingText: { ...typography.bodyMd, color: colors.onSurfaceVariant },

  // ── Status card ──
  statusCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  sectionTitle: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackMd },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm, marginBottom: spacing.stackSm },
  statusText: { flex: 1, ...typography.bodyMd, color: colors.onSurfaceVariant },
  printerInfoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm, marginTop: spacing.stackSm },
  printerInfoText: { flex: 1, ...typography.labelSm, color: colors.onSurfaceVariant },

  // ── Settings card ──
  settingsCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: spacing.stackMd,
  },
  optionTextArea: { flex: 1 },
  optionLabel: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  optionValue: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd },
  switchTextArea: { flex: 1 },
  switchLabel: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  switchDescription: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },

  // ── Printer info ──
  printerDetailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  printerDetailTextArea: { flex: 1 },
  printerDetailName: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  printerDetailAddress: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontStyle: 'italic' },

  // ── Action buttons ──
  actionCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    padding: spacing.stackMd,
    marginBottom: spacing.stackSm,
  },
  actionButtonText: { ...typography.bodyMd, color: colors.primary, fontWeight: '600' },

  // ── Notes ──
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.stackSm, marginTop: spacing.stackMd },
  noteText: { flex: 1, ...typography.labelSm, color: colors.onSurfaceVariant, lineHeight: 16 },
  footerNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.stackSm, marginTop: spacing.stackLg, paddingHorizontal: spacing.stackSm },
  footerNoteText: { flex: 1, ...typography.labelSm, color: colors.onSurfaceVariant, lineHeight: 16 },
});
