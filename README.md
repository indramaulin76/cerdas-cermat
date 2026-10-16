# Cerdas Cermat Live

Aplikasi lomba cerdas cermat real-time dengan dashboard panitia, moderator,
regu, dan layar penonton. Aplikasi memakai Next.js, Neon PostgreSQL, Drizzle
ORM, dan Ably Realtime.

## Menjalankan secara lokal

Salin `.env.example` ke `.env`, lalu isi `DATABASE_URL` dengan koneksi
PostgreSQL Neon dan `ABLY_API_KEY` dengan API key server dari aplikasi Ably.
Jangan masukkan nilai rahasia tersebut ke Git.

```bash
npm install
npm run db:migrate
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Kredensial admin bootstrap
ditentukan oleh `CCL_ADMIN_EMAIL` dan `CCL_ADMIN_PASSWORD`; atur kata sandi
yang kuat bahkan untuk penggunaan lokal.

## Konfigurasi

Variabel lingkungan berikut dapat disetel:

| Variabel | Kegunaan | Nilai lokal bawaan |
| --- | --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL/Neon | Wajib |
| `ABLY_API_KEY` | API key server Ably; tidak pernah dikirim ke browser | Wajib |
| `CCL_ADMIN_EMAIL` | Email akun admin bootstrap | Wajib di produksi |
| `CCL_ADMIN_PASSWORD` | Kata sandi akun admin bootstrap | Wajib di produksi |
| `CCL_AUTH_SECRET` | Rahasia HMAC untuk cookie login | Wajib di produksi |

Untuk produksi, wajib set `CCL_ADMIN_EMAIL`, `CCL_ADMIN_PASSWORD`, dan
`CCL_AUTH_SECRET`; aplikasi menolak autentikasi bootstrap/token bila
konfigurasinya tidak tersedia. Gunakan kata sandi yang kuat serta rahasia
acak yang panjang (minimal 32 byte), dan simpan nilainya melalui pengelola
rahasia lingkungan deployment, bukan di repositori.

Contoh membuat rahasia secara lokal:

```bash
openssl rand -hex 32
```

`DATABASE_URL` harus menunjuk ke database PostgreSQL persisten dan dapat
diakses oleh aplikasi. Setelah perubahan skema, tinjau berkas SQL di
`drizzle-postgres/`, kemudian jalankan `npm run db:migrate`. Jangan gunakan
`db:push` pada database produksi.

Data SQLite lokal lama tidak dihapus. Setelah migrasi skema PostgreSQL selesai,
salin data secara satu arah dan idempoten dengan `npm run db:import:sqlite`.
Skrip membaca `./data/ccl.db` (atau `SQLITE_SOURCE_PATH` bila disetel), tidak
mengubah sumber, dan hanya menambahkan baris yang belum ada di PostgreSQL.

## Alur lomba live

Moderator membuka soal dengan **Siap**. Regu dapat menekan tombol buzz satu
kali; urutan tekanan tampil langsung dan moderator memilih regu yang menjawab.
Timer dimulai saat regu dipilih. Saat waktu habis, giliran tetap di regu itu
sampai moderator mencatat hasil atau memilih regu lain. Jawaban salah
memerlukan pilihan pengurangan 50, 75, atau 100 poin dan moderator menekan
**Regu berikutnya**. Jawaban benar menambah 100 poin dan menutup soal. Timer dan
skor disiarkan ke layar penonton; **Ulangi / Reset** mengembalikan moderator ke
Standby.

## Validasi

```bash
npm run typecheck
npm run lint
npm run build
```

## Catatan deployment

Untuk Vercel, atur `DATABASE_URL`, `ABLY_API_KEY`, `CCL_ADMIN_EMAIL`,
`CCL_ADMIN_PASSWORD`, dan `CCL_AUTH_SECRET` pada environment project. Terapkan
migrasi PostgreSQL sebelum deployment. API key Ably hanya dipakai di server;
klien menerima token berumur terbatas yang hanya dapat subscribe ke kanal sesi
dan audiensnya. Live (moderator/regu) dan penonton memakai kanal terpisah.
