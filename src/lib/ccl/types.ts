/**
 * Tipe domain yang masih dipakai komponen-komponen Cerdas Cermat Live.
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

/**
 * Status sebuah sesi lomba.
 * - `draft`    — belum dimulai (masih disiapkan admin).
 * - `active`   — sedang berjalan.
 * - `finished` — sudah selesai.
 */
export type SessionStatus = "draft" | "active" | "finished";
