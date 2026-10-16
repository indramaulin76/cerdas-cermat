/**
 * Tipe domain inti Cerdas Cermat Live.
 *
 * Dipakai bersama oleh dashboard regu, moderator, dan layar penonton.
 * Untuk saat ini halaman regu berjalan di atas data tiruan (lihat
 * `src/lib/mock/session.ts`), tetapi bentuk tipe ini sengaja dibuat sama
 * dengan kontrak API yang akan menyusul di layer backend.
 */

/** Satu regu peserta lomba. */
export type Team = {
  id: string;
  /** Nama regu yang tampil di layar, mis. "Regu Elang". */
  name: string;
  /** Warna identitas regu (hex) untuk aksen tombol & papan skor. */
  color: string;
  /** Skor saat ini. */
  score: number;
};

/** Satu sesi lomba beserta pengaturannya. */
export type Session = {
  id: string;
  title: string;
  /** Lama waktu menjawab (cooldown) dalam detik. */
  cooldownSeconds: number;
  /** Poin untuk jawaban benar. */
  correctPoints: number;
  /** Poin untuk jawaban salah (nilai negatif). */
  wrongPoints: number;
  teams: Team[];
};

/**
 * Status sebuah sesi lomba.
 * - `draft`    — belum dimulai (masih disiapkan admin).
 * - `active`   — sedang berjalan.
 * - `finished` — sudah selesai.
 */
export type SessionStatus = "draft" | "active" | "finished";

/** Ringkasan satu sesi untuk daftar sesi milik admin. */
export type SessionSummary = {
  id: string;
  title: string;
  status: SessionStatus;
  /** Waktu dibuat (ISO-8601). */
  createdAt: string;
  /** Jumlah regu peserta pada sesi ini. */
  teamCount: number;
};

/**
 * Fase tombol jawab regu.
 * - `waiting`   — layar siap menunggu, moderator belum membuka soal.
 * - `countdown` — aba-aba: hitungan mundur sebelum tombol aktif (adil & serentak).
 * - `open`      — soal dibuka, tombol aktif dan cooldown berjalan.
 * - `locked`    — tombol terkunci otomatis (sudah ada yang menjawab / waktu habis).
 */
export type BuzzerPhase = "waiting" | "countdown" | "open" | "locked";

/** Alasan tombol terkunci. */
export type BuzzerLockReason =
  /** Regu ini yang menekan lebih dulu. */
  | "self"
  /** Regu lain menekan lebih dulu. */
  | "rival"
  /** Cooldown habis sebelum ada yang menekan. */
  | "timeout";

/** Pemenang / regu tercepat pada satu soal. */
export type BuzzWinner = {
  teamId: string;
  name: string;
  /** Kecepatan reaksi sejak soal dibuka (milidetik). */
  reactionMs: number;
};

/** Snapshot state tombol jawab untuk satu regu. */
export type BuzzerState = {
  phase: BuzzerPhase;
  /** Timestamp monotonik (`performance.now`) saat soal dibuka. */
  openedAt: number | null;
  /** Timestamp monotonik saat aba-aba selesai & tombol mulai aktif. */
  armAt: number | null;
  /** Timestamp monotonik saat cooldown berakhir. */
  deadlineAt: number | null;
  /**
   * Sisa waktu (milidetik): sisa aba-aba saat `countdown`,
   * atau sisa cooldown saat `open`.
   */
  remainingMs: number;
  /** Reaksi regu ini saat menekan (milidetik), bila ia yang menekan. */
  reactionMs: number | null;
  winner: BuzzWinner | null;
  lockReason: BuzzerLockReason | null;
};
