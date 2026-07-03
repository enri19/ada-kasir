/**
 * Route constants untuk navigasi AdaKasir.
 * Gunakan ini agar route konsisten dan mudah diubah.
 */
export const ROUTES = {
  /* ─── Aktivasi & Lisensi ───────────────────────────────── */
  /** Halaman aktivasi kode lisensi (Lifetime / Premium manual) */
  SETTINGS_ACTIVATION: '/settings/activation' as const,
  /** Halaman ringkasan akun, login Premium, backup, restore */
  SETTINGS_ACCOUNT: '/settings/account' as const,

  /* ─── Halaman utama ────────────────────────────────────── */
  KASIR: '/(tabs)' as const,
  ONBOARDING: '/onboarding' as const,
} as const;
