# Tombol Jawab Regu

Regu menekan tombol di HP masing-masing dan sistem langsung tahu siapa yang paling cepat.

## Spesifikasi

### Tujuan
Memberi setiap regu tombol jawab di HP agar penentuan siapa yang paling cepat menjawab jadi adil, akurat, dan bebas perdebatan.

### Selesai bila
- Setiap regu punya satu tombol jawab besar di HP-nya yang bisa ditekan saat soal dibuka.
- Tekanan pertama dari regu mana pun langsung tercatat sistem sebagai yang tercepat tanpa jeda yang terasa.
- Setelah satu regu menekan, tombol di regu itu terkunci dan tidak bisa mengirim jawaban dobel.
- HP regu selalu menampilkan status yang jelas: siap menunggu, boleh menekan, atau sudah terkunci.
- Semua tetap lancar saat dipakai hingga 10 regu bersamaan.

## Sub-fitur: Tombol Jawab Besar

Tombol raksasa di HP regu yang gampang ditekan secepat mungkin.

### Tujuan
Menyediakan tombol raksasa di HP regu supaya peserta bisa menekan secepat mungkin tanpa salah pencet.

### Selesai bila
- Tombol tampil besar dan dominan di layar HP sehingga mudah dijangkau jempol.
- Tombol tetap terlihat dan nyaman dipakai di berbagai ukuran layar HP.
- Saat ditekan, tombol langsung memberi umpan balik yang terlihat sehingga peserta tahu tekanannya masuk.

## Sub-fitur: Deteksi Klik Pertama

Sistem langsung menandai regu yang menekan paling duluan tanpa delay.

### Tujuan
Memastikan sistem tahu pasti regu mana yang menekan paling dulu, tanpa delay dan tanpa tuduhan curang.

### Selesai bila
- Saat soal dibuka, tekanan pertama dari regu mana pun langsung tercatat sebagai yang tercepat.
- Penanda regu tercepat muncul di dashboard moderator seketika setelah tombol ditekan.
- Bila dua regu menekan hampir bersamaan, sistem tetap menetapkan satu pemenang secara konsisten.

## Sub-fitur: Status Terkunci Otomatis

Tombol terkunci setelah ditekan supaya tidak ada jawaban dobel.

### Tujuan
Mengunci tombol regu begitu ditekan supaya tidak ada jawaban dobel dan jalannya lomba tetap sah.

### Selesai bila
- Setelah regu menekan, tombol di HP regu itu berubah jadi terkunci dan tidak mengirim sinyal lagi.
- Percobaan menekan ulang tidak mengubah urutan maupun menambah jawaban baru.
- Kunci terbuka kembali hanya saat moderator membuka soal atau cooldown baru.

## Sub-fitur: Layar Siap Menunggu

HP regu menunjukkan kapan harus bersiap dan menunggu aba-aba.

### Tujuan
Menunjukkan ke regu kapan harus bersiap dan kapan boleh menekan, supaya tidak ada yang menekan terlalu awal atau kebingungan.

### Selesai bila
- HP regu menampilkan layar "siap menunggu" dengan status yang jelas sebelum soal dibuka.
- Saat moderator membuka soal, layar berubah jadi aba-aba "sekarang boleh menekan" yang langsung terlihat.
- Setelah regu menekan atau waktu habis, layar menampilkan hasil singkat (mis. "Kamu terkunci" atau "Kamu tercepat") lalu kembali ke keadaan siap untuk soal berikutnya.

## Task

### 1. Buat halaman tombol jawab regu dengan data tiruan

### 2. Buat komponen tombol jawab raksasa responsif

### 3. Buat umpan balik visual saat tombol ditekan

### 4. Buat layar status siap menunggu dan aba-aba

### 5. Buat kunci otomatis tombol setelah ditekan

### 6. Buat tampilan hasil singkat lalu reset ke siap

### 7. Buat skema dan migrasi tabel regu dan tekanan

### 8. Buat endpoint catat tekanan pertama regu

### 9. Buat endpoint buka soal dan reset kunci

### 10. Buat endpoint status dan kunci regu

### 11. Buat broadcast realtime ke moderator dan regu

### 12. Buat penanganan seri tekanan hampir bersamaan
