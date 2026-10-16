# Cerdas Cermat Live

Aplikasi lomba cerdas cermat real-time dengan dashboard panitia, moderator,
regu, dan layar penonton. Aplikasi memakai Next.js, SQLite, dan Drizzle ORM.

## Menjalankan secara lokal

```bash
npm install
npm run db:migrate
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Secara lokal, akun awal
adalah `admin@ccl.local` dengan kata sandi `panitia`. Ganti kredensial ini
sebelum menggunakan aplikasi di luar mesin pengembangan.

## Konfigurasi

Variabel lingkungan berikut dapat disetel:

| Variabel | Kegunaan | Nilai lokal bawaan |
| --- | --- | --- |
| `DATABASE_URL` | Lokasi berkas SQLite yang digunakan Drizzle | `./data/ccl.db` |
| `CCL_ADMIN_EMAIL` | Email akun panitia awal | `admin@ccl.local` |
| `CCL_ADMIN_PASSWORD` | Kata sandi akun panitia awal | `panitia` |
| `CCL_AUTH_SECRET` | Rahasia HMAC untuk cookie login | Rahasia pengembangan tetap |

Untuk produksi, wajib set `CCL_ADMIN_EMAIL`, `CCL_ADMIN_PASSWORD`, dan
`CCL_AUTH_SECRET`; aplikasi menolak autentikasi bootstrap/token bila
konfigurasinya tidak tersedia. Gunakan kata sandi yang kuat serta rahasia
acak yang panjang (minimal 32 byte), dan simpan nilainya melalui pengelola
rahasia lingkungan deployment, bukan di repositori.

Contoh membuat rahasia secara lokal:

```bash
openssl rand -hex 32
```

`DATABASE_URL` harus menunjuk ke penyimpanan persisten dan dapat ditulis oleh
proses aplikasi. Setelah perubahan skema, tinjau berkas SQL di `drizzle/`,
kemudian jalankan `npm run db:migrate` sebelum menjalankan versi aplikasi yang
baru. Jangan gunakan `db:push` pada database produksi.

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

SSE dan bus peristiwa saat ini berjalan dalam satu proses server Node.js.
Jalankan satu instance aplikasi dengan SQLite pada disk persisten; deployment
serverless atau multi-instance memerlukan pub/sub bersama dan database yang
mendukung banyak instance sebelum digunakan untuk acara live.
