# Dashboard Moderator

Pusat kendali moderator untuk memimpin jalannya lomba secara langsung.

## Spesifikasi

### Tujuan
Pusat kendali moderator untuk memimpin jalannya lomba cerdas cermat secara langsung, dari membuka soal sampai mengatur skor regu.

### Selesai bila
- Moderator bisa masuk ke dashboard ini memakai PIN yang diberikan admin.
- Dari satu layar, moderator bisa membuka soal, melihat regu tercepat, mengatur poin, dan mengatur waktu jawab tanpa berpindah-pindah halaman.
- Setiap aksi moderator (buka soal, ubah poin, ubah waktu) langsung terlihat oleh regu di HP dan penonton di layar besar.
- Ada penanda jelas kapan soal sedang terbuka dan kapan jawaban sudah terkunci.
- Tampilan nyaman dipakai di laptop maupun tablet, dengan tombol-tombol besar yang mudah ditekan cepat saat lomba berlangsung.

## Sub-fitur: Mulai & Ulang Soal

Moderator membuka soal dan mengulang hitungan untuk ronde berikutnya.

### Tujuan
Moderator membuka soal agar regu boleh menekan tombol jawab, dan bisa mengulang hitungan untuk ronde berikutnya.

### Selesai bila
- Moderator punya satu tombol untuk membuka soal; begitu ditekan, HP semua regu berubah dari "menunggu" menjadi "siap menjawab".
- Moderator bisa mengulang/mengosongkan ronde, sehingga urutan jawab dan status tombol regu kembali bersih untuk soal berikutnya.
- Status soal (belum dibuka / sedang terbuka / sudah dikunci) terlihat jelas di layar moderator.

## Sub-fitur: Urutan Jawab Tercepat

Moderator melihat urutan regu yang menekan tombol lebih dulu.

### Tujuan
Moderator melihat urutan regu yang menekan tombol lebih dulu, supaya penentuan siapa yang menjawab jadi adil dan cepat.

### Selesai bila
- Begitu ada regu menekan tombol, nama regu itu langsung muncul di daftar urutan paling atas tanpa moderator perlu menyegarkan layar.
- Daftar menampilkan urutan lengkap regu yang menekan, dengan penanda jelas untuk regu tercepat (mis. label "Tercepat").
- Regu yang belum menekan tidak ikut masuk daftar, dan setelah ronde diulang daftar kembali kosong.

## Sub-fitur: Tambah & Kurangi Poin

Moderator mengatur skor regu yang langsung tampil ke penonton.

### Tujuan
Moderator mengatur skor tiap regu langsung dari dashboard, dan hasilnya seketika tampil ke penonton.

### Selesai bila
- Setiap regu punya tombol tambah dan kurang poin yang bisa ditekan cepat saat lomba berlangsung.
- Skor regu langsung berubah di dashboard moderator dan otomatis ikut berubah di layar penonton tanpa aksi tambahan.
- Angka skor tiap regu tampil jelas dan mudah dibaca sekilas (termasuk urutan sementara dari skor tertinggi).

## Sub-fitur: Ubah & Ulang Cooldown

Moderator bisa menggeser atau mengulang waktu jawab saat lomba berjalan.

### Tujuan
Moderator bisa menggeser atau mengulang waktu jawab saat lomba berjalan, agar tempo lomba tetap terkendali.

### Selesai bila
- Moderator bisa menambah atau mengurangi durasi waktu jawab saat ronde sedang berjalan.
- Ada tombol untuk mengulang hitungan waktu dari awal pada soal yang sama.
- Sisa waktu terlihat jelas sebagai hitungan mundur, dan perubahan waktu langsung terbaca oleh regu di HP.

## Task

### 1. Bangun layout utama dashboard moderator dengan data tiruan

### 2. Buat panel status soal dan tombol buka ulang soal

### 3. Buat panel urutan jawab tercepat dengan simulasi realtime

### 4. Buat panel skor regu dengan tombol tambah kurang poin

### 5. Buat panel kontrol cooldown waktu jawab dengan hitungan mundur

### 6. Perhalus tampilan responsif laptop tablet dengan tombol besar

### 7. Buat skema database sesi regu ronde skor dan buzz

### 8. Buat autentikasi PIN moderator per sesi

### 9. Buat API buka ulang dan status soal ronde

### 10. Buat API buzz dan urutan jawab regu tercepat

### 11. Buat API tambah kurang poin dan pembaruan skor regu

### 12. Buat API pengaturan cooldown dan sinkronisasi waktu jawab

### 13. Buat kanal realtime siaran status ke regu dan penonton
