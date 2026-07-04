import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../src/config/theme';
import { Card } from '../../src/components/Card';
import { CustomHeader } from '../../src/components/CustomHeader';
import { Button } from '../../src/components/Button';
import { AppModal } from '../../src/components/ui/AppModal';
import { AppButton } from '../../src/components/ui/AppButton';
import { RestoreProgressModal } from '../../src/components/ui/RestoreProgressModal';
import { useLicenseStore } from '../../src/stores/license.store';
import { BackupService } from '../../src/services/backup.service';
import { usePremiumLogin } from '../../src/hooks/usePremiumLogin';

// ============================================================
// Premium gate check
// ============================================================

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
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
      >
        <View style={styles.lockSection}>
          <View style={styles.lockIconCircle}>
            <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.lockTitle}>Fitur Premium</Text>
          <Text style={styles.lockDescription}>
            Lindungi data kasir Anda dengan backup cloud. Data produk, pelanggan, transaksi, bon,
            dan stok dapat dicadangkan ke cloud dan dipulihkan saat ganti perangkat.
          </Text>
        </View>

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
// Halaman aktif untuk akun Premium
// ============================================================

function PremiumCloudBackupView({ insets }: { insets: { top: number; bottom: number } }) {
  const router = useRouter();

  const source = useLicenseStore((s) => s.source);
  const premiumEmail = useLicenseStore((s) => s.premiumEmail);
  const premiumPhone = useLicenseStore((s) => s.premiumPhone);
  const premiumName = useLicenseStore((s) => s.premiumName);
  const lastBackupAt = useLicenseStore((s) => s.lastBackupAt);
  const canRestoreCloudBackup = useLicenseStore((s) => s.canRestoreCloudBackup);
  const canUseCloudBackup = useLicenseStore((s) => s.canUseCloudBackup);

  const isPremiumAccount = source === 'account';
  const isManualFallback = source === 'manual_fallback';

  // ── Backup state ──
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showBackupSuccessModal, setShowBackupSuccessModal] = useState(false);
  const [showBackupErrorModal, setShowBackupErrorModal] = useState(false);
  const [backupErrorMessage, setBackupErrorMessage] = useState('');

  // ── Connect account modal (manual fallback) ──
  const [showConnectAccountModal, setShowConnectAccountModal] = useState(false);

  // ── Login modal ──
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [showLoginErrorModal, setShowLoginErrorModal] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState('');

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
    checkBackupAfterLogin,
  } = usePremiumLogin();

  // ── Backup ──
  const handleBackup = async () => {
    if (!canUseCloudBackup()) return;
    setIsBackingUp(true);
    try {
      await BackupService.backupToCloud();
      useLicenseStore.setState({ lastBackupAt: new Date().toISOString() });
      setShowBackupSuccessModal(true);
    } catch (error: any) {
      setBackupErrorMessage(error?.message || 'Gagal membuat backup cloud. Coba lagi nanti.');
      setShowBackupErrorModal(true);
    } finally {
      setIsBackingUp(false);
    }
  };

  // ── Restore — pakai data akun yang sudah tersimpan di store ──
  const handleRestore = useCallback(() => {
    if (!canRestoreCloudBackup()) {
      setShowConnectAccountModal(true);
      return;
    }
    // Cek backup menggunakan phone/email akun yang sudah login
    checkBackupAfterLogin({
      phone: premiumPhone,
      email: premiumEmail,
    });
  }, [canRestoreCloudBackup, checkBackupAfterLogin, premiumPhone, premiumEmail]);

  // ── Login untuk hubungkan akun dari manual fallback ──
  const handleLoginPremium = async () => {
    if (!loginInput.trim()) return;
    const result = await login({ phoneOrEmail: loginInput.trim() });
    if (!result.success) {
      setShowLoginModal(false);
      setLoginInput('');
      setLoginErrorMessage(result.message || 'Email atau nomor HP tidak ditemukan.');
      setShowLoginErrorModal(true);
      return;
    }
    setShowLoginModal(false);
    setLoginInput('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader title="Cadangan Data Cloud" onBack={() => router.back()} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="cloud-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Cadangan Data Cloud</Text>
          <Text style={styles.headerDescription}>
            Backup data kasir ke cloud agar aman saat perangkat rusak, hilang, atau saat ganti HP.
          </Text>
        </View>

        {/* ── Case: Manual Fallback — belum terhubung akun ── */}
        {isManualFallback && (
          <Card style={[styles.infoCard, styles.infoCardWarning]}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="key-outline" size={20} color={colors.primary} />
              <Text style={styles.infoCardTitle}>Premium Aktif via Kode Lisensi</Text>
            </View>
            <Text style={styles.infoCardDesc}>
              Fitur Premium sudah aktif di perangkat ini. Untuk backup dan restore cloud saat
              pindah perangkat, hubungkan akun Premium Anda.
            </Text>
            <AppButton
              title="Hubungkan Akun Premium"
              onPress={() => setShowLoginModal(true)}
              variant="primary"
              fullWidth
              size="md"
              icon={<Ionicons name="log-in-outline" size={18} color={colors.onPrimary} />}
            />
          </Card>
        )}

        {/* ── Case: Premium Account aktif ── */}
        {isPremiumAccount && (
          <>
            {/* Info akun */}
            <Card style={styles.accountCard}>
              <View style={styles.accountRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{premiumName || 'Akun Premium'}</Text>
                  <Text style={styles.accountSub}>
                    {premiumEmail || premiumPhone || 'Akun Premium Aktif'}
                  </Text>
                </View>
              </View>
              <View style={styles.lastBackupRow}>
                <Ionicons name="time-outline" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.lastBackupText}>
                  {lastBackupAt
                    ? `Backup terakhir: ${new Date(lastBackupAt).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}`
                    : 'Belum pernah backup'}
                </Text>
              </View>
            </Card>

            {/* Tombol aksi */}
            <Card style={styles.actionCard}>
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
                  disabled={isBackingUp || isRestoring || restoreState === 'checking_backup'}
                >
                  {restoreState === 'checking_backup' || isRestoring ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Ionicons name="cloud-download-outline" size={22} color={colors.onPrimary} />
                  )}
                  <Text style={styles.actionBtnText}>
                    {restoreState === 'checking_backup'
                      ? 'Mencari backup...'
                      : isRestoring
                      ? 'Merestore...'
                      : 'Restore dari Cloud'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            <View style={styles.noteRow}>
              <Ionicons name="information-circle-outline" size={16} color={colors.onSurfaceVariant} />
              <Text style={styles.noteText}>
                Restore akan mengganti semua data lokal dengan data dari backup cloud terbaru.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Modal: Backup Berhasil ── */}
      <AppModal
        visible={showBackupSuccessModal}
        onClose={() => setShowBackupSuccessModal(false)}
        type="success"
        title="Backup Berhasil"
        icon="checkmark-circle"
        message="Data toko berhasil dicadangkan ke cloud."
        primaryAction={{
          label: 'OK',
          onPress: () => setShowBackupSuccessModal(false),
          variant: 'primary',
        }}
      />

      {/* ── Modal: Backup Gagal ── */}
      <AppModal
        visible={showBackupErrorModal}
        onClose={() => setShowBackupErrorModal(false)}
        type="warning"
        title="Backup Gagal"
        icon="alert-circle"
        message={backupErrorMessage}
        primaryAction={{
          label: 'Tutup',
          onPress: () => setShowBackupErrorModal(false),
          variant: 'primary',
        }}
      />

      {/* ── Modal: Backup Ditemukan ── */}
      <AppModal
        visible={restoreState === 'backup_found'}
        onClose={skipRestore}
        type="info"
        title="Pulihkan Data?"
        icon="cloud-download"
        message={restoreMessage}
        primaryAction={{
          label: isRestoring ? 'Memulihkan...' : 'Restore Sekarang',
          onPress: executeRestore,
          variant: 'primary',
          loading: isRestoring,
        }}
        secondaryAction={{
          label: 'Lewati Dulu',
          onPress: skipRestore,
          variant: 'outline',
        }}
      >
        {backupInfo && (
          <View style={styles.backupDetail}>
            {backupInfo.storeName && (
              <Text style={styles.backupText}>Toko: {backupInfo.storeName}</Text>
            )}
            <Text style={styles.backupText}>
              Backup: {new Date(backupInfo.createdAt).toLocaleDateString('id-ID')}
            </Text>
            <Text style={styles.backupText}>
              Data: {backupInfo.recordCounts.products || 0} produk,{' '}
              {backupInfo.recordCounts.customers || 0} pelanggan
            </Text>
          </View>
        )}
      </AppModal>

      {/* ── Modal: Konfirmasi Overwrite ── */}
      <AppModal
        visible={restoreState === 'confirm_overwrite'}
        onClose={skipRestore}
        type="warning"
        title="Timpa Data Lokal?"
        icon="warning"
        message={restoreMessage}
        primaryAction={{
          label: isRestoring ? 'Memulihkan...' : 'Restore',
          onPress: executeRestore,
          variant: 'danger',
          loading: isRestoring,
        }}
        secondaryAction={{
          label: 'Batal',
          onPress: skipRestore,
          variant: 'outline',
        }}
      >
        {backupInfo && (
          <View style={styles.backupDetail}>
            {backupInfo.storeName && (
              <Text style={styles.backupText}>Toko: {backupInfo.storeName}</Text>
            )}
            <Text style={styles.backupText}>
              Backup: {new Date(backupInfo.createdAt).toLocaleDateString('id-ID')}
            </Text>
            <Text style={styles.backupText}>
              Data: {backupInfo.recordCounts.products || 0} produk,{' '}
              {backupInfo.recordCounts.customers || 0} pelanggan
            </Text>
          </View>
        )}
      </AppModal>

      {/* ── Modal: Restore Berhasil ── */}
      <AppModal
        visible={restoreState === 'restore_success'}
        onClose={resetRestoreFlow}
        type="success"
        title="Restore Berhasil"
        icon="checkmark-circle"
        message="Data toko berhasil dipulihkan ke perangkat ini."
        primaryAction={{
          label: 'OK',
          onPress: resetRestoreFlow,
          variant: 'primary',
        }}
      />

      {/* ── Modal: Restore Gagal ── */}
      <AppModal
        visible={restoreState === 'restore_error'}
        onClose={resetRestoreFlow}
        type="warning"
        title="Restore Gagal"
        icon="alert-circle"
        message={restoreMessage || 'Data belum berhasil dipulihkan. Coba lagi atau hubungi admin AdaKasir.'}
        primaryAction={{
          label: 'Coba Lagi',
          onPress: executeRestore,
          variant: 'primary',
          loading: isRestoring,
        }}
        secondaryAction={{
          label: 'Tutup',
          onPress: resetRestoreFlow,
          variant: 'outline',
        }}
      />

      {/* ── Modal: Tidak Ada Backup ── */}
      <AppModal
        visible={restoreState === 'no_backup'}
        onClose={resetRestoreFlow}
        type="info"
        title="Backup Tidak Ditemukan"
        icon="cloud-offline-outline"
        message={restoreMessage || 'Belum ada backup data yang ditemukan untuk akun Premium ini.'}
        primaryAction={{
          label: 'OK',
          onPress: resetRestoreFlow,
          variant: 'primary',
        }}
      />

      {/* ── Modal: Hubungkan Akun Premium (manual fallback) ── */}
      <AppModal
        visible={showConnectAccountModal}
        onClose={() => setShowConnectAccountModal(false)}
        type="info"
        title="Hubungkan Akun Premium"
        icon="cloud-offline-outline"
        message="Restore cloud membutuhkan akun Premium. Anda sudah mengaktifkan Premium menggunakan kode lisensi, tetapi belum login ke akun Premium. Silakan login dengan email atau nomor WhatsApp yang terdaftar agar backup cloud dapat ditemukan."
        primaryAction={{
          label: 'Login Premium',
          onPress: () => { setShowConnectAccountModal(false); setShowLoginModal(true); },
          variant: 'primary',
        }}
        secondaryAction={{
          label: 'Nanti',
          onPress: () => setShowConnectAccountModal(false),
          variant: 'outline',
        }}
      />

      {/* ── Modal: Login Premium ── */}
      <AppModal
        visible={showLoginModal}
        onClose={() => { setShowLoginModal(false); setLoginInput(''); }}
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
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
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

      {/* ── Modal: Login Error ── */}
      <AppModal
        visible={showLoginErrorModal}
        onClose={() => setShowLoginErrorModal(false)}
        type="warning"
        title="Login Gagal"
        icon="alert-circle"
        message={loginErrorMessage}
        primaryAction={{
          label: 'Tutup',
          onPress: () => setShowLoginErrorModal(false),
          variant: 'primary',
        }}
      />

      <RestoreProgressModal progress={restoreProgress} />
    </View>
  );
}

// ============================================================
// Root component — gate by premium status
// ============================================================

export default function CloudBackupScreen() {
  const insets = useSafeAreaInsets();
  const { isPremium, isChecking } = usePremiumStatus();

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

  // ── Locked ──
  lockSection: { alignItems: 'center', paddingVertical: spacing.stackLg, marginBottom: spacing.stackMd },
  lockIconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.stackMd,
  },
  lockTitle: { ...typography.headlineMobile, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackSm },
  lockDescription: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.stackMd },
  benefitCard: { padding: spacing.stackMd, marginBottom: spacing.stackLg },
  benefitTitle: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackMd },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm, marginBottom: spacing.stackSm },
  benefitText: { flex: 1, ...typography.bodyMd, color: colors.onSurfaceVariant },

  // ── Header ──
  headerSection: { alignItems: 'center', paddingVertical: spacing.stackLg, marginBottom: spacing.stackMd },
  headerIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.stackSm,
  },
  headerTitle: { ...typography.headlineMobile, color: colors.onSurface, fontWeight: '700' },
  headerDescription: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.stackSm, lineHeight: 20 },

  // ── Loading ──
  loadingFullScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.stackMd },
  loadingText: { ...typography.bodyMd, color: colors.onSurfaceVariant },

  // ── Info card (manual fallback) ──
  infoCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  infoCardWarning: {
    borderWidth: 1,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primaryFixed + '30',
  },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm, marginBottom: spacing.stackSm },
  infoCardTitle: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700' },
  infoCardDesc: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd, lineHeight: 20 },

  // ── Account card ──
  accountCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  accountInfo: { flex: 1 },
  accountName: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700' },
  accountSub: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },

  // ── Action buttons ──
  actionCard: { padding: spacing.stackMd, marginBottom: spacing.stackMd },
  actionRow: { flexDirection: 'row', gap: spacing.stackSm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.stackSm, paddingVertical: spacing.stackMd,
    borderRadius: borderRadius.md, minHeight: spacing.touchTargetMin,
  },
  actionBtnText: { ...typography.labelSm, color: colors.onPrimary, fontWeight: '700' },

  // ── Note ──
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.stackSm, paddingHorizontal: spacing.stackSm },
  noteText: { flex: 1, ...typography.labelSm, color: colors.onSurfaceVariant, lineHeight: 18 },

  // ── Last backup ──
  lastBackupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: spacing.stackSm, paddingTop: spacing.stackSm,
    borderTopWidth: 1, borderTopColor: colors.outlineVariant,
  },
  lastBackupText: { ...typography.labelSm, color: colors.onSurfaceVariant },

  // ── Backup detail (dalam modal) ──
  backupDetail: {
    width: '100%', backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12, padding: spacing.stackMd, marginBottom: 16, gap: 4,
  },
  backupText: { ...typography.bodyMd, color: colors.onSurface },

  // ── Login input ──
  inputRow: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: colors.surfaceContainerLow, borderRadius: 12,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.stackMd,
    marginBottom: 16,
  },
  input: { flex: 1, ...typography.bodyLg, color: colors.onSurface, paddingVertical: 0 },
});
