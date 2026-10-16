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

/**
 * Sorotan regu tercepat di layar penonton.
 *
 * `teamId` berisi regu yang sedang disorot, atau `null` bila tidak ada sorotan
 * (mis. sebelum soal dibuka atau setelah soal baru diulang). `event` membawa
 * data tekanan tercepat untuk keperluan animasi.
 */
export type HighlightDto = {
  teamId: string | null;
  event: BuzzEventDto | null;
};

/** Format balasan endpoint catat tekanan, sukses maupun gagal. */
export type BuzzApiResponse = RecordBuzzResponse | ApiErrorResponse;

/** Bentuk ronde untuk dikirim ke klien. */
export type RoundDto = {
  id: string;
  sessionId: string;
  orderNumber: number;
  status: "draft" | "open" | "closed";
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
};

/** Permintaan membuka soal (membuka ronde dan mereset kunci). */
export type OpenRoundRequest = Record<string, never>;

/** Balasan membuka soal. */
export type OpenRoundResponse = {
  ok: true;
  round: RoundDto;
};

/** Balasan status regu per ronde. */
export type TeamStatusResponse = {
  ok: true;
  teamId: string;
  sessionId: string;
  roundId: string | null;
  locked: boolean;
  buzzed: boolean;
  isFirst: boolean;
  reactionMs: number | null;
  order: number | null;
};

/**
 * Peristiwa realtime sebuah sesi, dialirkan lewat Server-Sent Events (SSE).
 *
 * Dashboard regu, moderator, dan layar penonton berlangganan aliran yang sama
 * sehingga perubahan (soal dibuka, regu menekan) tampil nyaris seketika.
 */
export type SessionEvent =
  /** Moderator membuka soal baru: kunci regu direset & aba-aba dimulai. */
  | {
      type: "round.opened";
      at: string;
      round: RoundDto;
      /** Momen tombol mulai aktif (ISO) untuk sinkronisasi aba-aba. */
      armAt: string;
      /** Lama jendela jawab (detik). */
      cooldownSeconds: number;
    }
  /** Sebuah regu menekan tombol jawab (beserta urutan terkini). */
  | {
      type: "buzz.recorded";
      at: string;
      order: number;
      event: BuzzEventDto;
      /** Urutan lengkap tekanan ronde ini (indeks 0 = tercepat). */
      ranking: BuzzEventDto[];
    }
  /** Moderator mengosongkan ronde: urutan & kunci kembali bersih. */
  | { type: "round.reset"; at: string; roundId: string | null }
  /** Skor sebuah regu berubah: papan skor & penonton ikut diperbarui. */
  | { type: "score.updated"; at: string; team: TeamDto; delta: number }
  /**
   * Sorotan regu tercepat berubah: satu regu mulai disorot di layar penonton,
   * atau sorotan dibersihkan saat soal baru dibuka/diulang.
   */
  | { type: "highlight.updated"; at: string; highlight: HighlightDto }
  /**
   * Daftar regu berubah (tambah/ubah/hapus). Dipakai agar dashboard moderator,
   * layar penonton, dan HP regu ikut sinkron tanpa memuat ulang.
   */
  | {
      type: "teams.updated";
      at: string;
      /** Jenis perubahan, untuk animasi/notifikasi di klien. */
      action: "created" | "updated" | "deleted";
      /** Daftar regu terkini (lengkap, siap menggantikan daftar lama). */
      teams: TeamDto[];
    }
  /** Pengaturan sesi (cooldown/poin) berubah. */
  | { type: "session.updated"; at: string; session: SessionDto }
  /**
   * Cuplikan keadaan terkini, dikirim sekali saat klien baru tersambung supaya
   * regu/penonton yang bergabung di tengah lomba langsung sinkron.
   */
  | {
      type: "state.snapshot";
      at: string;
      session: SessionDto;
      phase: QuestionPhase;
      round: RoundDto | null;
      ranking: BuzzEventDto[];
      /** Sorotan regu tercepat saat ini, atau kosong bila belum ada. */
      highlight: HighlightDto;
      cooldownSeconds: number;
      serverTime: string;
      teams: TeamDto[];
    }
  /** Denyut koneksi agar aliran tidak diputus oleh proxy. */
  | { type: "ping"; at: string };

/** Endpoint catat tekanan tombol jawab untuk sebuah sesi. */
export function buzzPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/buzz`;
}

/** Endpoint aliran peristiwa realtime (SSE) untuk sebuah sesi. */
export function eventsPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/events`;
}

/** Permintaan masuk sebagai moderator memakai PIN. */
export type ModeratorAuthRequest = {
  pin: string;
};

/** Balasan endpoint auth moderator. */
export type ModeratorAuthResponse = {
  ok: true;
  /** `true` bila permintaan ini terautentikasi sebagai moderator. */
  authenticated: boolean;
};

/** Endpoint autentikasi PIN moderator sebuah sesi. */
export function moderatorAuthPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/auth/moderator`;
}

/** Permintaan masuk sebagai penonton memakai PIN. */
export type ViewerAuthRequest = {
  pin: string;
};

/** Balasan endpoint auth layar penonton. */
export type ViewerAuthResponse = {
  ok: true;
  /** `true` bila permintaan ini terautentikasi sebagai penonton. */
  authenticated: boolean;
};

/** Endpoint autentikasi PIN layar penonton sebuah sesi. */
export function viewerAuthPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/auth/viewer`;
}

/* ------------------------------ Panitia (Admin) ------------------------------ */

/** Permintaan masuk sebagai panitia (admin) memakai kata sandi bersama. */
export type AdminLoginRequest = {
  password: string;
};

/** Balasan endpoint auth panitia. */
export type AdminAuthResponse = {
  ok: true;
  /** `true` bila permintaan ini sudah masuk sebagai panitia. */
  authenticated: boolean;
};

/** Endpoint autentikasi panitia (masuk/status/keluar). */
export function adminAuthPath(): string {
  return `/api/admin/auth`;
}

/** Fase soal yang sedang berjalan. */
export type QuestionPhase =
  /** Belum ada soal yang dibuka. */
  | "idle"
  /** Soal terbuka, belum ada regu menekan. */
  | "open"
  /** Sudah ada regu menekan (jawaban terkunci). */
  | "locked";

/** Balasan status soal/ronde untuk moderator. */
export type RoundStatusResponse = {
  ok: true;
  phase: QuestionPhase;
  round: RoundDto | null;
  /** Urutan tekanan ronde ini (indeks 0 = tercepat). */
  ranking: BuzzEventDto[];
  winner: BuzzEventDto | null;
  /** Lama jendela jawab (detik) untuk aba-aba. */
  cooldownSeconds: number;
  /** Waktu server saat ini (ISO) untuk sinkronisasi jam klien. */
  serverTime: string;
};

/** Balasan saat mengosongkan/mengulang ronde. */
export type ResetRoundResponse = {
  ok: true;
  /** Id ronde yang ditutup, atau null bila tidak ada soal aktif. */
  closedRoundId: string | null;
};

/** Endpoint status soal/ronde sebuah sesi. */
export function roundStatusPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/round/status`;
}

/** Endpoint mengosongkan/mengulang ronde sebuah sesi. */
export function resetRoundPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/rounds/reset`;
}

/** Balasan urutan jawab regu tercepat pada sebuah ronde. */
export type BuzzOrderResponse = {
  ok: true;
  roundId: string | null;
  /** Urutan tekanan (indeks 0 = tercepat). */
  ranking: BuzzEventDto[];
  winner: BuzzEventDto | null;
};

/** Endpoint membuka soal (membuka ronde baru). */
export function openRoundPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/rounds/open`;
}

/** Endpoint status kunci/regu. */
export function teamStatusPath(sessionId: string, teamId: string): string {
  return `/api/sessions/${encodeURIComponent(
    sessionId,
  )}/teams/${encodeURIComponent(teamId)}/status`;
}

/** Bentuk regu untuk dikirim ke klien (termasuk skor terkini). */
export type TeamDto = {
  id: string;
  sessionId: string;
  name: string;
  /** Warna identitas regu (hex). */
  color: string;
  score: number;
  createdAt: string;
};

/** Balasan daftar regu sebuah sesi. */
export type TeamsResponse = {
  ok: true;
  teams: TeamDto[];
};

/** Permintaan menambah regu baru. */
export type CreateTeamRequest = {
  /** Nama regu yang tampil di layar. */
  name: string;
  /** Warna identitas opsional (hex). Bila kosong, dipilih otomatis. */
  color?: string;
};

/** Balasan penambahan regu. */
export type CreateTeamResponse = {
  ok: true;
  team: TeamDto;
};

/** Permintaan mengubah identitas regu (nama dan/atau warna). */
export type UpdateTeamRequest = {
  /** Nama baru (opsional). */
  name?: string;
  /** Warna baru, hex (opsional). */
  color?: string;
};

/** Balasan perubahan identitas regu. */
export type UpdateTeamResponse = {
  ok: true;
  team: TeamDto;
};

/** Balasan penghapusan regu (regu yang dihapus dikembalikan untuk konfirmasi). */
export type DeleteTeamResponse = {
  ok: true;
  team: TeamDto;
};

/** Endpoint regu: perbarui/hapus regu tertentu dalam sesi. */
export function teamPath(sessionId: string, teamId: string): string {
  return `/api/sessions/${encodeURIComponent(
    sessionId,
  )}/teams/${encodeURIComponent(teamId)}`;
}

/** Permintaan mengubah skor regu. */
export type UpdateScoreRequest = {
  /** Tambah/kurang poin secara langsung (mis. +100 atau -50). */
  delta?: number;
  /** Atau pakai aturan sesi: "correct" = correctPoints, "wrong" = wrongPoints. */
  outcome?: "correct" | "wrong";
};

/** Balasan pembaruan skor regu. */
export type UpdateScoreResponse = {
  ok: true;
  team: TeamDto;
  /** Poin yang benar-benar diterapkan. */
  delta: number;
};

/** Endpoint daftar regu sebuah sesi. */
export function teamsPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/teams`;
}

/** Endpoint tambah/kurang poin regu. */
export function scorePath(sessionId: string, teamId: string): string {
  return `/api/sessions/${encodeURIComponent(
    sessionId,
  )}/teams/${encodeURIComponent(teamId)}/score`;
}

/** Bentuk sesi lomba untuk dikirim ke klien. */
export type SessionDto = {
  id: string;
  title: string;
  /** Jendela waktu jawab (detik) sejak soal dibuka. */
  cooldownSeconds: number;
  /** Poin untuk jawaban benar. */
  correctPoints: number;
  /** Poin untuk jawaban salah. */
  wrongPoints: number;
  status: "draft" | "active" | "finished";
};

/** Permintaan mengubah pengaturan sesi. */
export type UpdateSettingsRequest = {
  cooldownSeconds?: number;
  correctPoints?: number;
  wrongPoints?: number;
};

/** Balasan pengaturan sesi. */
export type UpdateSettingsResponse = {
  ok: true;
  session: SessionDto;
};

/** Endpoint pengaturan sesi (cooldown & poin). */
export function settingsPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/settings`;
}

/** Data yang dibutuhkan layar penonton: pengaturan sesi + semua regu. */
export type ViewerDataResponse = {
  ok: true;
  session: SessionDto;
  teams: TeamDto[];
};

/**
 * Endpoint data sesi & regu untuk layar penonton.
 *
 * Dipakai layar penonton untuk memuat gambaran awal sebelum aliran realtime
 * (SSE) tersambung.
 */
export function viewerDataPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/viewer`;
}

/**
 * Endpoint aliran realtime (SSE) khusus layar penonton.
 *
 * Sama seperti kanal umum `/events`, tetapi hanya bisa diakses penonton yang
 * sudah lolos PIN sesi.
 */
export function viewerEventsPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/viewer/events`;
}
