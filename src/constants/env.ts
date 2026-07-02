/**
 * Konfigurasi Supabase yang aman dibaca dari environment variable Expo.
 *
 * Expo SDK 54+: env var dengan prefix EXPO_PUBLIC_ otomatis tersedia
 * di runtime via process.env. Tidak perlu app.config.js tambahan.
 *
 * Cara setting:
 * 1. Copy .env.example ke .env
 * 2. Isi EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_ANON_KEY
 * 3. Restart expo dev server (npx expo start --clear)
 *
 * JANGAN pernah menyimpan service role key di sini.
 */
export const SupabaseConfig = {
  get url(): string | null {
    return process.env.EXPO_PUBLIC_SUPABASE_URL ?? null;
  },

  get anonKey(): string | null {
    return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? null;
  },

  get isConfigured(): boolean {
    return !!(this.url && this.anonKey);
  },
};
