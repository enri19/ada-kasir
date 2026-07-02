import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Card } from '../../src/components/Card';
import { CustomHeader } from '../../src/components/CustomHeader';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { useLicenseStore } from '../../src/stores/license.store';
import { BackupService } from '../../src/services/backup.service';
import { signIn, signUp, signOut } from '../../src/services/supabase.client';
import { BackupStatus } from '../../src/types/backup';

// ============================================================
// Premium gate check
// ============================================================

/**
 * Cloud Backup hanya tersedia untuk akun Premium (premium_active).
 * Lifetime, trial, expired tidak bisa mengakses fitur ini.
 *
 * `refreshStatus` dipanggil saat halaman difokuskan agar status premium
 * selalu up-to-date.
 *
 * Mengembalikan { isPremium, isChecking } agar halaman bisa menampilkan
 * loading state selama pengecekan awal, bukan langsung locked view.
 */
function usePremiumStatus(): { isPremium: boolean; isChecking: boolean } {
  const status = useLicenseStore((s) => s.status);
  const refreshStatus = useLicenseStore((s) => s.refreshStatus);
  const [isChecking, setIsChecking] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        await refreshStatus();
        if (active) setIsChecking(false);
      })();
      return () => { active = false; };
    }, [refreshStatus])
  );

  return { isPremium: status === 'premium_active', isChecking };
}

// ============================================================
// Locked page untuk akun Free / non-Premium
// ============================================================

function PremiumLockedView({ insets }: { insets: { top: number; bottom: number } }) {
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader title="Cadangan Data Cloud" onBack={() => router.back()} />
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Lock icon */}
        <View style={styles.lockSection}>
          <View style={styles.lockIconCircle}>
            <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.lockTitle}>Fitur Premium</Text>
          <Text style={styles.lockDescription}>
            Lindungi data kasir Anda dengan backup cloud. Data produk, pelanggan, transaksi, bon, dan stok
            dapat dicadangkan ke cloud dan dipulihkan saat ganti perangkat.
          </Text>
        </View>

        {/* Manfaat */}
        <Card style={styles.benefitCard}>
          <Text style={styles.benefitTitle}>Manfaat Cadangan Data Cloud:</Text>
          {[
            { icon: 'shield-checkmark-outline', text: 'Data lebih aman saat HP rusak atau hilang' },
            { icon: 'phone-portrait-outline', text: 'Restore data saat ganti perangkat' },
            { icon: 'server-outline', text: 'Backup produk, pelanggan, transaksi, bon, dan stok' },
            { icon: 'wifi-outline', text: 'Tetap offline-first, cloud hanya untuk cadangan' },
          ].map((item, i) => (
            <View key={i} style={styles.benefitRow}>
              <Ionicons name={item.icon as any} size={18} color={colors.primary} />
              <Text style={styles.benefitText}>{item.text}</Text>
            </View>
          ))}
        </Card>

        {/* Tombol aktivasi lisensi */}
        <Button
          title="Aktifkan Lisensi"
          onPress={() => router.push('/settings/account')}
          fullWidth
          icon={<Ionicons name="diamond-outline" size={20} color={colors.onPrimary} />}
        />
      </ScrollView>
    </View>
  );
}

// ============================================================
// Halaman aktif untuk akun Premium
// ============================================================

function PremiumCloudBackupView({ insets }: { insets: { top: number; bottom: number } }) {
  const router = useRouter();

  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [isCheckingBackup, setIsCheckingBackup] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [isCloudLoggingIn, setIsCloudLoggingIn] = useState(false);
  const [showCloudLogin, setShowCloudLogin] = useState(false);

  const loadBackupStatus = async () => {
    try {
      const status = await BackupService.getBackupStatus();
      setBackupStatus(status);
      if (status.isLoggedIn) {
        setShowCloudLogin(false);
      }
    } catch {
      // Ignore
    } finally {
      setIsCheckingBackup(false);
    }
  };

  // Refresh status cloud setiap kali halaman difokuskan
  useFocusEffect(
    React.useCallback(() => {
      loadBackupStatus();
    }, [])
  );

  const handleCloudLogin = async () => {
    if (!cloudEmail.trim() || !cloudPassword.trim()) {
      Alert.alert('Input diperlukan', 'Masukkan email dan password.');
      return;
    }
    if (cloudPassword.length < 6) {
      Alert.alert('Password terlalu pendek', 'Password minimal 6 karakter.');
      return;
    }

    setIsCloudLoggingIn(true);
    try {
      const { error } = await signIn(cloudEmail.trim(), cloudPassword);
      if (error) {
        Alert.alert('Login Gagal', error.message);
        return;
      }
      setCloudEmail('');
      setCloudPassword('');
      setShowCloudLogin(false);
      await loadBackupStatus();
      Alert.alert('Berhasil', 'Login ke akun cloud berhasil.');
    } catch (err: any) {
      Alert.alert('Gagal', err?.message || 'Terjadi kesalahan saat login.');
    } finally {
      setIsCloudLoggingIn(false);
    }
  };

  const handleCloudRegister = async () => {
    if (!cloudEmail.trim() || !cloudPassword.trim()) {
      Alert.alert('Input diperlukan', 'Masukkan email dan password.');
      return;
    }
    if (cloudPassword.length < 6) {
      Alert.alert('Password terlalu pendek', 'Password minimal 6 karakter.');
      return;
    }

    setIsCloudLoggingIn(true);
    try {
      const { error } = await signUp(cloudEmail.trim(), cloudPassword);
      if (error) {
        Alert.alert('Registrasi Gagal', error.message);
        return;
      }
      Alert.alert(
        'Registrasi Berhasil',
        'Akun berhasil dibuat. Silakan cek email Anda untuk verifikasi (jika diperlukan), lalu login.'
      );
      setCloudEmail('');
      setCloudPassword('');
    } catch (err: any) {
      Alert.alert('Gagal', err?.message || 'Terjadi kesalahan saat registrasi.');
    } finally {
      setIsCloudLoggingIn(false);
    }
  };

  const handleCloudLogout = async () => {
    try {
      await signOut();
      setBackupStatus(null);
      setShowCloudLogin(false);
      Alert.alert('Berhasil', 'Berhasil logout dari akun cloud.');
      await loadBackupStatus();
    } catch {
      Alert.alert('Gagal', 'Terjadi kesalahan saat logout.');
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const result = await BackupService.backupToCloud();
      if (result) {
        await loadBackupStatus();
        Alert.alert('Backup Berhasil', 'Backup cloud berhasil.');
      }
    } catch (error: any) {
      Alert.alert('Backup Gagal', error?.message || 'Gagal membuat backup cloud. Coba lagi nanti.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore Data?',
      'Restore dari cloud akan mengganti data lokal saat ini dengan data dari backup terakhir. Pastikan Anda sudah memahami risikonya. Lanjutkan restore?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Lanjutkan Restore',
          style: 'destructive',
          onPress: async () => {
            setIsRestoring(true);
            try {
              const result = await BackupService.restoreFromCloud();
              if (result) {
                await loadBackupStatus();
                Alert.alert('Restore Berhasil', 'Restore cloud berhasil.');
              }
            } catch (error: any) {
              Alert.alert(
                'Restore Gagal',
                error?.message || 'Gagal restore data cloud. Periksa koneksi internet dan akun Anda.'
              );
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader title="Cadangan Data Cloud" onBack={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Header info */}
        <View style={styles.headerSection}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="cloud-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Cadangan Data Cloud</Text>
          <Text style={styles.headerDescription}>
            Backup data kasir ke cloud agar aman saat perangkat rusak, hilang, atau saat ganti HP.
          </Text>
        </View>

        {isCheckingBackup ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Memeriksa status cloud...</Text>
          </View>
        ) : (
          <>
            {/* ── Status card ── */}
            <Card style={styles.statusCard}>
              <Text style={styles.statusCardTitle}>Status Cloud</Text>

              {/* Cloud configured */}
              <View style={styles.statusItem}>
                <Ionicons
                  name={backupStatus?.isConfigured ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={backupStatus?.isConfigured ? colors.secondary : colors.error}
                />
                <Text style={styles.statusItemText}>
                  {backupStatus?.isConfigured ? 'Cloud dikonfigurasi' : 'Cloud belum dikonfigurasi'}
                </Text>
              </View>

              {/* Internet */}
              <View style={styles.statusItem}>
                <Ionicons
                  name={backupStatus?.isOnline ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={backupStatus?.isOnline ? colors.secondary : colors.error}
                />
                <Text style={styles.statusItemText}>
                  {backupStatus?.isOnline ? 'Terhubung ke internet' : 'Tidak ada koneksi internet'}
                </Text>
              </View>

              {/* Cloud account */}
              <View style={styles.statusItem}>
                <Ionicons
                  name={backupStatus?.isLoggedIn ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={backupStatus?.isLoggedIn ? colors.secondary : colors.error}
                />
                <Text style={styles.statusItemText}>
                  {backupStatus?.isLoggedIn
                    ? `Akun: ${backupStatus.userEmail || 'Terhubung'}`
                    : 'Belum login ke akun cloud'}
                </Text>
              </View>

              {/* Last backup */}
              {backupStatus?.hasLastBackup && backupStatus.lastBackup && (
                <View style={styles.statusItem}>
                  <Ionicons name="time-outline" size={18} color={colors.onSurfaceVariant} />
                  <Text style={styles.statusItemText}>
                    Backup terakhir:{' '}
                    {new Date(backupStatus.lastBackup.lastBackupAt).toLocaleString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
            </Card>

            {/* ── Not configured / not online / not logged in → info + login ── */}
            {backupStatus?.isConfigured === false ? (
              <View style={styles.infoRow}>
                <Ionicons name="warning-outline" size={20} color={colors.error} />
                <Text style={styles.infoText}>
                  Cloud belum dikonfigurasi. Periksa Supabase URL dan Anon Key.
                </Text>
              </View>
            ) : !backupStatus?.isOnline ? (
              <View style={styles.infoRow}>
                <Ionicons name="wifi-outline" size={20} color={colors.error} />
                <Text style={styles.infoText}>
                  Tidak ada koneksi internet. Backup cloud membutuhkan internet.
                </Text>
              </View>
            ) : !backupStatus?.isLoggedIn ? (
              <View>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={20} color={colors.onSurfaceVariant} />
                  <Text style={styles.infoText}>Anda belum login ke akun cloud.</Text>
                </View>

                {showCloudLogin && (
                  <Card style={styles.loginCard}>
                    <Input
                      label="Email"
                      value={cloudEmail}
                      onChangeText={setCloudEmail}
                      placeholder="contoh@email.com"
                      keyboardType="email-address"
                      editable={!isCloudLoggingIn}
                    />
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Password</Text>
                      <TextInput
                        style={[styles.fieldInput, !isCloudLoggingIn && styles.fieldInputDisabled]}
                        value={cloudPassword}
                        onChangeText={setCloudPassword}
                        placeholder="Minimal 6 karakter"
                        secureTextEntry
                        editable={!isCloudLoggingIn}
                        placeholderTextColor={colors.onSurfaceVariant}
                      />
                    </View>
                    <View style={styles.loginButtonRow}>
                      <View style={styles.loginBtnWrapper}>
                        <Button
                          title="Login"
                          onPress={handleCloudLogin}
                          size="sm"
                          loading={isCloudLoggingIn}
                        />
                      </View>
                      <View style={styles.loginBtnWrapper}>
                        <Button
                          title="Daftar"
                          onPress={handleCloudRegister}
                          variant="outline"
                          size="sm"
                          loading={isCloudLoggingIn}
                        />
                      </View>
                    </View>
                  </Card>
                )}

                <View style={styles.loginToggleWrapper}>
                  <Button
                    title={showCloudLogin ? 'Batal' : 'Login / Daftar Akun Cloud'}
                    onPress={() => setShowCloudLogin(!showCloudLogin)}
                    variant="outline"
                    fullWidth
                    icon={<Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />}
                  />
                </View>
              </View>
            ) : (
              /* ── Sudah login → aksi backup/restore ── */
              <View>
                <Card style={styles.actionCard}>
                  {/* User info bar */}
                  <View style={styles.userBar}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.secondary} />
                    <Text style={styles.userEmail}>
                      {backupStatus.userEmail || 'Terhubung ke akun cloud'}
                    </Text>
                    <TouchableOpacity onPress={handleCloudLogout}>
                      <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Backup & Restore buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                      onPress={handleBackup}
                      disabled={isBackingUp || isRestoring}
                    >
                      {isBackingUp ? (
                        <ActivityIndicator size="small" color={colors.onPrimary} />
                      ) : (
                        <Ionicons name="cloud-upload-outline" size={22} color={colors.onPrimary} />
                      )}
                      <Text style={styles.actionBtnText}>
                        {isBackingUp ? 'Mencadangkan...' : 'Backup Sekarang'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.error }]}
                      onPress={handleRestore}
                      disabled={isBackingUp || isRestoring}
                    >
                      {isRestoring ? (
                        <ActivityIndicator size="small" color={colors.onPrimary} />
                      ) : (
                        <Ionicons name="cloud-download-outline" size={22} color={colors.onPrimary} />
                      )}
                      <Text style={styles.actionBtnText}>
                        {isRestoring ? 'Merestore...' : 'Restore dari Cloud'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>

                {/* Catatan */}
                <View style={styles.noteRow}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.onSurfaceVariant} />
                  <Text style={styles.noteText}>
                    Restore akan mengganti semua data lokal dengan data dari cloud backup terbaru.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================
// Root component — gate by premium status
// ============================================================

export default function CloudBackupScreen() {
  const insets = useSafeAreaInsets();
  const { isPremium, isChecking } = usePremiumStatus();

  // Loading state agar tidak flash tampilan locked saat pengecekan
  if (isChecking) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <CustomHeader title="Cadangan Data Cloud" onBack={() => {}} />
        <View style={styles.loadingFullScreen}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memeriksa status lisensi...</Text>
        </View>
      </View>
    );
  }

  if (!isPremium) {
    return <PremiumLockedView insets={insets} />;
  }

  return <PremiumCloudBackupView insets={insets} />;
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
  lockTitle: { ...typography.headlineMobile, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackSm },
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
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm, paddingVertical: spacing.stackLg },
  loadingFullScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.stackMd },
  loadingText: { ...typography.bodyMd, color: colors.onSurfaceVariant },

  // ── Status card ──
  statusCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  statusCardTitle: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackSm },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm, marginBottom: spacing.stackSm },
  statusItemText: { flex: 1, ...typography.labelSm, color: colors.onSurfaceVariant },

  // ── Info messages ──
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.stackSm, marginBottom: spacing.stackMd },
  infoText: { flex: 1, ...typography.labelSm, color: colors.onSurfaceVariant },

  // ── Login form ──
  loginCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  fieldContainer: { marginBottom: spacing.stackMd },
  fieldLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  fieldInput: {
    ...typography.bodyLg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm,
    color: colors.onSurface,
    minHeight: 48,
  },
  fieldInputDisabled: { backgroundColor: colors.surfaceContainer, color: colors.onSurfaceVariant },
  loginButtonRow: { flexDirection: 'row', gap: spacing.stackSm, marginTop: spacing.stackSm },
  loginBtnWrapper: { flex: 1 },
  loginToggleWrapper: { marginTop: spacing.stackSm },

  // ── Logged-in actions ──
  actionCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  userBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    paddingVertical: spacing.stackSm,
    paddingHorizontal: spacing.stackMd,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    marginBottom: spacing.stackMd,
  },
  userEmail: { flex: 1, ...typography.labelSm, color: colors.onSurface, fontWeight: '600' },
  logoutText: { ...typography.labelSm, color: colors.error, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: spacing.stackSm },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    paddingVertical: spacing.stackMd,
    borderRadius: borderRadius.md,
    minHeight: spacing.touchTargetMin,
  },
  actionBtnText: { ...typography.labelSm, color: colors.onPrimary, fontWeight: '700' },

  // ── Note ──
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.stackSm, paddingHorizontal: spacing.stackSm },
  noteText: { flex: 1, ...typography.labelSm, color: colors.onSurfaceVariant, lineHeight: 18 },
});
