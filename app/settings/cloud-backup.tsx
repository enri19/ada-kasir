import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
import { useCloudAccount } from '../../src/hooks/useCloudAccount';

// ============================================================
// Premium gate check
// ============================================================

function usePremiumStatus(): { isPremiumAccess: boolean; isChecking: boolean } {
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

  return { isPremiumAccess: status === 'premium_active', isChecking };
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
            Cloud Backup tersedia untuk pengguna Premium.{'\n'}
            Lindungi data kasir Anda dengan backup cloud.
          </Text>
        </View>

        <Card style={styles.benefitCard}>
          <Text style={styles.benefitTitle}>Manfaat Cadangan Data Cloud:</Text>
          {[
            { icon: 'shield-checkmark-outline', text: 'Data lebih aman saat HP rusak atau hilang' },
            { icon: 'phone-portrait-outline', text: 'Restore data saat ganti perangkat' },
            { icon: 'server-outline', text: 'Backup produk, pelanggan, transaksi, bon, dan stok' },
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
// Halaman untuk user Premium yang belum login akun cloud
// ============================================================

function CloudNotConnectedView({
  insets,
  onMasuk,
  onDaftar,
}: {
  insets: { top: number; bottom: number };
  onMasuk: () => void;
  onDaftar: () => void;
}) {
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CustomHeader title="Cadangan Data Cloud" onBack={() => router.back()} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
      >
        <View style={styles.headerSection}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="cloud-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Cadangan Data Cloud</Text>
          <Text style={styles.headerDescription}>
            Backup data kasir ke cloud agar aman saat perangkat rusak, hilang, atau saat ganti HP.
          </Text>
        </View>

        <Card style={styles.cloudPromptCard}>
          <View style={styles.cloudPromptIcon}>
            <Ionicons name="person-circle-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.cloudPromptTitle}>Masuk Akun Cloud</Text>
          <Text style={styles.cloudPromptDesc}>
            Akun Cloud digunakan untuk menyimpan dan memulihkan backup data AdaKasir.
          </Text>

          <AppButton
            title="Masuk Akun Cloud"
            onPress={onMasuk}
            variant="primary"
            fullWidth
            size="md"
            icon={<Ionicons name="log-in-outline" size={18} color={colors.onPrimary} />}
          />
          <View style={styles.cloudPromptSpacer} />
          <AppButton
            title="Daftar Akun Cloud"
            onPress={onDaftar}
            variant="outline"
            fullWidth
            size="md"
            icon={<Ionicons name="person-add-outline" size={18} color={colors.primary} />}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

// ============================================================
// Halaman aktif — Premium + sudah login akun cloud
// ============================================================

function CloudConnectedView({ insets }: { insets: { top: number; bottom: number } }) {
  const router = useRouter();

  const cloudEmail = useLicenseStore((s) => s.cloudEmail);
  const lastBackupAt = useLicenseStore((s) => s.lastBackupAt);
  const canUseCloudBackup = useLicenseStore((s) => s.canUseCloudBackup);

  // ── Silent sync: ambil lastBackupAt dari cloud saat mount/focus ──
  // Tidak trigger restore flow, hanya update info "Backup terakhir"
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        try {
          const backups = await BackupService.listCloudBackups();
          if (active && backups.length > 0) {
            useLicenseStore.setState({ lastBackupAt: backups[0].updatedAt || backups[0].createdAt });
          }
        } catch {
          // Silent fail — tidak mengganggu user
        }
      })();
      return () => { active = false; };
    }, [])
  );

  const {
    restoreState,
    restoreMessage,
    backupInfo,
    isRestoring,
    executeRestore,
    skipRestore,
    resetRestoreFlow,
    restoreProgress,
    logoutCloud,
    checkCloudBackup,
  } = useCloudAccount();

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showBackupSuccessModal, setShowBackupSuccessModal] = useState(false);
  const [showBackupErrorModal, setShowBackupErrorModal] = useState(false);
  const [backupErrorMessage, setBackupErrorMessage] = useState('');
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);

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

  // ── Restore ──
  const handleRestore = useCallback(() => {
    checkCloudBackup();
  }, [checkCloudBackup]);

  // ── Logout ──
  const handleLogoutCloud = async () => {
    setShowLogoutConfirmModal(false);
    await logoutCloud();
    resetRestoreFlow();
  };

  // ── Tentukan apakah perlu menampilkan tombol restore di UI ──
  // Termasuk 'checking_backup' agar tombol tetap tampil dengan spinner
  const shouldShowRestoreButton = !restoreState ||
    ['idle', 'checking_backup', 'no_backup', 'restore_success', 'restore_error', 'skipped'].includes(restoreState);

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
            <Ionicons name="cloud-done-outline" size={32} color={colors.secondary} />
          </View>
          <Text style={styles.headerTitle}>Cadangan Data Cloud</Text>
        </View>

        {/* Info akun cloud */}
        <Card style={styles.accountCard}>
          <View style={styles.accountRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>Akun Cloud Terhubung</Text>
              <Text style={styles.accountSub}>{cloudEmail || '-'}</Text>
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
              disabled={isBackingUp || isRestoring || !shouldShowRestoreButton}
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

            {/* Tombol restore hanya tampil jika memang ada backup dan belum dalam restore flow */}
            {shouldShowRestoreButton ? (
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
            ) : null}
          </View>

          {/* Logout link */}
          <TouchableOpacity
            style={styles.logoutLink}
            onPress={() => setShowLogoutConfirmModal(true)}
          >
            <Ionicons name="log-out-outline" size={14} color={colors.error} />
            <Text style={styles.logoutLinkText}>Logout Akun Cloud</Text>
          </TouchableOpacity>
        </Card>

        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.noteText}>
            Restore akan mengganti semua data lokal dengan data dari backup cloud terbaru.
          </Text>
        </View>
      </ScrollView>

      {/* ── Modals: Backup ── */}
      <AppModal
        visible={showBackupSuccessModal}
        onClose={() => setShowBackupSuccessModal(false)}
        type="success"
        title="Backup Berhasil"
        icon="checkmark-circle"
        message="Data toko berhasil dicadangkan ke cloud."
        primaryAction={{ label: 'OK', onPress: () => setShowBackupSuccessModal(false), variant: 'primary' }}
      />

      <AppModal
        visible={showBackupErrorModal}
        onClose={() => setShowBackupErrorModal(false)}
        type="warning"
        title="Backup Gagal"
        icon="alert-circle"
        message={backupErrorMessage}
        primaryAction={{ label: 'Tutup', onPress: () => setShowBackupErrorModal(false), variant: 'primary' }}
      />

      {/* ── Modal: Restore ── */}
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
        secondaryAction={{ label: 'Lewati Dulu', onPress: skipRestore, variant: 'outline' }}
      >
        {backupInfo && (
          <View style={styles.backupDetail}>
            <Text style={styles.backupText}>
              Backup: {new Date(backupInfo.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.backupText}>
              Data: {backupInfo.recordCounts.products || 0} produk,{' '}
              {backupInfo.recordCounts.customers || 0} pelanggan
            </Text>
          </View>
        )}
      </AppModal>

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
        secondaryAction={{ label: 'Lewati Dulu', onPress: skipRestore, variant: 'outline' }}
      >
        {backupInfo && (
          <View style={styles.backupDetail}>
            <Text style={styles.backupText}>
              Backup: {new Date(backupInfo.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.backupText}>
              Data: {backupInfo.recordCounts.products || 0} produk,{' '}
              {backupInfo.recordCounts.customers || 0} pelanggan
            </Text>
          </View>
        )}
      </AppModal>

      <AppModal
        visible={restoreState === 'restore_success'}
        onClose={resetRestoreFlow}
        type="success"
        title="Restore Berhasil"
        icon="checkmark-circle"
        message="Data toko berhasil dipulihkan ke perangkat ini."
        primaryAction={{ label: 'OK', onPress: resetRestoreFlow, variant: 'primary' }}
      />

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
        secondaryAction={{ label: 'Tutup', onPress: resetRestoreFlow, variant: 'outline' }}
      />

      <AppModal
        visible={restoreState === 'no_backup'}
        onClose={resetRestoreFlow}
        type="info"
        title="Backup Tidak Ditemukan"
        icon="cloud-offline-outline"
        message={restoreMessage || 'Belum ada backup data yang ditemukan untuk akun Cloud ini.'}
        primaryAction={{ label: 'OK', onPress: resetRestoreFlow, variant: 'primary' }}
      />

      <AppModal
        visible={restoreState === 'skipped'}
        onClose={resetRestoreFlow}
        type="info"
        title="Restore Dilewati"
        icon="information-circle"
        message="Anda dapat melakukan restore kapan saja dari halaman ini."
        primaryAction={{ label: 'OK', onPress: resetRestoreFlow, variant: 'primary' }}
      />

      {/* ── Modal: Logout Confirm ── */}
      <AppModal
        visible={showLogoutConfirmModal}
        onClose={() => setShowLogoutConfirmModal(false)}
        type="warning"
        title="Logout Akun Cloud"
        icon="log-out-outline"
        message="Anda akan logout dari akun cloud. Lisensi Premium di perangkat ini tetap aktif. Backup dan restore cloud tidak tersedia sampai login kembali."
        primaryAction={{
          label: 'Logout',
          onPress: handleLogoutCloud,
          variant: 'danger',
        }}
        secondaryAction={{
          label: 'Batal',
          onPress: () => setShowLogoutConfirmModal(false),
          variant: 'outline',
        }}
      />

      <RestoreProgressModal progress={restoreProgress} />
    </View>
  );
}

// ============================================================
// Modal Login
// ============================================================

function CloudLoginModal({
  visible,
  onClose,
  onSwitchToDaftar,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSwitchToDaftar: () => void;
  onSuccess: () => void;
}) {
  const { loginCloud, isLoggingIn } = useCloudAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');

    if (!email.trim()) {
      setError('Masukkan email Anda.');
      return;
    }
    if (!password) {
      setError('Masukkan password Anda.');
      return;
    }

    const result = await loginCloud(email.trim(), password);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onSuccess();
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      type="info"
      title="Masuk Akun Cloud"
      icon="log-in"
      message="Akun Cloud digunakan untuk menyimpan dan memulihkan backup data AdaKasir."
      primaryAction={{
        label: isLoggingIn ? 'Memproses...' : 'Masuk',
        onPress: handleLogin,
        variant: 'primary',
        loading: isLoggingIn,
      }}
      secondaryAction={{
        label: 'Daftar Akun Cloud',
        onPress: () => { handleClose(); onSwitchToDaftar(); },
        variant: 'ghost',
      }}
    >
      {/* Error message */}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@contoh.com"
          placeholderTextColor={colors.onSurfaceVariant}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoggingIn}
        />
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.onSurfaceVariant}
          secureTextEntry
          autoCapitalize="none"
          editable={!isLoggingIn}
        />
      </View>

      <TouchableOpacity style={styles.forgotLink}>
        <Text style={styles.forgotLinkText}>Lupa password?</Text>
      </TouchableOpacity>
    </AppModal>
  );
}

// ============================================================
// Modal Daftar
// ============================================================

function CloudRegisterModal({
  visible,
  onClose,
  onSwitchToLogin,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onSuccess: (message: string) => void;
}) {
  const { registerCloud, isRegistering } = useCloudAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');

    if (!email.trim()) {
      setError('Masukkan email Anda.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Format email tidak valid.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    const result = await registerCloud(email.trim(), password);
    if (!result.success) {
      setError(result.message);
      return;
    }

    onSuccess(result.message);
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      type="info"
      title="Daftar Akun Cloud"
      icon="person-add"
      message="Buat akun cloud untuk menyimpan backup data AdaKasir Anda."
      primaryAction={{
        label: isRegistering ? 'Mendaftarkan...' : 'Daftar',
        onPress: handleRegister,
        variant: 'primary',
        loading: isRegistering,
      }}
      secondaryAction={{
        label: 'Sudah punya akun? Masuk',
        onPress: () => { handleClose(); onSwitchToLogin(); },
        variant: 'outline',
      }}
    >
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.onSurfaceVariant}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isRegistering}
        />
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password (min. 6 karakter)"
          placeholderTextColor={colors.onSurfaceVariant}
          secureTextEntry
          autoCapitalize="none"
          editable={!isRegistering}
        />
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Konfirmasi Password"
          placeholderTextColor={colors.onSurfaceVariant}
          secureTextEntry
          autoCapitalize="none"
          editable={!isRegistering}
        />
      </View>
    </AppModal>
  );
}

// ============================================================
// Root component
// ============================================================

export default function CloudBackupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremiumAccess, isChecking } = usePremiumStatus();
  const isCloudLoggedIn = useLicenseStore((s) => s.isCloudLoggedIn);

  const {
    restoreState,
    restoreMessage,
    backupInfo,
    isRestoring,
    executeRestore,
    skipRestore,
    resetRestoreFlow,
  } = useCloudAccount();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ── Modal sukses — selalu di root, bukan di dalam conditional ──
  const successModal = (
    <AppModal
      visible={showSuccessModal}
      onClose={() => setShowSuccessModal(false)}
      type="success"
      title={successTitle}
      icon="checkmark-circle"
      message={successMessage}
      primaryAction={{
        label: 'Kembali ke Kasir',
        onPress: () => router.replace('/(tabs)'),
        variant: 'primary',
      }}
      secondaryAction={{
        label: 'Tutup',
        onPress: () => setShowSuccessModal(false),
        variant: 'outline',
      }}
    />
  );

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

  if (!isPremiumAccess) {
    return <PremiumLockedView insets={insets} />;
  }

  // Premium/Lifetime tapi belum login cloud
  if (!isCloudLoggedIn) {
    return (
      <>
        <CloudNotConnectedView
          insets={insets}
          onMasuk={() => setShowLoginModal(true)}
          onDaftar={() => setShowRegisterModal(true)}
        />

        <CloudLoginModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSwitchToDaftar={() => setShowRegisterModal(true)}
          onSuccess={() => {
            setShowLoginModal(false);
            // Jangan tampilkan modal apa pun di sini
            // Biarkan view re-render ke CloudConnectedView dengan restore flow
          }}
        />

        <CloudRegisterModal
          visible={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onSwitchToLogin={() => setShowLoginModal(true)}
          onSuccess={(msg) => {
            setShowRegisterModal(false);
            // Jangan tampilkan modal apa pun di sini
            // Biarkan view re-render ke CloudConnectedView dengan restore flow
          }}
        />

        {successModal}
      </>
    );
  }

  // Premium/Lifetime + sudah login cloud
  return (
    <>
      <CloudConnectedView insets={insets} />
      {successModal}
    </>
  );
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

  // ── Cloud prompt ──
  cloudPromptCard: {
    padding: spacing.stackMd,
    marginBottom: spacing.stackMd,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primaryFixed + '30',
  },
  cloudPromptIcon: { marginBottom: spacing.stackSm },
  cloudPromptTitle: { ...typography.headlineMobile, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.stackSm },
  cloudPromptDesc: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20, marginBottom: spacing.stackLg },
  cloudPromptSpacer: { height: spacing.stackSm },

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

  // ── Logout link ──
  logoutLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.stackSm, marginTop: spacing.stackLg, paddingVertical: spacing.stackSm,
  },
  logoutLinkText: { ...typography.labelSm, color: colors.error, fontWeight: '600' },

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

  // ── Input ──
  inputRow: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: colors.surfaceContainerLow, borderRadius: 12,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.stackMd,
    marginBottom: 12,
  },
  input: { flex: 1, ...typography.bodyLg, color: colors.onSurface, paddingVertical: 0 },

  // ── Error ──
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    width: '100%', marginBottom: 12,
  },
  errorText: { flex: 1, ...typography.labelSm, color: colors.error },

  // ── Forgot link ──
  forgotLink: { alignItems: 'center', marginTop: -4, marginBottom: 8 },
  forgotLinkText: { ...typography.labelSm, color: colors.primary, fontWeight: '600' },
});
