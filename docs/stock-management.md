# PLAN MANAJEMEN STOK

## 1. Tujuan Manajemen Stok

Manajemen stok dibuat untuk membantu pemilik warung mengetahui jumlah barang yang tersedia, barang yang mulai habis, dan perubahan stok akibat transaksi penjualan.

Untuk MVP, sistem stok harus sederhana dan mudah digunakan.

Fokus utama:

```txt
Barang masuk
Barang keluar karena penjualan
Koreksi stok
Peringatan stok menipis
Laporan stok sederhana
```

---

## 2. Prinsip Stok untuk Warung

Aplikasi tidak boleh membuat pemilik warung merasa ribet.

Prinsip utama:

1. Stok otomatis berkurang saat transaksi berhasil.
2. User bisa menambah stok dengan cepat.
3. User bisa koreksi stok jika jumlah fisik berbeda.
4. Produk tetap bisa dijual walaupun stok tidak diaktifkan.
5. Peringatan stok menipis hanya membantu, bukan menghalangi transaksi.
6. Tidak perlu sistem gudang rumit untuk versi MVP.

---

## 3. Mode Stok Produk

Setiap produk memiliki pilihan:

```txt
Pantau stok: Ya / Tidak
```

### 3.1 Pantau Stok Aktif

Jika aktif:

* Stok produk dicatat.
* Stok berkurang otomatis saat transaksi.
* Produk bisa masuk daftar stok menipis.
* Produk bisa masuk laporan stok.

Contoh:

```txt
Indomie Goreng
Stok: 24 pcs
Stok minimum: 5 pcs
```

### 3.2 Pantau Stok Tidak Aktif

Jika tidak aktif:

* Produk tetap bisa dijual.
* Stok tidak perlu diisi.
* Cocok untuk jasa, pulsa, token, atau barang yang tidak ingin dihitung manual.

Contoh:

```txt
Pulsa
Token listrik
Top up e-wallet
Jasa transfer
```

---

## 4. Field Produk untuk Stok

Update tabel `products` dengan field:

```sql
stock INTEGER NOT NULL DEFAULT 0,
min_stock INTEGER NOT NULL DEFAULT 0,
track_stock INTEGER NOT NULL DEFAULT 1,
allow_negative_stock INTEGER NOT NULL DEFAULT 1
```

Penjelasan:

```txt
stock                = jumlah stok saat ini
min_stock            = batas stok minimum
track_stock          = apakah stok dipantau
allow_negative_stock = boleh jual walaupun stok habis
```

Rekomendasi default:

```txt
track_stock: 1
allow_negative_stock: 1
min_stock: 0
```

Kenapa `allow_negative_stock` sebaiknya aktif untuk MVP?

Karena di warung sering terjadi stok fisik belum sempat diinput, tapi barang sebenarnya ada. Jika sistem terlalu ketat melarang penjualan, kasir jadi terganggu.

---

## 5. Alur Stok Saat Produk Ditambah

Saat tambah produk, user mengisi:

```txt
Nama produk
Kategori
Harga modal
Harga jual
Stok awal
Stok minimum
Satuan
Pantau stok
```

Contoh:

```txt
Nama: Indomie Goreng
Kategori: Mie
Harga modal: Rp2.800
Harga jual: Rp3.500
Stok awal: 40
Stok minimum: 5
Satuan: pcs
Pantau stok: Ya
```

Acceptance Criteria:

* User bisa mengisi stok awal.
* Jika stok kosong, otomatis dianggap 0.
* Jika stok minimum kosong, otomatis dianggap 0.
* Produk tetap bisa disimpan walaupun stok 0.

---

## 6. Alur Stok Saat Transaksi

Saat transaksi berhasil:

```txt
Produk dibeli
→ Transaksi disimpan
→ Stok produk berkurang otomatis
→ Riwayat pergerakan stok dicatat
```

Contoh:

```txt
Stok Indomie sebelum transaksi: 40
Terjual: 2
Stok setelah transaksi: 38
```

Aturan:

* Stok berkurang hanya setelah transaksi berhasil disimpan.
* Jika transaksi dibatalkan sebelum bayar, stok tidak berubah.
* Jika payment method Tunai, stok berkurang setelah transaksi tersimpan.
* Jika payment method QRIS, stok berkurang setelah klik “Sudah Dibayar”.
* Jika payment method Bon, stok tetap berkurang setelah bon disimpan.

---

## 7. Stok Habis Saat Transaksi

Untuk MVP, stok habis tidak langsung memblokir transaksi.

Jika stok kurang, tampilkan peringatan:

```txt
Stok produk ini kurang.
Tetap lanjutkan transaksi?
```

Pilihan:

```txt
Lanjutkan
Batal
```

Alasan:

* Kadang stok di aplikasi belum di-update.
* Barang fisik mungkin masih ada.
* Warung butuh transaksi cepat.
* Jangan sampai aplikasi menghambat penjualan.

Namun di Settings nanti bisa ditambahkan opsi:

```txt
Izinkan stok minus: Ya / Tidak
```

---

## 8. Stok Minimum

Stok minimum digunakan untuk menandai barang yang harus segera dibeli lagi.

Contoh:

```txt
Indomie Goreng
Stok saat ini: 4
Stok minimum: 5
Status: Stok Menipis
```

Kriteria stok menipis:

```txt
track_stock = aktif
stock <= min_stock
min_stock > 0
```

Tampilkan di halaman Produk atau Laporan:

```txt
Stok Menipis
- Indomie Goreng: 4 pcs
- Aqua 600ml: 3 pcs
- Gula 1kg: 2 pcs
```

---

## 9. Koreksi Stok Manual

User harus bisa mengubah stok jika stok fisik berbeda dari aplikasi.

Jenis koreksi:

```txt
Tambah stok
Kurangi stok
Set stok sesuai jumlah fisik
```

### 9.1 Tambah Stok

Digunakan saat belanja barang baru.

Contoh:

```txt
Indomie Goreng
Stok sekarang: 10
Tambah stok: 20
Stok akhir: 30
```

### 9.2 Kurangi Stok

Digunakan jika barang rusak, hilang, kadaluarsa, atau dipakai sendiri.

Contoh:

```txt
Aqua 600ml
Stok sekarang: 12
Kurangi stok: 2
Stok akhir: 10
```

### 9.3 Set Stok

Digunakan saat opname fisik.

Contoh:

```txt
Stok di aplikasi: 18
Stok fisik: 15
Set stok menjadi: 15
```

---

## 10. Riwayat Pergerakan Stok

Agar stok bisa dilacak, buat tabel `stock_movements`.

```sql
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  type TEXT NOT NULL,
  qty INTEGER NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reference_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);
```

Nilai `type`:

```txt
initial
sale
stock_in
stock_out
adjustment
return
cancel
```

Penjelasan:

```txt
initial     = stok awal saat produk dibuat
sale        = stok keluar karena penjualan
stock_in    = stok masuk
stock_out   = stok keluar manual
adjustment  = koreksi stok
return      = barang retur
cancel      = pembatalan transaksi
```

Untuk MVP, minimal gunakan:

```txt
initial
sale
stock_in
stock_out
adjustment
```

---

## 11. Halaman Produk dan Stok

Di halaman Produk, tampilkan informasi stok secara ringkas:

```txt
Indomie Goreng
Rp3.500
Stok: 24 pcs
```

Jika stok menipis:

```txt
Indomie Goreng
Rp3.500
Stok: 4 pcs
Stok menipis
```

Jika stok 0:

```txt
Indomie Goreng
Rp3.500
Stok habis
```

Aksi cepat pada produk:

```txt
Edit
Tambah Stok
Koreksi Stok
Nonaktifkan
```

---

## 12. Halaman Stok Menipis

Bisa ditempatkan di halaman Produk atau Laporan.

Untuk MVP, cukup buat filter di halaman Produk:

```txt
Semua Produk
Stok Menipis
Stok Habis
```

Atau di halaman Laporan:

```txt
Barang Perlu Dibeli
```

Isi:

```txt
Produk
Stok Saat Ini
Stok Minimum
Saran Beli
```

Contoh:

```txt
Indomie Goreng
Stok: 4 pcs
Minimum: 10 pcs
Saran beli: 6 pcs
```

Rumus sederhana:

```txt
Saran beli = stok minimum - stok saat ini
```

---

## 13. Laporan Stok

Laporan stok MVP:

```txt
Total produk
Produk aktif
Produk stok menipis
Produk stok habis
Nilai stok modal
```

Nilai stok modal:

```txt
stock * cost_price
```

Contoh:

```txt
Total nilai stok modal: Rp2.450.000
```

Catatan:

Nilai stok hanya estimasi berdasarkan harga modal yang diinput user.

---

## 14. Stok untuk Produk Pulsa dan Token

Untuk produk seperti pulsa, token, top up, atau jasa, stok bisa dimatikan.

Contoh:

```txt
Nama produk: Token Listrik 50rb
Pantau stok: Tidak
```

Jika `track_stock = 0`:

* Produk tetap muncul di kasir.
* Tidak ada peringatan stok habis.
* Transaksi tidak mengurangi stok.

---

## 15. Error Handling Stok

### 15.1 Stok Tidak Cukup

Pesan:

```txt
Stok tidak cukup.
Stok tersedia: 2 pcs
Jumlah dijual: 5 pcs

Tetap lanjutkan transaksi?
```

Tombol:

```txt
Lanjutkan
Batal
```

### 15.2 Produk Stok Habis

Pesan:

```txt
Stok produk habis.
Tetap masukkan ke keranjang?
```

### 15.3 Koreksi Stok Kosong

Pesan:

```txt
Masukkan jumlah stok terlebih dahulu.
```

### 15.4 Stok Minus

Jika stok menjadi minus, tampilkan label:

```txt
Stok: -2 pcs
Perlu koreksi stok
```

---

## 16. Settings Stok

Tambahkan menu di Settings:

```txt
Pengaturan Stok
```

Isi:

```txt
Izinkan stok minus
Tampilkan peringatan stok menipis
Default stok minimum
Default pantau stok
```

Rekomendasi default:

```txt
Izinkan stok minus: Ya
Tampilkan peringatan stok menipis: Ya
Default stok minimum: 0
Default pantau stok: Ya
```

---

## 17. UX Rules Manajemen Stok

Aturan UI/UX:

1. Jangan paksa user mengisi stok saat tambah produk.
2. Stok boleh kosong dan otomatis menjadi 0.
3. Tambah stok harus bisa dilakukan dari daftar produk.
4. Koreksi stok harus maksimal 2–3 klik.
5. Jangan blokir transaksi hanya karena stok aplikasi habis.
6. Peringatan stok harus jelas tetapi tidak mengganggu.
7. Stok menipis ditampilkan sebagai informasi, bukan pop-up terus-menerus.
8. Produk tanpa pantau stok tetap bisa dijual normal.

---

## 18. Development Milestone Stok

### Milestone Stok 1 — Field Stok Produk

Checklist:

* [ ] Tambah field `stock`
* [ ] Tambah field `min_stock`
* [ ] Tambah field `track_stock`
* [ ] Tambah field `allow_negative_stock`
* [ ] Update form tambah produk
* [ ] Update form edit produk

### Milestone Stok 2 — Stok Berkurang Saat Transaksi

Checklist:

* [ ] Kurangi stok saat transaksi tunai
* [ ] Kurangi stok saat transaksi QRIS
* [ ] Kurangi stok saat transaksi bon
* [ ] Jangan kurangi stok jika transaksi gagal
* [ ] Catat stock movement tipe `sale`

### Milestone Stok 3 — Koreksi Stok

Checklist:

* [ ] Tambah stok manual
* [ ] Kurangi stok manual
* [ ] Set stok manual
* [ ] Catat stock movement
* [ ] Tampilkan riwayat stok produk

### Milestone Stok 4 — Stok Menipis

Checklist:

* [ ] Deteksi stok menipis
* [ ] Deteksi stok habis
* [ ] Filter produk stok menipis
* [ ] Filter produk stok habis
* [ ] Tampilkan di laporan

### Milestone Stok 5 — Laporan Stok

Checklist:

* [ ] Total produk aktif
* [ ] Total stok menipis
* [ ] Total stok habis
* [ ] Total nilai stok modal
* [ ] Daftar barang perlu dibeli

---

## 19. Testing Manajemen Stok

Test wajib:

* [ ] Tambah produk dengan stok awal
* [ ] Tambah produk tanpa stok awal
* [ ] Edit stok produk
* [ ] Transaksi mengurangi stok
* [ ] Transaksi bon mengurangi stok
* [ ] Transaksi QRIS mengurangi stok setelah “Sudah Dibayar”
* [ ] Produk tanpa pantau stok tidak berkurang
* [ ] Tambah stok manual
* [ ] Kurangi stok manual
* [ ] Set stok manual
* [ ] Stok menipis muncul
* [ ] Stok habis muncul
* [ ] Stok minus tetap bisa tercatat jika diizinkan
* [ ] Riwayat stock movement tersimpan

---

## 20. Prioritas Final Manajemen Stok

Prioritas MVP:

```txt
1. Stok awal produk
2. Stok berkurang otomatis saat transaksi
3. Tambah stok manual
4. Koreksi stok manual
5. Stok minimum
6. Daftar stok menipis
7. Laporan nilai stok sederhana
```

Tidak masuk MVP:

```txt
Multi-gudang
Batch expired
Supplier management
Purchase order
Barcode scanner lanjutan
Retur kompleks
Akuntansi persediaan
```

---

## 21. Kesimpulan

Manajemen stok untuk MVP harus sederhana:

```txt
Stok produk
Stok minimum
Stok berkurang otomatis
Tambah stok
Koreksi stok
Stok menipis
```

Fitur ini cukup untuk membantu Warung Madura mengontrol barang tanpa membuat aplikasi terasa rumit.
