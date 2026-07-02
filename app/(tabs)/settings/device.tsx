import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../../src/config/theme';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { useLicenseStore } from '../../../src/stores/license.store';
import Constants from 'expo-constants';
import { CustomHeader } from '../../../src/components/CustomHeader';
import { PrinterService } from '../../../src/services/printer.service';
import { PrinterDevice, PrinterConnectionStatus, PrinterConfig, PRINTER_SIZES } from '../../../src/types/printer';

export default function DeviceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const deviceCode = useLicenseStore((state) => state.deviceCode);

  // Printer state
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<PrinterConnectionStatus>('disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Load config & status on mount
  const loadPrinterState = useCallback(async () => {
    try {
      const config = await PrinterService.getConfig();
      setPrinterConfig(config);
      const status = await PrinterService.getConnectionStatus();
      setConnectionStatus(status);
    } catch {
      // Mock mode — ok
    }
  }, []);

  useEffect(() => {
    loadPrinterState();
  }, [loadPrinterState]);

  const getStatusLabel = (): string => {
    switch (connectionStatus) {
      case 'connected': return 'Terhubung';
      case 'disconnected': return 'Belum Terhubung';
      case 'connecting': return 'Menghubungkan...';
      case 'error': return 'Gagal Terhubung';
    }
  };

  const getStatusColor = (): string => {
    switch (connectionStatus) {
      case 'connected': return colors.secondary;
      case 'disconnected': return colors.error;
      case 'connecting': return '#FFA000';
      case 'error': return colors.error;
    }
  };

  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (connectionStatus) {
      case 'connected': return 'checkmark-circle';
      case 'disconnected': return 'close-circle';
      case 'connecting': return 'sync-circle';
      case 'error': return 'alert-circle';
    }
  };

  const handleScan = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Tidak Didukung', 'Fitur printer thermal hanya tersedia di Android.');
      return;
    }

    setIsScanning(true);
    setDevices([]);
    try {
      const printerList = await PrinterService.getAvailablePrinters();
      setDevices(printerList);

      if (printerList.length === 0) {
        Alert.alert('Tidak Ditemukan', 'Tidak ada printer Bluetooth yang ditemukan. Pastikan printer dalam keadaan menyala dan siap dipasangkan.');
      }
    } catch (error: any) {
      Alert.alert('Gagal Scan', error?.message || 'Tidak dapat memindai printer Bluetooth.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (address: string) => {
    setIsConnecting(true);
    setSelectedAddress(address);
    try {
      await PrinterService.connectPrinter(address);
      setConnectionStatus('connected');

      // Cari nama printer
      const device = devices.find((d) => d.address === address);
      if (device) {
        await PrinterService.setActivePrinter(device.name, address);
      }

      Alert.alert('Berhasil', 'Printer berhasil dihubungkan.');
    } catch (error: any) {
      setConnectionStatus('error');
      Alert.alert('Gagal Menghubungkan', error?.message || 'Gagal menghubungkan ke printer. Periksa koneksi Bluetooth.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await PrinterService.disconnectPrinter();
      setConnectionStatus('disconnected');
      setSelectedAddress(null);
      Alert.alert('Terputus', 'Printer berhasil diputuskan.');
    } catch {
      Alert.alert('Error', 'Gagal memutuskan koneksi printer.');
    }
  };

  const handleTestPrint = async () => {
    if (connectionStatus !== 'connected') {
      Alert.alert('Printer Belum Terhubung', 'Hubungkan printer terlebih dahulu sebelum test print.');
      return;
    }

    setIsTesting(true);
    try {
      const result = await PrinterService.testPrint();
      if (result.success) {
        Alert.alert('Berhasil', 'Test print berhasil. Periksa hasil cetakan di printer.');
      } else {
        Alert.alert('Gagal', result.message);
      }
    } catch (error: any) {
      Alert.alert('Gagal', error?.message || 'Test print gagal.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSwitchSize = async () => {
    if (!printerConfig) return;
    const currentIndex = PRINTER_SIZES.findIndex((s) => s.value === printerConfig.printerSize);
    const nextIndex = (currentIndex + 1) % PRINTER_SIZES.length;
    const nextSize = PRINTER_SIZES[nextIndex];
    const config = await PrinterService.saveConfig({
      ...printerConfig,
      printerSize: nextSize.value,
      characterWidth: nextSize.chars,
    });
    setPrinterConfig(printerConfig);
    await loadPrinterState();
    Alert.alert('Ukuran Printer', `Ukuran printer diubah ke ${nextSize.label}.`);
  };

  // ── Render ──
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <CustomHeader title="Perangkat" onBack={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Info Perangkat */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoLabel}>Nama Perangkat</Text>
          <Text style={styles.infoValue}>{Constants.deviceName || 'Perangkat'}</Text>

          <Text style={styles.infoLabel}>OS</Text>
          <Text style={styles.infoValue}>{Platform.OS.toUpperCase()}</Text>

          <Text style={styles.infoLabel}>Versi Aplikasi</Text>
          <Text style={styles.infoValue}>{Constants.manifest?.version || '1.0.0'}</Text>

          <Text style={styles.infoLabel}>Kode Perangkat</Text>
          <Text style={styles.infoValue}>{deviceCode || '-'}</Text>

          <View style={styles.statusRow}>
            <Text style={styles.infoLabel}>Status Printer</Text>
            <View style={styles.statusBadge}>
              <Ionicons name={getStatusIcon()} size={16} color={getStatusColor()} />
              <Text style={[styles.statusLabel, { color: getStatusColor() }]}>{getStatusLabel()}</Text>
            </View>
          </View>

          {printerConfig && printerConfig.printerName ? (
            <View style={styles.activePrinterRow}>
              <Ionicons name="print-outline" size={16} color={colors.onSurfaceVariant} />
              <Text style={styles.activePrinterText}>{printerConfig.printerName}</Text>
            </View>
          ) : null}
        </Card>

        {/* Ukuran Printer */}
        {printerConfig && (
          <Card style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Ukuran Printer</Text>
            <TouchableOpacity style={styles.sizeSelector} onPress={handleSwitchSize}>
              <Ionicons name="resize-outline" size={20} color={colors.primary} />
              <Text style={styles.sizeText}>
                {PRINTER_SIZES.find((s) => s.value === printerConfig.printerSize)?.label || '58 mm'}
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Tombol Aksi Printer */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Pengaturan Printer</Text>

          {/* Scan */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <Ionicons name="sync" size={20} color={colors.primary} />
            ) : (
              <Ionicons name="search-outline" size={20} color={colors.primary} />
            )}
            <Text style={styles.actionButtonText}>
              {isScanning ? 'Memindai...' : 'Cari Printer Bluetooth'}
            </Text>
          </TouchableOpacity>

          {/* Test Print — hanya aktif jika terhubung */}
          <TouchableOpacity
            style={[styles.actionButton, connectionStatus !== 'connected' && styles.actionButtonDisabled]}
            onPress={handleTestPrint}
            disabled={connectionStatus !== 'connected' || isTesting}
          >
            {isTesting ? (
              <Ionicons name="sync" size={20} color={connectionStatus !== 'connected' ? colors.onSurfaceVariant : colors.primary} />
            ) : (
              <Ionicons name="print-outline" size={20} color={connectionStatus !== 'connected' ? colors.onSurfaceVariant : colors.primary} />
            )}
            <Text style={[styles.actionButtonText, connectionStatus !== 'connected' && styles.actionButtonTextDisabled]}>
              {isTesting ? 'Mencetak...' : 'Test Print'}
            </Text>
          </TouchableOpacity>

          {/* Disconnect */}
          {connectionStatus === 'connected' && (
            <TouchableOpacity style={[styles.actionButton, styles.disconnectButton]} onPress={handleDisconnect}>
              <Ionicons name="link-outline" size={20} color={colors.error} />
              <Text style={[styles.actionButtonText, { color: colors.error }]}>Putuskan Koneksi</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Daftar Printer Ditemukan */}
        {devices.length > 0 && (
          <Card style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Printer Ditemukan ({devices.length})</Text>
            {devices.map((device) => (
              <TouchableOpacity
                key={device.address}
                style={[
                  styles.deviceItem,
                  selectedAddress === device.address && styles.deviceItemSelected,
                ]}
                onPress={() => handleConnect(device.address)}
                disabled={isConnecting}
              >
                <Ionicons
                  name={device.isPaired ? 'bluetooth' : 'bluetooth-outline'}
                  size={24}
                  color={selectedAddress === device.address ? colors.primary : colors.onSurface}
                />
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceAddress}>{device.address}</Text>
                  {device.isPaired && <Text style={styles.pairedBadge}>Sudah dipasangkan</Text>}
                </View>
                {isConnecting && selectedAddress === device.address ? (
                  <Ionicons name="sync" size={20} color={colors.primary} />
                ) : selectedAddress === device.address && connectionStatus === 'connected' ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
                )}
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Catatan */}
        {Platform.OS === 'android' && (
          <Card style={styles.noteCard}>
            <View style={styles.noteRow}>
              <Ionicons name="information-circle-outline" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.noteText}>
                Fitur printer thermal membutuhkan development build (APK), tidak berjalan di Expo Go.
                {'\n\n'}
                Untuk menggunakan printer sungguhan, jalankan:{'\n'}
                npx expo prebuild{'\n'}
                npx expo run:android
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { padding: spacing.marginMobile, paddingBottom: 32 },
  infoCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  infoLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: spacing.stackLg },
  infoValue: { ...typography.bodyLg, color: colors.onSurface, marginTop: spacing.stackSm },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.stackLg,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.stackSm, paddingVertical: 4,
    borderRadius: borderRadius.full, backgroundColor: colors.surfaceContainerLow,
  },
  statusLabel: { ...typography.labelSm, fontWeight: '700' },
  activePrinterRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm,
    marginTop: spacing.stackSm,
  },
  activePrinterText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  sectionTitle: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd },
  sizeSelector: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    padding: spacing.stackMd,
  },
  sizeText: { ...typography.bodyLg, color: colors.primary, fontWeight: '600' },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md,
    padding: spacing.stackMd, marginBottom: spacing.stackSm,
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: { ...typography.bodyMd, color: colors.primary, fontWeight: '600' },
  actionButtonTextDisabled: { color: colors.onSurfaceVariant },
  disconnectButton: { borderWidth: 1, borderColor: colors.error, backgroundColor: colors.errorContainer },
  deviceItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.stackSm, borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  deviceItemSelected: {
    backgroundColor: colors.primaryContainer + '20',
    borderRadius: borderRadius.md, paddingHorizontal: spacing.stackSm,
  },
  deviceInfo: { flex: 1, marginLeft: spacing.stackSm },
  deviceName: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  deviceAddress: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  pairedBadge: {
    ...typography.labelSm, color: colors.secondary, marginTop: 2,
  },
  noteCard: { padding: spacing.stackMd, marginTop: spacing.stackSm },
  noteRow: { flexDirection: 'row', gap: spacing.stackSm },
  noteText: { flex: 1, ...typography.labelSm, color: colors.onSurfaceVariant },
});
