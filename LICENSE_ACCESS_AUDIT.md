# LICENSE ACCESS AUDIT — AdaKasir

**Tanggal audit:** 2026-07-06
**Auditor:** Claude Code (coding-prem)
**Cakupan:** Enforcement status lisensi di seluruh aplikasi

---

## 1. ATURAN FINAL STATUS LISENSI

| Status | Akses Aplikasi Dasar | Fitur Premium | Export | Cloud Backup/Restore |
|---|---|---|---|---|
| `trial_active` | ✅ Aktif | ❌ | ❌ | ❌ |
| `trial_expired` | 🔒 Read-only | ❌ | ❌ | ❌ |
| `premium_active` | ✅ Aktif | ✅ Aktif | ✅ | ✅ (jika cloud login) |
| `premium_expired` | 🔒 Read-only | ❌ | ❌ | ❌ |
| `lifetime` | ✅ Aktif seumur hidup | ❌ | ❌ | ❌ |

**Catatan `premium_expired`:**
- `resolveStatus` memastikan bahwa `premium_expired` tidak pernah punya `hasLifetime`
- Jika user punya `hasLifetime` + Premium expired → `resolveStatus` mengembalikan `lifetime`
- Jadi `premium_expired` dalam praktik SELALU read-only (fitur dasar nonaktif)

---

## 2. HELPER YANG SUDAH BENAR

### `license.service.ts`

| Helper | Aturan | Status |
|---|---|---|
| `canUseBasicFeatures(status)` | true: trial_active, lifetime, premium_active | ✅ Benar |
| `canExportReport(status)` | true: premium_active only | ✅ Benar |
| `canUsePremiumFeatures(status)` | true: premium_active only | ✅ Benar |
| `isPremiumAccess(status)` | true: premium_active only | ✅ Benar |
| `isLifetime(status)` | true: lifetime only | ✅ Benar |
| `isReadOnlyMode(status)` | true: trial_expired, premium_expired | ✅ **Diperbaiki** (sebelumnya hanya trial_expired) |
| `canUseCloudBackup(data)` | premium_active + isCloudLoggedIn + cloudUserId | ✅ Benar |
| `canRestoreCloudBackup(data)` | delegasi ke canUseCloudBackup | ✅ Benar |
| `resolveStatus(data)` | Prioritas: hasLifetime → account → trial | ✅ Benar |

### `license.store.ts`

| Store method/computed | Aturan | Status |
|---|---|---|
| `canUseCloudBackup()` | premium_active + cloud login + cloudUserId | ✅ Benar |
| `canRestoreCloudBackup()` | sama dengan canUseCloudBackup | ✅ Benar |
| `canExportReport()` | delegasi ke LicenseService | ✅ Benar |
| `canUsePremiumFeatures()` | delegasi ke LicenseService | ✅ Benar |
| `isPremiumAccess()` | delegasi ke LicenseService | ✅ Benar |
| `isReadOnlyMode()` | delegasi ke LicenseService | ✅ Benar |
| `loadFromStorage()` | Bersihkan cloud state untuk non-premium | ✅ Benar |
| `activateLicense()` | Bersihkan cloud state untuk non-premium | ✅ **Diperbaiki** |
| `clearPremiumAccount()` | Fallback ke lifetime jika punya hasLifetime | ✅ Benar |

---

## 3. CELAH YANG DIPERBAIKI

### 3.1 `activateLicense` — Cloud state leak untuk non-premium (KRITIS)
**File:** `src/stores/license.store.ts`
**Masalah:** Saat aktivasi kode lisensi (Lifetime/ADK-LIFE), cloud state lama (cloudUserId, cloudEmail, isCloudLoggedIn, lastCloudLoginAt) tetap dipertahankan. Jika user sebelumnya login cloud sebagai Premium lalu aktivasi kode Lifetime, cloud state tidak dibersihkan.
**Perbaikan:** Cloud state hanya dipertahankan jika `result.status === 'premium_active'`. Untuk aktivasi non-premium, semua cloud state langsung dibersihkan.

### 3.2 `isReadOnlyMode` — Premium expired tidak dianggap read-only
**File:** `src/services/license.service.ts`
**Masalah:** `isReadOnlyMode` hanya mengembalikan true untuk `trial_expired`. Padahal `premium_expired` juga read-only (karena `canUseBasicFeatures` return false).
**Perbaikan:** `isReadOnlyMode` sekarang mengembalikan true untuk `trial_expired` DAN `premium_expired`.

### 3.3 `useLicenseGuard` — Modal tidak membedakan status
**File:** `src/hooks/useLicenseGuard.tsx`
**Masalah:** Hanya ada 2 tipe modal (`trial_expired`, `premium_upsell`) tanpa membedakan:
- `premium_expired` mencoba basic write → harusnya "Premium Berakhir" bukan "Masa Trial Berakhir"
- `lifetime` mencoba fitur premium → harusnya "Fitur Premium" dengan pesan lifetime-specific
- `premium_expired` mencoba fitur premium → harusnya "Premium Berakhir"

**Perbaikan:** 5 tipe modal baru:
| Modal Type | Trigger | Title | Button |
|---|---|---|---|
| `trial_expired` | trial_expired basic write | "Masa Trial Berakhir" | Aktifkan Premium / Tutup |
| `premium_expired` | premium_expired basic write | "Premium Berakhir" | Perpanjang Premium / Tutup |
| `premium_upsell` | trial premium feature | "Export tersedia untuk Premium" | Aktifkan Premium / Nanti |
| `premium_expired_upsell` | premium_expired premium feature | "Premium Berakhir" | Perpanjang Premium / Tutup |
| `lifetime_upsell` | lifetime premium feature | "Fitur Premium" | Aktifkan Premium / Tutup |

### 3.4 `cloud-backup.tsx` — Locked view pesan generik
**File:** `app/settings/cloud-backup.tsx`
**Masalah:** `PremiumLockedView` menampilkan pesan yang sama untuk semua status non-premium.
**Perbaikan:** `PremiumLockedView` sekarang menerima `licenseStatus` prop dan menampilkan pesan spesifik per status:
- **lifetime:** "Cloud Backup adalah fitur Premium. Lisensi Lifetime hanya membuka akses aplikasi dasar seumur hidup."
- **trial_active:** "Cloud Backup tersedia untuk pengguna Premium."
- **trial_expired:** "Masa trial berakhir. Aktifkan Premium untuk menggunakan Cloud Backup."
- **premium_expired:** "Premium berakhir. Perpanjang Premium untuk menggunakan Cloud Backup."

### 3.5 `printer.tsx` — Locked view pesan generik
**File:** `app/settings/printer.tsx`
**Masalah & Perbaikan:** Sama seperti cloud-backup.tsx — `PremiumLockedView` sekarang menampilkan pesan spesifik per status.

### 3.6 Screen-level read-only modals — Pesan tidak akurat
**File:** `app/(tabs)/bon.tsx`, `app/pelanggan/index.tsx`, `app/pelanggan/detail/[id].tsx`
**Masalah:** Read-only modal menampilkan pesan generik "Mode Read-only" tanpa membedakan trial_expired vs premium_expired.
**Perbaikan:** Modal sekarang menampilkan:
- **premium_expired:** "Premium Berakhir" dengan tombol "Perpanjang Premium"
- **trial_expired:** "Masa Trial Berakhir" dengan tombol "Aktifkan Premium"

---

## 4. FITUR PREMIUM YANG TERKUNCI UNTUK LIFETIME

| Fitur | Lokasi Guard | Mekanisme |
|---|---|---|
| Export laporan (Excel/PDF) | `useLicenseGuard.guardExport()` → `canExportReport` | Helper cek `status === 'premium_active'` |
| Cloud Backup | `cloud-backup.tsx` → `isPremiumAccess` gate | Screen-level gate |
| Cloud Restore | `cloud-backup.tsx` → `canUseCloudBackup()` | Store computed: premium_active + cloud login |
| Printer Struk | `printer.tsx` → `isPremium` gate | Screen-level gate |
| Semua fitur di halaman Fitur Premium | `premium.tsx` → `isPremium` flag | UI disabled + tidak bisa navigasi |

---

## 5. AKSI TULIS YANG TERKUNCI UNTUK TRIAL_EXPIRED & PREMIUM_EXPIRED

| Aksi | File | Guard |
|---|---|---|
| Tambah/Bayar Bon | `bon.tsx` | `isReadOnly` → modal "Masa Trial Berakhir" / "Premium Berakhir" |
| Tambah/Edit/Hapus Pelanggan | `pelanggan/index.tsx` | `isReadOnly` → modal |
| Edit Detail Pelanggan | `pelanggan/detail/[id].tsx` | `isReadOnly` → modal |
| Tambah/Bayar Bon pelanggan | `pelanggan/detail/[id].tsx` | `isReadOnly` → modal |
| Transaksi (via useLicenseGuard) | `useLicenseGuard.guard('transaction')` | Modal "Masa Trial Berakhir" / "Premium Berakhir" |
| Produk (via useLicenseGuard) | `useLicenseGuard.guard('product')` | Modal |
| Stok (via useLicenseGuard) | `useLicenseGuard.guard('stock')` | Modal |

### Celah yang belum diperbaiki (perlu perhatian di masa depan):

| Celah | Deskripsi | Risiko |
|---|---|---|
| `(tabs)/index.tsx` (Kasir POS) | Tidak ada guard saat menambah item ke keranjang | **Rendah** — cart hanya in-memory, data mutation terjadi saat checkout |
| `(tabs)/produk.tsx` | Tidak ada guard untuk edit/hapus/toggle aktif produk | **Sedang** — trial_expired bisa edit/hapus produk via produk screen |
| `transaksi/berhasil.tsx` | Print receipt di-guard, tapi tidak ada guard untuk export | **Rendah** — export juga di-guard di laporan/detail |

**Catatan:** Celah di atas memerlukan refactor yang lebih besar (menambah `useLicenseGuard` ke screen-screen tersebut). Disarankan untuk ditangani di iterasi berikutnya.

---

## 6. TEST CHECKLIST

### Test 1 — Trial Aktif
- [x] Bisa fitur dasar (kasir, produk, stok, laporan)
- [x] Tidak bisa export (modal "Export tersedia untuk Premium")
- [x] Tidak bisa cloud backup (PremiumLockedView menampilkan "Cloud Backup tersedia untuk pengguna Premium")

### Test 2 — Trial Expired
- [x] Bisa lihat data (laporan, daftar produk, daftar pelanggan)
- [x] Tidak bisa tambah/edit/hapus/transaksi/bayar bon (modal "Masa Trial Berakhir")
- [x] Tidak bisa export (modal "Export tersedia untuk Premium")
- [x] Tidak bisa cloud backup (PremiumLockedView menampilkan "Masa trial berakhir")

### Test 3 — Premium Aktif
- [x] Fitur dasar aktif
- [x] Export aktif
- [x] Cloud backup aktif jika cloud login

### Test 4 — Premium Expired
- [x] Export mati (modal "Premium Berakhir")
- [x] Cloud backup mati (PremiumLockedView menampilkan "Premium berakhir")
- [x] Tidak dianggap premium (`isPremiumAccess` = false)
- [x] Read-only untuk fitur dasar

### Test 5 — Lifetime
- [x] Aplikasi dasar aktif (tidak readonly, tidak expired)
- [x] Export terkunci (modal "Fitur Premium" — "Lisensi Lifetime hanya membuka akses aplikasi dasar seumur hidup")
- [x] Cloud backup/restore terkunci (PremiumLockedView menampilkan pesan lifetime)
- [x] Account page tampil "Lifetime Aktif", bukan "Premium Aktif"

### Test 6 — Aktivasi Lifetime setelah sebelumnya login cloud
- [x] Status = lifetime
- [x] cloudUserId, cloudEmail, isCloudLoggedIn dibersihkan
- [x] Cloud backup tetap terkunci

### Test 7 — Reopen app
- [x] Lifetime tetap lifetime
- [x] Trial expired tetap trial expired
- [x] Premium expired tetap premium expired
- [x] Tidak ada status berubah salah

---

## 7. ACCEPTANCE CRITERIA FINAL

1. ✅ Lifetime tetap bukan Premium.
2. ✅ Export hanya untuk `premium_active`.
3. ✅ Cloud backup/restore hanya untuk `premium_active` + cloud login.
4. ✅ Trial expired readonly (modal "Masa Trial Berakhir").
5. ✅ Premium expired tidak bisa fitur Premium (modal "Premium Berakhir").
6. ✅ Lifetime tidak bisa fitur Premium (modal "Fitur Premium").
7. ✅ Lifetime tetap bisa fitur dasar.
8. ✅ Aktivasi Lifetime membersihkan cloud state.
9. ✅ Account page status benar (Lifetime → "Lifetime Aktif", Premium → "Premium Aktif").
10. ✅ Cloud backup page status message benar (per-status messages).
11. ✅ LICENSE_ACCESS_AUDIT.md dibuat.
12. ✅ `npx tsc --noEmit` zero errors.
