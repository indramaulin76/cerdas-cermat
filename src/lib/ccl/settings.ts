/**
 * Aturan dasar lomba: waktu menjawab (cooldown) dan nilai poin.
 *
 * Nilai-nilai ini dipakai aba-aba regu (hitung mundur) dan perhitungan skor.
 * Batas wajar di sini sejalan dengan validasi server (`src/server/session.ts`)
 * supaya isian yang tidak masuk akal ditolak lebih awal di klien.
 */

export type CompetitionSettings = {
  /** Lama waktu menjawab dalam detik. */
  cooldownSeconds: number;
  /** Poin untuk jawaban benar. */
  correctPoints: number;
  /** Poin untuk jawaban salah (biasanya negatif). */
  wrongPoints: number;
};

/** Nilai awal yang masuk akal agar lomba bisa langsung dimulai. */
export const DEFAULT_SETTINGS: CompetitionSettings = {
  cooldownSeconds: 10,
  correctPoints: 100,
  wrongPoints: -50,
};

/** Batas isian yang wajar untuk tiap bidang. */
export const SETTINGS_LIMITS = {
  cooldownSeconds: { min: 1, max: 600 },
  points: { min: -1000, max: 1000 },
} as const;
