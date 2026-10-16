# Login Admin

Panitia masuk dengan akun untuk mengatur seluruh jalannya acara.

## Spesifikasi

### Tujuan
Panitia dapat masuk dengan akun sendiri agar hanya orang berwenang yang bisa mengatur seluruh jalannya acara.

### Selesai bila
- Panitia bisa mengisi email dan kata sandi lalu masuk ke halaman pengaturan acara.
- Bila email atau kata sandi salah, muncul pesan yang jelas dan panitia tidak bisa masuk.
- Setelah berhasil masuk, panitia langsung melihat halaman utama pengaturan acara, bukan halaman kosong.
- Panitia dapat menambah panitia lain dan keluar dari perangkat dengan aman.
- Halaman masuk tampil rapi dan nyaman dipakai di HP maupun laptop.

## Sub-fitur: Masuk Admin

Panitia masuk dengan akun untuk mulai mengatur acara.

### Tujuan
Panitia dapat masuk dengan akun agar bisa mulai mengatur acara.

### Selesai bila
- Ada halaman masuk dengan kolom email, kata sandi, dan tombol masuk yang jelas.
- Bila data benar, panitia langsung dibawa ke halaman pengaturan acara.
- Bila data salah atau kosong, muncul pesan kesalahan yang mudah dimengerti.

## Sub-fitur: Kelola Akun Panitia

Beberapa panitia bisa diberi akses ke pengaturan acara.

### Tujuan
Admin dapat memberi akses ke beberapa panitia agar acara bisa diatur bersama.

### Selesai bila
- Admin melihat daftar akun panitia yang punya akses ke acara.
- Admin bisa menambah akun panitia baru (nama, email, kata sandi) serta mengubah atau menghapus aksesnya.
- Perubahan akun langsung berlaku saat panitia tersebut masuk.

## Sub-fitur: Keluar Aman

Panitia bisa keluar dari perangkat dengan aman setelah acara.

### Tujuan
Panitia dapat keluar dari perangkat dengan aman setelah acara selesai.

### Selesai bila
- Ada tombol keluar yang terlihat jelas di halaman panitia.
- Setelah keluar, panitia kembali ke halaman masuk dan tidak bisa membuka halaman pengaturan tanpa masuk lagi.
- Saat keluar di perangkat bersama, akun tidak tertinggal dalam keadaan sudah masuk.

## Task

### 1. Buat halaman login admin responsif

### 2. Buat validasi dan pesan error login

### 3. Buat halaman utama pengaturan acara

### 4. Buat halaman kelola akun panitia

### 5. Buat tombol keluar dan alur kembali

### 6. Buat skema dan migrasi akun panitia

### 7. Buat service autentikasi dan hash kata sandi

### 8. Buat endpoint login dan sesi panitia

### 9. Buat middleware proteksi halaman pengaturan

### 10. Buat endpoint kelola akun panitia

### 11. Buat endpoint logout dan hapus sesi
