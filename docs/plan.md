# PLAN DEVELOPMENT APLIKASI KASIR WARUNG

## 1. Ringkasan Project

Aplikasi ini adalah aplikasi kasir mobile berbasis React Native yang ditujukan untuk Warung Madura, warung sembako, toko kelontong, kantin, dan UMKM kecil.

Fokus utama aplikasi:

* Kasir sederhana dan cepat digunakan
* Bisa digunakan tanpa internet
* Catatan transaksi tersimpan rapi
* Catatan bon/utang pelanggan
* Nota bisa dikirim ke WhatsApp
* Dapat dikembangkan menjadi sistem berbayar dengan fitur premium

Nama bisnis sementara:

* WarungRapi
* WarungNota
* KasirBon
* BonRapi

Nama final akan ditentukan setelah pengecekan ketersediaan merek, domain, dan aplikasi sejenis.

---

## 2. Tujuan Utama Aplikasi

Aplikasi ini dibuat untuk membantu pemilik warung agar:

1. Tidak perlu menghitung transaksi secara manual.
2. Tidak perlu mencatat bon/utang di buku yang mudah hilang.
3. Bisa melihat total penjualan harian.
4. Bisa mengirim nota atau tagihan ke WhatsApp pelanggan.
5. Bisa membuat warung terlihat lebih modern seperti minimarket.
6. Tetap bisa berjualan walaupun internet tidak tersedia.

---

## 3. Target Pengguna

Target utama:

* Pemilik Warung Madura
* Warung sembako
* Toko kelontong
* Kantin kecil
* UMKM harian
* Pedagang yang masih menggunakan buku catatan manual

Karakter pengguna:

* Tidak terlalu teknis
* Membutuhkan aplikasi yang sederhana
* Lebih suka sistem sekali bayar
* Butuh fitur yang langsung terasa manfaatnya
* Sensitif terhadap biaya bulanan
* Sering menggunakan WhatsApp untuk komunikasi

---

## 4. Model Bisnis

Aplikasi menggunakan model bisnis campuran:

### 4.1 Beli Putus / Lifetime Basic

Harga contoh:

* Rp199.000 untuk aplikasi saja
* Rp350.000 – Rp499.000 untuk paket aplikasi + printer thermal

Fitur Basic:

* Data toko
* Produk
* Kasir
* Transaksi
* Catatan bon sederhana
* Laporan harian sederhana
* Kirim nota WhatsApp manual

Batasan Basic:

* Hanya 1 perangkat
* Tidak ada backup cloud
* Tidak ada multi-user
* Tidak ada laporan otomatis
* Support gratis terbatas 30 hari
* Update gratis terbatas 6–12 bulan

### 4.2 Premium Bulanan

Harga contoh:

* Rp25.000 – Rp50.000 per bulan

Fitur Premium:

* Backup data online
* Restore data jika HP rusak
* Export laporan Excel/PDF
* Laporan otomatis ke WhatsApp
* Multi-user/karyawan
* Multi-device
* Reminder tagihan bon
* Support prioritas
* Update fitur premium

### 4.3 Add-on Sekali Bayar

Contoh add-on:

* Setup printer: Rp50.000
* Template struk custom: Rp50.000
* Input data produk awal: Rp100.000
* Training karyawan: Rp100.000
* Akrilik QRIS custom: margin tambahan
* Paket printer thermal + kertas struk

---

## 5. Tech Stack Final

Project aplikasi kasir warung ini menggunakan tech stack berikut:

```txt
Expo SDK 55
React Native
TypeScript
Android minSdkVersion 24
Android targetSdkVersion 35
SQLite offline
WhatsApp deep link
Printer thermal masuk development build
```

### 5.1 Core Technology

* **Expo SDK 55** digunakan sebagai basis project karena stabil untuk pengembangan aplikasi React Native modern.
* **React Native** digunakan untuk membangun aplikasi mobile Android.
* **TypeScript** digunakan agar struktur kode lebih aman, rapi, dan mudah dikembangkan.
* **Expo Router** digunakan untuk navigasi halaman.
* **SQLite offline** digunakan sebagai database utama agar aplikasi tetap bisa berjalan tanpa internet.
* **WhatsApp deep link** digunakan untuk mengirim nota transaksi dan tagihan bon ke pelanggan.
* **Printer thermal Bluetooth** akan dikembangkan menggunakan **development build**, bukan Expo Go.

---

## 5.2 Konfigurasi Android

Target Android untuk aplikasi ini:

```txt
minSdkVersion: 24
targetSdkVersion: 35
```

Penjelasan:

* **minSdkVersion 24** berarti aplikasi ditargetkan minimal berjalan di Android 7.0 ke atas.
* Target ini cocok untuk pengguna warung karena masih cukup mendukung HP Android lama, tetapi tidak terlalu rendah sehingga development tetap stabil.
* **targetSdkVersion 35** digunakan agar aplikasi siap untuk kebutuhan distribusi modern, termasuk jika nanti masuk Google Play Store.

---

## 5.3 Database Offline

Aplikasi menggunakan pendekatan **offline-first**.

Database utama:

```txt
SQLite
```

SQLite digunakan untuk menyimpan:

* Data toko
* Produk
* Kategori produk
* Pelanggan
* Transaksi
* Detail transaksi
* Catatan bon/utang
* Pembayaran bon
* Laporan lokal

Dengan SQLite, aplikasi tetap bisa digunakan meskipun:

* Internet mati
* Sinyal HP jelek
* Kuota habis
* Warung berada di lokasi dengan jaringan tidak stabil

---

## 5.4 WhatsApp Deep Link

Fitur WhatsApp digunakan untuk:

* Mengirim nota transaksi
* Mengirim tagihan bon
* Mengirim ringkasan pembayaran pelanggan

Contoh penggunaan:

```txt
https://wa.me/628xxxxxxxxxx?text=ISI_NOTA
```

Format nota akan dibuat otomatis oleh aplikasi, lalu dibuka ke WhatsApp agar pemilik warung bisa langsung mengirim ke pelanggan.

---

## 5.5 Printer Thermal

Fitur printer thermal tidak dijadikan fitur awal Expo Go.

Printer thermal akan masuk ke tahap:

```txt
Development Build
```

Alasannya:

* Printer Bluetooth biasanya membutuhkan akses native Android.
* Expo Go memiliki batasan untuk library native tertentu.
* Development build lebih aman untuk integrasi printer thermal Bluetooth.
* Fitur printer akan dikerjakan setelah fitur kasir, transaksi, nota WhatsApp, dan bon stabil.

Prioritas printer:

1. Pairing printer Bluetooth
2. Simpan printer default
3. Test print
4. Cetak struk transaksi
5. Cetak ulang struk dari riwayat transaksi
6. Template struk ukuran 58mm

---

## 5.6 Keputusan Final Tech Stack

Keputusan final untuk development awal:

```txt
Expo SDK 55
TypeScript
Android minSdkVersion 24
targetSdkVersion 35
SQLite offline
WhatsApp deep link
Printer thermal masuk development build
```

Dengan konfigurasi ini, aplikasi tetap ramah untuk HP Android warung, tetapi masih cukup modern dan stabil untuk dikembangkan secara bertahap.

---

## 6. Prinsip Development

Aplikasi harus mengikuti prinsip berikut:

1. Offline-first.
2. UI sederhana dan mudah dipahami.
3. Tidak menggunakan istilah teknis di sisi pengguna.
4. Semua transaksi harus cepat diproses.
5. Data tidak boleh mudah hilang.
6. Fitur utama harus bisa dipakai tanpa login.
7. Fitur premium boleh membutuhkan login.
8. Aplikasi harus ringan untuk HP Android kelas bawah.
9. Alur kasir harus sesingkat mungkin.
10. Prioritaskan fitur yang bisa langsung dijual.

---

## 7. Fitur MVP Versi 1.0

MVP adalah versi awal yang sudah layak untuk didemokan dan dijual ke pemilik warung.

### 7.1 Onboarding

Fitur:

* Halaman pembuka aplikasi
* Penjelasan singkat manfaat aplikasi
* Setup data toko pertama kali

Data toko:

* Nama warung
* Nama pemilik
* Nomor WhatsApp
* Alamat toko
* Catatan struk
* Logo opsional

Acceptance Criteria:

* User bisa membuka aplikasi pertama kali.
* User bisa mengisi data toko.
* Setelah setup selesai, user masuk ke halaman utama.
* Data toko tersimpan secara lokal.

---

### 7.2 Dashboard

Fitur:

* Ringkasan penjualan hari ini
* Total transaksi hari ini
* Total bon belum lunas
* Produk terlaris hari ini
* Tombol cepat ke halaman kasir

Acceptance Criteria:

* Dashboard menampilkan data dari transaksi lokal.
* Jika belum ada transaksi, tampilkan state kosong.
* Tombol kasir mudah terlihat.

---

### 7.3 Produk

Fitur:

* Tambah produk
* Edit produk
* Hapus produk
* Cari produk
* Kategori produk
* Harga modal
* Harga jual
* Stok
* Satuan barang

Data produk:

* Nama produk
* Kategori
* SKU opsional
* Barcode opsional
* Harga modal
* Harga jual
* Stok
* Satuan
* Status aktif/nonaktif

Acceptance Criteria:

* User bisa menambahkan produk baru.
* Produk tersimpan ke SQLite.
* User bisa mengedit produk.
* User bisa menghapus atau menonaktifkan produk.
* Produk bisa dicari berdasarkan nama.
* Produk yang tidak aktif tidak muncul di halaman kasir.

---

### 7.4 Kasir

Fitur:

* Daftar produk
* Search produk
* Tambah produk ke keranjang
* Ubah jumlah barang
* Hapus item dari keranjang
* Hitung subtotal
* Hitung total
* Input nominal bayar
* Hitung kembalian otomatis
* Pilih metode pembayaran
* Simpan transaksi

Metode pembayaran awal:

* Tunai
* QRIS
* Transfer
* Bon/utang

Acceptance Criteria:

* User bisa memilih produk.
* Produk masuk ke keranjang.
* Total transaksi terhitung otomatis.
* Kembalian muncul setelah nominal bayar diinput.
* Transaksi bisa disimpan.
* Stok berkurang setelah transaksi berhasil.
* Data transaksi tersimpan di SQLite.
* Jika pembayaran dipilih sebagai bon, transaksi masuk ke catatan utang.

---

### 7.5 Nota WhatsApp

Fitur:

* Generate teks nota otomatis
* Kirim nota ke WhatsApp
* Format nota rapi
* Bisa dikirim ke nomor pelanggan

Contoh format nota:

```txt
*WARUNG BAROKAH MADURA*

No: INV-20260629-001
Tanggal: 29/06/2026
Jam: 14:30

1. Indomie Goreng x2 = Rp7.000
2. Aqua 600ml x1 = Rp4.000

Total: Rp11.000
Bayar: Rp20.000
Kembali: Rp9.000

Terima kasih.
```

Acceptance Criteria:

* Setelah transaksi selesai, aplikasi membuat nota otomatis.
* Nota bisa dibuka ke WhatsApp.
* Format nota mudah dibaca.
* Nominal menggunakan format rupiah.

---

### 7.6 Pelanggan

Fitur:

* Tambah pelanggan
* Edit pelanggan
* Hapus pelanggan
* Lihat daftar pelanggan
* Lihat riwayat bon pelanggan

Data pelanggan:

* Nama pelanggan
* Nomor WhatsApp
* Alamat
* Catatan

Acceptance Criteria:

* User bisa menambah pelanggan.
* Nomor WhatsApp pelanggan bisa digunakan untuk kirim tagihan.
* User bisa melihat daftar pelanggan.
* User bisa melihat detail pelanggan.

---

### 7.7 Bon / Utang

Fitur:

* Catat bon dari transaksi
* Tambah bon manual
* Catat pembayaran bon
* Pembayaran sebagian
* Tandai lunas
* Lihat sisa bon
* Kirim tagihan ke WhatsApp

Contoh format tagihan:

```txt
Assalamu’alaikum Pak/Bu.

Catatan bon di Warung Barokah:

Total bon: Rp75.000
Sudah dibayar: Rp25.000
Sisa bon: Rp50.000

Mohon dicek kembali. Terima kasih.
```

Acceptance Criteria:

* User bisa mencatat utang pelanggan.
* User bisa mencatat pembayaran sebagian.
* Sisa bon otomatis berkurang.
* Status berubah menjadi lunas jika sisa bon Rp0.
* Tagihan bisa dikirim ke WhatsApp.

---

### 7.8 Laporan Harian

Fitur:

* Total penjualan hari ini
* Total transaksi
* Total laba kotor
* Total bon hari ini
* Total bon belum lunas
* Produk terlaris
* Riwayat transaksi

Acceptance Criteria:

* Laporan menampilkan transaksi berdasarkan tanggal.
* Laba kotor dihitung dari harga jual dikurangi harga modal.
* Riwayat transaksi bisa dibuka detailnya.
* User bisa melihat ringkasan harian dengan cepat.

---

### 7.9 Pengaturan

Fitur:

* Edit data toko
* Setting printer
* Setting template nota
* Backup manual lokal
* Informasi aplikasi
* Status lisensi

Acceptance Criteria:

* User bisa mengubah data toko.
* User bisa melihat status lisensi.
* User bisa mengatur template nota sederhana.

---

## 8. Fitur Versi 1.1

Fokus versi 1.1 adalah printer thermal.

### 8.1 Printer Thermal Bluetooth

Fitur:

* Pairing printer Bluetooth
* Pilih printer default
* Test print
* Cetak struk transaksi
* Cetak ulang struk
* Template struk 58mm

Acceptance Criteria:

* Aplikasi bisa menyimpan printer default.
* User bisa melakukan test print.
* Struk bisa dicetak dari transaksi yang berhasil.
* Struk bisa dicetak ulang dari riwayat transaksi.

Catatan:

Integrasi printer kemungkinan membutuhkan development build, bukan hanya Expo Go.

---

## 9. Fitur Versi 1.2

Fokus versi 1.2 adalah fitur premium dan monetisasi.

### 9.1 Export Laporan

Fitur:

* Export laporan harian
* Export laporan bulanan
* Format Excel
* Format PDF

Acceptance Criteria:

* User bisa memilih rentang tanggal.
* Laporan bisa diekspor.
* File bisa dibagikan ke WhatsApp atau disimpan.

### 9.2 Backup dan Restore

Fitur:

* Backup data ke cloud
* Restore data dari cloud
* Backup manual
* Status backup terakhir

Acceptance Criteria:

* User premium bisa backup data.
* User bisa restore data ketika pindah HP.
* Aplikasi menampilkan waktu backup terakhir.

### 9.3 Reminder Bon

Fitur:

* Daftar pelanggan yang masih punya bon
* Generate pesan tagihan otomatis
* Kirim tagihan ke WhatsApp
* Template tagihan

Acceptance Criteria:

* User bisa melihat daftar bon jatuh tempo.
* User bisa mengirim tagihan WhatsApp.
* Pesan tagihan otomatis berisi nama pelanggan dan sisa bon.

---

## 10. Fitur Versi 2.0

Fokus versi 2.0 adalah pengembangan skala bisnis.

### 10.1 Multi-user

Role:

* Owner
* Kasir
* Admin

Fitur:

* Login user
* Hak akses
* Riwayat transaksi per kasir
* Batasi akses laporan

### 10.2 Multi-device

Fitur:

* Sinkronisasi data
* Owner bisa memantau dari HP lain
* Kasir bisa input transaksi dari perangkat berbeda

### 10.3 Cloud Dashboard

Fitur:

* Dashboard web
* Monitoring penjualan
* Download laporan
* Manajemen toko
* Manajemen lisensi

---

## 11. Struktur Folder Project

```txt
kasir-warung/
├── app/
│   ├── index.tsx
│   ├── onboarding.tsx
│   ├── _layout.tsx
│   ├── (tabs)/
│   │   ├── index.tsx
│   │   ├── kasir.tsx
│   │   ├── produk.tsx
│   │   ├── bon.tsx
│   │   ├── laporan.tsx
│   │   └── settings.tsx
│   ├── produk/
│   │   ├── tambah.tsx
│   │   └── edit/[id].tsx
│   ├── transaksi/
│   │   └── detail/[id].tsx
│   ├── pelanggan/
│   │   ├── tambah.tsx
│   │   └── detail/[id].tsx
│   └── bon/
│       └── detail/[id].tsx
│
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── EmptyState.tsx
│   │   └── CurrencyText.tsx
│   │
│   ├── database/
│   │   ├── db.ts
│   │   ├── migrations.ts
│   │   ├── schema.ts
│   │   ├── store.repo.ts
│   │   ├── product.repo.ts
│   │   ├── category.repo.ts
│   │   ├── customer.repo.ts
│   │   ├── sales.repo.ts
│   │   ├── debt.repo.ts
│   │   └── report.repo.ts
│   │
│   ├── stores/
│   │   ├── cart.store.ts
│   │   ├── app.store.ts
│   │   └── license.store.ts
│   │
│   ├── services/
│   │   ├── invoice.service.ts
│   │   ├── whatsapp.service.ts
│   │   ├── printer.service.ts
│   │   ├── license.service.ts
│   │   ├── backup.service.ts
│   │   └── report.service.ts
│   │
│   ├── utils/
│   │   ├── currency.ts
│   │   ├── date.ts
│   │   ├── invoice-number.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   │
│   ├── types/
│   │   ├── store.ts
│   │   ├── product.ts
│   │   ├── category.ts
│   │   ├── sale.ts
│   │   ├── customer.ts
│   │   ├── debt.ts
│   │   └── report.ts
│   │
│   └── config/
│       ├── app.ts
│       ├── pricing.ts
│       └── feature-flags.ts
│
├── assets/
│   ├── images/
│   └── icons/
│
├── docs/
│   ├── plan.md
│   ├── database.md
│   ├── pricing.md
│   └── release-notes.md
│
├── package.json
├── app.json
├── tsconfig.json
└── README.md
```

---

## 12. Database Schema

### 12.1 stores

```sql
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  address TEXT,
  receipt_note TEXT,
  logo_uri TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 12.2 categories

```sql
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 12.3 products

```sql
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  cost_price INTEGER NOT NULL DEFAULT 0,
  sell_price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 12.4 customers

```sql
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 12.5 sales

```sql
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  customer_id TEXT,
  total_amount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  change_amount INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 12.6 sale_items

```sql
CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL DEFAULT 0,
  cost_price INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
```

### 12.7 debts

```sql
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  sale_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  remaining_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  due_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 12.8 debt_payments

```sql
CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL
);
```

---

## 13. Navigasi Aplikasi

Tab utama:

1. Dashboard
2. Kasir
3. Produk
4. Bon
5. Laporan
6. Pengaturan

Alur utama transaksi:

```txt
Buka aplikasi
→ Masuk Dashboard
→ Klik Kasir
→ Pilih produk
→ Produk masuk keranjang
→ Input pembayaran
→ Simpan transaksi
→ Pilih cetak struk / kirim nota WhatsApp
→ Selesai
```

Alur bon:

```txt
Buka aplikasi
→ Kasir
→ Pilih produk
→ Pilih pembayaran Bon
→ Pilih pelanggan
→ Simpan transaksi
→ Data masuk ke catatan bon
→ Kirim tagihan WhatsApp jika perlu
```

---

## 14. Format Invoice Number

Format invoice:

```txt
INV-YYYYMMDD-XXX
```

Contoh:

```txt
INV-20260629-001
INV-20260629-002
INV-20260629-003
```

Aturan:

* Nomor invoice reset setiap hari.
* Nomor urut berdasarkan jumlah transaksi pada tanggal tersebut.
* Invoice harus unik.

---

## 15. Format Rupiah

Semua angka uang harus ditampilkan dalam format rupiah.

Contoh:

```txt
Rp5.000
Rp25.000
Rp150.000
Rp1.250.000
```

Tidak menggunakan desimal.

---

## 16. UI/UX Guideline

### 16.1 Gaya Tampilan

Aplikasi harus:

* Sederhana
* Font jelas
* Tombol besar
* Warna kontras
* Tidak terlalu ramai
* Cocok untuk pengguna yang tidak terbiasa dengan aplikasi rumit

### 16.2 Prioritas UI

Halaman kasir harus paling mudah digunakan.

Tombol penting:

* Tambah produk
* Bayar
* Simpan transaksi
* Kirim WhatsApp
* Cetak struk

### 16.3 Bahasa Aplikasi

Gunakan bahasa sederhana.

Gunakan:

* Produk
* Kasir
* Bon
* Laporan
* Bayar
* Kembalian
* Kirim Nota
* Cetak Struk

Hindari istilah:

* Database
* API
* Sync
* Endpoint
* Cache
* Session
* Payload

---

## 17. Development Milestone

### Milestone 1 — Setup Project

Target:

* Project React Native berhasil dibuat
* TypeScript aktif
* Expo Router aktif
* Struktur folder dibuat
* Tab navigation tersedia

Checklist:

* [x] Create project
* [x] Install dependency utama
* [x] Setup TypeScript
* [x] Setup Expo Router
* [x] Buat struktur folder
* [x] Buat halaman Kasir (utama)
* [x] Buat halaman Produk
* [x] Buat halaman Bon
* [x] Buat halaman Laporan
* [x] Buat halaman Settings

---

### Milestone 2 — Database

Target:

* SQLite aktif
* Semua tabel utama dibuat
* Repository pattern dibuat

Checklist:

* [ ] Setup db.ts
* [ ] Setup migrations.ts
* [ ] Buat tabel stores
* [ ] Buat tabel categories
* [ ] Buat tabel products
* [ ] Buat tabel customers
* [ ] Buat tabel sales
* [ ] Buat tabel sale_items
* [ ] Buat tabel debts
* [ ] Buat tabel debt_payments
* [ ] Buat repository produk
* [ ] Buat repository transaksi
* [ ] Buat repository bon
* [ ] Buat repository laporan

---

### Milestone 3 — Produk

Target:

* CRUD produk selesai

Checklist:

* [x] Halaman daftar produk
* [x] Form tambah produk
* [x] Form edit produk
* [x] Hapus/nonaktifkan produk
* [x] Search produk
* [x] Validasi input produk
* [x] Format rupiah pada harga
* [x] Simpan ke SQLite

---

### Milestone 4 — Kasir

Target:

* Transaksi bisa diproses sampai selesai

Checklist:

* [ ] Halaman kasir
* [ ] Search produk
* [ ] Tambah produk ke keranjang
* [ ] Update qty
* [ ] Hapus item keranjang
* [ ] Hitung subtotal
* [ ] Hitung total
* [ ] Input uang bayar
* [ ] Hitung kembalian
* [ ] Pilih metode pembayaran
* [ ] Simpan transaksi
* [ ] Kurangi stok produk
* [ ] Clear keranjang setelah transaksi

---

### Milestone 5 — Nota WhatsApp

Target:

* Nota transaksi bisa dikirim ke WhatsApp

Checklist:

* [ ] Buat invoice.service.ts
* [ ] Buat whatsapp.service.ts
* [ ] Generate teks nota
* [ ] Encode teks nota untuk URL
* [ ] Buka WhatsApp deep link
* [ ] Test format nota
* [ ] Tambah tombol Kirim Nota

---

### Milestone 6 — Pelanggan dan Bon

Target:

* Sistem bon/utang berjalan

Checklist:

* [ ] CRUD pelanggan
* [ ] Tambah bon manual
* [ ] Bon dari transaksi
* [ ] Catat pembayaran bon
* [ ] Hitung sisa bon
* [ ] Status lunas/belum lunas
* [ ] Daftar pelanggan yang punya bon
* [ ] Kirim tagihan WhatsApp

---

### Milestone 7 — Laporan

Target:

* Laporan harian bisa digunakan

Checklist:

* [ ] Total penjualan hari ini
* [ ] Total transaksi hari ini
* [ ] Total laba kotor
* [ ] Produk terlaris
* [ ] Total bon belum lunas
* [ ] Riwayat transaksi
* [ ] Detail transaksi

---

### Milestone 8 — Settings dan Lisensi Basic

Target:

* Pengaturan aplikasi tersedia

Checklist:

* [ ] Edit data toko
* [ ] Setting template nota
* [ ] Status lisensi
* [ ] Informasi aplikasi
* [ ] Reset data lokal
* [ ] Backup lokal manual

---

### Milestone 9 — Printer Thermal

Target:

* Cetak struk berhasil

Checklist:

* [ ] Pilih printer Bluetooth
* [ ] Simpan printer default
* [ ] Test print
* [ ] Cetak struk transaksi
* [ ] Cetak ulang struk
* [ ] Template 58mm
* [ ] Error handling printer tidak tersambung

---

### Milestone 10 — Premium

Target:

* Fitur premium mulai tersedia

Checklist:

* [ ] Feature flag premium
* [ ] Halaman upgrade premium
* [ ] Backup cloud
* [ ] Restore data
* [ ] Export Excel
* [ ] Export PDF
* [ ] Laporan otomatis
* [ ] Reminder bon
* [ ] Support priority badge

---

## 18. Testing Plan

### 18.1 Manual Testing

Test wajib:

* Tambah produk
* Edit produk
* Hapus produk
* Transaksi tunai
* Transaksi QRIS
* Transaksi bon
* Kirim nota WhatsApp
* Tambah pelanggan
* Catat pembayaran bon
* Lihat laporan harian
* Tutup aplikasi lalu buka lagi
* Pastikan data tetap ada

### 18.2 Edge Case Testing

Test kondisi khusus:

* Produk stok 0
* Uang bayar kurang dari total
* Harga produk kosong
* Nama produk kosong
* Pelanggan tanpa nomor HP
* Transaksi tanpa produk
* Hapus produk yang pernah ada di transaksi
* Bon dibayar sebagian
* Bon dibayar lebih dari sisa
* WhatsApp tidak terinstall
* Printer tidak aktif
* Printer tidak terhubung

---

## 19. Release Plan

### Alpha

Digunakan internal developer.

Target:

* Semua fitur MVP bisa dicoba
* Masih boleh ada bug kecil
* Belum dijual

### Beta

Dicoba ke 3–5 warung.

Target:

* Dapat feedback langsung
* Perbaiki alur kasir
* Perbaiki format nota
* Perbaiki fitur bon
* Test performa di HP murah

### Release 1.0

Mulai dijual.

Syarat release:

* Kasir stabil
* Produk stabil
* Transaksi aman
* Data tidak hilang
* Nota WhatsApp rapi
* Bon berjalan
* Laporan harian tersedia

---

## 20. Strategi Demo ke Warung

Saat demo ke pemilik warung, jangan jelaskan teknologi.

Jelaskan manfaat:

1. Tidak perlu kalkulator.
2. Catatan bon tidak hilang.
3. Nota bisa langsung dikirim WhatsApp.
4. Penjualan harian langsung kelihatan.
5. Bisa dipakai tanpa internet.
6. Warung terlihat lebih modern.

Alur demo 5 menit:

```txt
1. Input 3 produk contoh
2. Lakukan transaksi
3. Tampilkan total dan kembalian
4. Kirim nota ke WhatsApp
5. Buat contoh bon pelanggan
6. Kirim tagihan bon ke WhatsApp
```

---

## 21. Risiko Development

### Risiko 1: Printer Bluetooth sulit stabil

Solusi:

* Jangan jadikan printer sebagai fitur MVP awal.
* Fokus dulu pada nota WhatsApp.
* Printer masuk versi 1.1.

### Risiko 2: Pengguna tidak mau bayar bulanan

Solusi:

* Tetap sediakan beli putus.
* Fitur premium dibuat opsional.
* Premium harus terasa penting, seperti backup data dan restore HP rusak.

### Risiko 3: Data hilang karena HP rusak

Solusi:

* Backup cloud dijadikan fitur premium.
* Tambahkan backup lokal manual.

### Risiko 4: Aplikasi terlalu rumit

Solusi:

* Fitur MVP dibuat sederhana.
* Tombol besar.
* Bahasa non-teknis.
* Fokus pada kasir, bon, dan laporan.

---

## 22. Prioritas Pengerjaan

Prioritas utama:

1. Setup project
2. Database SQLite
3. CRUD produk
4. Kasir
5. Simpan transaksi
6. Nota WhatsApp
7. Pelanggan
8. Bon/utang
9. Laporan harian
10. Settings
11. Printer thermal
12. Premium/cloud

Jangan mulai dari fitur premium atau printer sebelum kasir dan transaksi stabil.

---

## 23. Definition of Done MVP

MVP dianggap selesai jika:

* User bisa setup toko.
* User bisa tambah produk.
* User bisa melakukan transaksi.
* Total dan kembalian dihitung otomatis.
* Transaksi tersimpan.
* Stok berkurang.
* Nota WhatsApp bisa dikirim.
* Bon pelanggan bisa dicatat.
* Pembayaran bon bisa dicatat.
* Laporan harian tampil.
* Data tetap tersimpan setelah aplikasi ditutup.
* Aplikasi bisa dipakai tanpa internet.

---

## 24. Catatan untuk Developer

Fokus utama bukan membuat aplikasi paling lengkap, tetapi membuat aplikasi yang:

* Cepat digunakan
* Stabil
* Mudah dijual
* Mudah dipahami
* Bisa menyelesaikan masalah nyata pemilik warung

Fitur paling penting untuk penjualan awal:

1. Kasir cepat
2. Nota WhatsApp
3. Catatan bon
4. Laporan harian
5. Offline mode

---

## 25. Catatan Khusus Development

Beberapa keputusan teknis yang wajib diikuti selama development:

1. Project menggunakan **Expo SDK 55**.
2. Bahasa utama menggunakan **TypeScript**.
3. Target minimal Android adalah **Android 7.0 / API 24**.
4. Target SDK Android adalah **API 35**.
5. Semua fitur utama harus berjalan secara **offline** menggunakan SQLite.
6. Nota dan tagihan dikirim menggunakan **WhatsApp deep link**.
7. Printer thermal Bluetooth tidak dikembangkan di Expo Go.
8. Printer thermal masuk setelah aplikasi dibuat dalam bentuk **development build**.
9. Jangan mulai dari printer sebelum fitur kasir dan transaksi stabil.
10. Fitur premium/cloud dikembangkan setelah MVP lokal selesai.

Urutan development yang benar:

```txt
1. Setup Expo SDK 55 + TypeScript
2. Setup Expo Router
3. Setup SQLite offline
4. Buat CRUD produk
5. Buat kasir dan transaksi
6. Buat nota WhatsApp
7. Buat pelanggan dan bon
8. Buat laporan harian
9. Buat development build
10. Integrasi printer thermal Bluetooth
11. Tambah fitur premium/cloud
```


Setelah fitur tersebut stabil, baru tambahkan printer thermal, backup cloud, dan fitur premium.

---

## 25. Next Step

Langkah berikutnya:

1. Buat project React Native.
2. Buat struktur folder.
3. Setup Expo Router.
4. Setup SQLite.
5. Buat schema database.
6. Buat halaman produk.
7. Buat halaman kasir.
8. Buat nota WhatsApp.
9. Buat fitur bon.
10. Test langsung ke calon pengguna.
