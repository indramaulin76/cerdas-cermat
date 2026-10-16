# Pengaturan Lomba

Admin mengatur aturan dasar seperti waktu menjawab dan nilai poin.

## Spesifikasi

### Tujuan
Admin bisa mengatur aturan dasar lomba — berapa lama waktu menjawab dan berapa nilai poin — supaya jalannya lomba sesuai keinginan panitia.

### Selesai bila
- Admin membuka satu halaman pengaturan lomba yang berisi isian waktu menjawab dan nilai poin.
- Admin bisa mengubah isian tersebut lalu menyimpannya.
- Perubahan yang disimpan langsung dipakai saat lomba berjalan.
- Sudah ada nilai awal yang masuk akal sehingga lomba bisa langsung dimulai tanpa mengatur apa pun.
- Isian yang tidak wajar (mis. waktu 0 detik atau poin bukan angka) ditolak dengan pesan singkat.

## Sub-fitur: Set Waktu Cooldown

Admin menetapkan berapa lama waktu untuk menjawab.

### Tujuan
Admin menetapkan berapa lama regu punya waktu untuk menjawab pada tiap soal.

### Selesai bila
- Admin bisa memasukkan durasi waktu menjawab dalam detik dengan satuan yang jelas (mis. "10 detik").
- Durasi yang dipilih tersimpan dan jadi hitungan mundur saat moderator membuka soal.
- Isian 0, angka minus, atau bukan angka ditolak dengan pesan singkat.

## Sub-fitur: Atur Nilai Poin

Admin menentukan poin untuk jawaban benar atau salah.

### Tujuan
Admin menentukan berapa poin yang didapat regu untuk jawaban benar dan berapa yang dikurangi untuk jawaban salah.

### Selesai bila
- Admin bisa mengisi nilai poin benar dan poin salah secara terpisah, dengan keterangan jelas mana penambahan dan mana pengurangan.
- Nilai poin yang diatur langsung tercermin saat moderator menambah atau mengurangi poin regu.
- Isian bukan angka ditolak dengan pesan singkat.

## Sub-fitur: Simpan Pengaturan

Pengaturan tersimpan jadi bisa dipakai ulang di acara berikutnya.

### Tujuan
Pengaturan lomba tersimpan agar bisa dipakai ulang di acara berikutnya tanpa mengatur ulang dari awal.

### Selesai bila
- Pengaturan yang sudah diisi tetap ada saat halaman dibuka lagi atau sesi baru dibuat.
- Admin bisa memakai pengaturan terakhir sebagai nilai awal dan mengubahnya kapan saja.
- Setelah disimpan, muncul tanda singkat bahwa pengaturan berhasil disimpan.

## Task

### 1. Buat halaman pengaturan lomba dengan data tiruan

### 2. Buat form waktu menjawab dengan validasi

### 3. Buat form nilai poin benar dan salah

### 4. Buat muat dan simpan pengaturan dengan notifikasi

### 5. Buat tabel pengaturan lomba dan migrasi

### 6. Buat endpoint baca dan simpan pengaturan

### 7. Terapkan validasi dan nilai default pengaturan

### 8. Pakai pengaturan tersimpan saat lomba berjalan
