import { createClient, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { SupabaseConfig } from '../constants/env';

let client: SupabaseClient | null = null;

/**
 * Mendapatkan singleton Supabase client.
 * Mengembalikan null jika konfigurasi Supabase belum diisi.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client;

  if (!SupabaseConfig.isConfigured) {
    return null;
  }

  client = createClient(SupabaseConfig.url!, SupabaseConfig.anonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}

/**
 * Memeriksa apakah Supabase sudah dikonfigurasi di environment.
 */
export function isCloudConfigured(): boolean {
  return SupabaseConfig.isConfigured;
}

/**
 ============================================================
 * AUTH HELPERS
 * Fungsi-fungsi auth yang siap digunakan.
 * TODO: Integrasikan dengan UI login jika diperlukan.
 ============================================================
 */

/**
 * Mendaftar akun baru.
 * @param email Email untuk registrasi
 * @param password Password (min 6 karakter)
 */
export async function signUp(email: string, password: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: new Error('Cloud belum dikonfigurasi. Periksa Supabase URL dan Anon Key.') };
  }
  return supabase.auth.signUp({ email, password });
}

/**
 * Login ke akun Supabase.
 * @param email Email terdaftar
 * @param password Password
 */
export async function signIn(email: string, password: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: new Error('Cloud belum dikonfigurasi. Periksa Supabase URL dan Anon Key.') };
  }
  return supabase.auth.signInWithPassword({ email, password });
}

/**
 * Logout dari akun Supabase.
 */
export async function signOut() {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Mendapatkan session saat ini.
 */
export async function getSession() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Mendapatkan user ID dari session saat ini.
 */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

/**
 * Mendapatkan email user dari session saat ini.
 */
export async function getUserEmail(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.email ?? null;
}

/**
 * Subscribe ke perubahan auth state.
 * Gunakan ini untuk update UI secara reaktif saat login/logout.
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange(callback);
}
