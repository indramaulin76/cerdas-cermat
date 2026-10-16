# Kelola Regu

Admin mengatur jumlah dan nama regu peserta sebelum lomba dimulai.

## Spesifikasi

### Tujuan
Admin bisa menyiapkan daftar regu peserta (jumlah, nama, dan identitas) sebelum lomba dimulai, supaya seluruh sistem tahu regu mana saja yang ikut bertanding.

### Selesai bila
- Admin dapat menambah atau mengurangi jumlah regu peserta, dengan batas maksimal 10 regu.
- Setiap regu punya nama yang bisa diisi dan diubah admin.
- Setiap regu punya warna sendiri yang otomatis tampil berbeda dari regu lain.
- Daftar regu tersimpan ke sesi lomba, sehingga jumlah, nama, dan warna yang sama muncul di dashboard moderator, layar penonton, dan HP regu.
- Tampilan pengaturan regu nyaman dipakai di layar kecil maupun besar, dan perubahan langsung terlihat tanpa perlu memuat ulang halaman.

## Sub-fitur: Atur Jumlah Regu

Admin menentukan jumlah regu yang ikut, maksimal 10 regu.

### Tujuan
Admin menentukan berapa banyak regu yang ikut bertanding dalam sesi lomba, maksimal 10 regu.

### Selesai bila
- Admin bisa menambah jumlah regu satu per satu dan menguranginya kembali sebelum lomba dimulai.
- Sistem menolak penambahan saat jumlah regu sudah mencapai 10, dengan pesan yang jelas ke admin.
- Jumlah regu yang dipilih langsung terlihat di ringkasan sesi (mis. "8 regu peserta").

## Sub-fitur: Beri Nama Regu

Admin mengisi nama tiap regu sesuai peserta.

### Tujuan
Admin mengisi nama setiap regu sesuai peserta yang terdaftar, agar tiap regu dikenali jelas selama lomba.

### Selesai bila
- Admin bisa mengetik dan mengubah nama untuk tiap regu pada daftar regu.
- Nama yang diisi langsung tampil di daftar regu dan tersimpan ke sesi lomba.
- Sistem mencegah nama regu kosong atau nama yang sama dipakai dua regu.

## Sub-fitur: Warna & Identitas Regu

Tiap regu punya warna sendiri agar mudah dibedakan.

### Tujuan
Tiap regu diberi warna identitas sendiri supaya mudah dibedakan di dashboard moderator, layar penonton, dan HP masing-masing regu.

### Selesai bila
- Setiap regu otomatis mendapat warna berbeda yang tidak sama dengan regu lain.
- Admin bisa mengganti warna tiap regu bila ingin menyesuaikan sendiri.
- Warna regu tampil konsisten di seluruh tampilan (daftar regu, moderator, dan layar penonton).

## Task

### 1. Bangun halaman kelola regu dengan data tiruan

### 2. Buat kontrol tambah kurang regu batas 10

### 3. Buat input edit nama regu dengan validasi

### 4. Terapkan warna otomatis dan pemilih warna

### 5. Tampilkan ringkasan regu dan layout responsif

### 6. Buat tabel regu dan migrasi database

### 7. Buat endpoint daftar dan tambah regu

### 8. Buat endpoint ubah nama dan warna regu

### 9. Buat endpoint hapus regu dengan validasi

### 10. Sediakan endpoint sinkronisasi regu lintas dashboard
