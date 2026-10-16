/**
 * Kontrak API Cerdas Cermat Live.
 *
 * Tipe di sini dipakai bersama oleh klien (dashboard regu/moderator/penonton)
 * dan route handler di server, supaya bentuk permintaan & balasan selalu
 * konsisten. Dashboard regu masih berjalan di atas data tiruan, tetapi
 * kontrak ini sengaja dibuat final agar UI tidak perlu berubah saat tersambung
 * ke server sungguhan.
 */

/** Satu catatan tekanan tombol sebagaimana dikirim ke klien. */
export type BuzzEventDto = {
  id: string;
  sessionId: string;
  teamId: string;
  roundId: string | null;
  /** Kecepatan reaksi sejak soal dibuka (milidetik). */
  reactionMs: number;
  /** Penanda regu tercepat pada ronde ini. */
  isFirst: boolean;
  /** Waktu tekan dalam format ISO-8601. */
  createdAt: string;
};

/** Permintaan mencatat tekanan tombol jawab. */
export type RecordBuzzRequest = {
  /** Regu yang menekan tombol. */
  teamId: string;
  /** Soal/ronde yang sedang berjalan (opsional bila ronde belum dipakai). */
  roundId?: string | null;
  /** Kecepatan reaksi sejak soal dibuka (milidetik). */
  reactionMs: number;
};

/** Balasan sukses dari endpoint catat tekanan. */
export type RecordBuzzResponse = {
  ok: true;
  /** `true` bila tekanan ini mengulang tekanan yang sudah tercatat. */
  duplicate: boolean;
  /** `true` bila regu ini adalah yang tercepat pada ronde ini. */
  isFirst: boolean;
  /** Urutan tekanan (1 = tercepat). */
  order: number;
  event: BuzzEventDto;
};

/** Balasan galat standar. */
export type ApiErrorResponse = {
  ok: false;
  /** Kode galat singkat, mis. "unknown_team". */
  error: string;
  message?: string;
};

/** Format balasan endpoint catat tekanan, sukses maupun gagal. */
export type BuzzApiResponse = RecordBuzzResponse | ApiErrorResponse;

/** Endpoint catat tekanan tombol jawab untuk sebuah sesi. */
export function buzzPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/buzz`;
}
