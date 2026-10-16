# Sesi & Link

Admin membuat sesi lomba dan langsung mendapat link untuk tiap peran.

## Spesifikasi

### Tujuan
Memberi admin cara cepat membuat sesi lomba sekali jalan, lengkap dengan link dan PIN untuk moderator, layar penonton, dan HP regu, sehingga acara siap dijalankan tanpa mengatur satu per satu.
### Selesai bila
- Admin bisa membuat sesi baru dengan mengisi nama acara, dan sesi itu langsung tersimpan serta muncul di daftar sesi miliknya.
- Setelah sesi dibuat, sistem menampilkan tiga link (moderator, layar penonton, HP regu) beserta PIN masing-masing dalam satu tampilan.
- Admin bisa menyalin tiap link dan PIN dengan satu klik, dan dapat membagikannya ke moderator serta regu.
- Tiap link hanya bisa dibuka oleh peran yang sesuai setelah memasukkan PIN yang benar.
- Admin bisa membuka ulang sesi kapan saja untuk melihat link dan PIN yang sama.

## Sub-fitur: Buat Sesi Baru

Admin memulai sesi lomba baru untuk satu acara.

### Tujuan
Agar admin bisa memulai acara baru dengan mencatat nama lomba sebagai wadah skor, regu, dan tautan peran.
### Selesai bila
- Admin mengisi nama acara lalu menekan tombol buat, dan sesi baru langsung muncul di daftar sesi.
- Sesi baru tampil berstatus belum dimulai (draft) sampai admin mengaktifkannya.
- Nama sesi bisa dibedakan dengan jelas dari sesi lain di daftar.

## Sub-fitur: 3 Link Otomatis

Sistem membuat link moderator, layar penonton, dan HP regu sekaligus.

### Tujuan
Agar admin tidak perlu membuat link satu per satu — ketiga tautan peran langsung tersedia begitu sesi dibuat.
### Selesai bila
- Setelah sesi dibuat, tampil tiga link berbeda: untuk moderator, layar penonton, dan HP regu.
- Tiap link mengarah ke halaman yang sesuai dengan perannya ketika dibuka.
- Link tetap sama setiap kali admin membuka detail sesi yang sama.

## Sub-fitur: PIN Peran

PIN menjaga agar tiap orang masuk ke dashboard yang benar.

### Tujuan
Agar hanya orang dengan PIN yang tepat bisa masuk ke dashboard sesuai perannya, sehingga jalannya lomba tetap aman dan tertib.
### Selesai bila
- Setiap peran (moderator, layar penonton, regu) punya PIN sendiri yang dibuat otomatis saat sesi dibuat.
- Orang yang salah memasukkan PIN ditolak dengan pesan yang jelas dan bisa mencoba lagi.
- Admin bisa melihat PIN tiap peran kapan saja dari halaman sesi.

## Sub-fitur: Bagikan Link

Admin menyalin dan membagikan link ke panitia dan regu.

### Tujuan
Agar admin bisa membagikan akses ke moderator, penonton, dan regu dengan cepat tanpa salah kirim.
### Selesai bila
- Admin bisa menyalin tiap link beserta PIN-nya dengan satu klik, dan muncul konfirmasi 'tersalin'.
- Tampilan berbagi menandai dengan jelas link mana untuk moderator, layar penonton, dan regu agar tidak tertukar.

## Task

### 1. Bangun halaman daftar sesi dengan data tiruan

### 2. Buat form buat sesi dengan data tiruan

### 3. Buat halaman detail sesi tiga link

### 4. Tambah tombol salin link & PIN

### 5. Buat halaman gerbang PIN per peran

### 6. Poles tampilan responsif kartu link sesi

### 7. Buat tabel sesi, peran, link, PIN

### 8. Buat auth admin & proteksi endpoint sesi

### 9. Buat generator link unik & PIN peran

### 10. Buat endpoint buat sesi baru

### 11. Buat endpoint daftar & detail sesi

### 12. Buat endpoint verifikasi PIN per peran
