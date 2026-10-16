/**
 * Kontrak API Cerdas Cermat Live.
 *
 * Tipe di sini dipakai bersama oleh klien (dashboard regu/moderator/penonton)
 * dan route handler di server supaya bentuk permintaan dan balasan konsisten.
 */

import type { RoleId } from "@/lib/ccl/roles";

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
  /** Status giliran jawab setelah buzz, bila sudah dipilih moderator. */
  answerStatus: "wrong" | "timeout" | "correct" | null;
  /** Waktu tekan dalam format ISO-8601. */
  createdAt: string;
};

/** Permintaan mencatat tekanan tombol jawab. */
export type RecordBuzzRequest = {
  /** Regu yang menekan tombol. */
  teamId: string;
  /** Soal/ronde yang sedang berjalan; wajib agar sinyal lama tidak masuk ronde baru. */
  roundId: string;
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
  answeringTeamId: string | null;
  answerStartedAt: string | null;
  awaitingNext: boolean;
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
 * Peristiwa realtime sebuah sesi, dipublikasikan lewat Ably.
 *
 * Dashboard regu, moderator, dan layar penonton berlangganan aliran yang sama
 * sehingga perubahan (soal dibuka, regu menekan) tampil nyaris seketika.
 */
export type SessionEvent =
  /** Moderator membuka sesi buzz untuk soal baru. */
  | {
      type: "round.opened";
      at: string;
      round: RoundDto;
      /** Momen tombol buzz mulai aktif (ISO). */
      armAt: string;
      /** Lama giliran menjawab (detik). */
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
  /** Status ronde berubah karena pemilihan penjawab atau hasil jawaban. */
  | {
      type: "round.state";
      at: string;
      phase: QuestionPhase;
      round: RoundDto;
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

/* ------------------------------ Auth peran sesi ------------------------------ */

/** Permintaan masuk sebagai sebuah peran memakai PIN. */
export type RoleAuthRequest = {
  pin: string;
};

/** Balasan endpoint auth peran (moderator/penonton/regu). */
export type RoleAuthResponse = {
  ok: true;
  /** `true` bila permintaan ini terautentikasi sebagai peran tersebut. */
  authenticated: boolean;
};

/** Endpoint autentikasi PIN sebuah peran pada sebuah sesi. */
export function roleAuthPath(sessionId: string, role: RoleId): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/auth/${role}`;
}

/* ------------------------------ Panitia (Admin) ------------------------------ */

/** Balasan identitas admin bootstrap. */
export type AdminAuthResponse = {
  ok: true;
  /** Selalu true karena login admin dinonaktifkan. */
  authenticated: boolean;
  admin?: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "panitia";
  } | null;
};

export type AdminUserDto = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "panitia";
  createdAt: string;
};

export type AdminUsersResponse = {
  ok: true;
  users: AdminUserDto[];
};

export type SaveAdminUserRequest = {
  id?: string;
  name: string;
  email: string;
  password?: string;
};

export type SaveAdminUserResponse = {
  ok: true;
  user: AdminUserDto;
};

/** Endpoint autentikasi panitia (masuk/status/keluar). */
export function adminAuthPath(): string {
  return `/api/admin/auth`;
}

/** Endpoint akun panitia (daftar/buat/ubah/hapus). */
export function adminUsersPath(): string {
  return `/api/admin/users`;
}

/** Fase alur soal yang sedang berjalan. */
export type QuestionPhase =
  /** Belum ada soal yang dibuka. */
  | "idle"
  /** Regu sedang dapat menekan tombol buzz. */
  | "open"
  /** Regu terpilih sedang mendapat giliran menjawab. */
  | "answering"
  /** Jawaban salah; moderator perlu membuka giliran berikutnya. */
  | "awaiting_next";

/** Balasan status soal/ronde untuk moderator. */
export type RoundStatusResponse = {
  ok: true;
  phase: QuestionPhase;
  round: RoundDto | null;
  /** Urutan tekanan ronde ini (indeks 0 = tercepat). */
  ranking: BuzzEventDto[];
  winner: BuzzEventDto | null;
  /** Lama jendela jawab (detik), dimulai saat moderator memilih regu. */
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

/** Endpoint daftar regu sebuah sesi. */
export function teamsPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/teams`;
}

/** Bentuk sesi lomba untuk dikirim ke klien. */
export type SessionDto = {
  id: string;
  title: string;
  /** Durasi menjawab sebuah giliran (detik). */
  cooldownSeconds: number;
  /** Poin untuk jawaban benar. */
  correctPoints: number;
  /** Poin untuk jawaban salah. */
  wrongPoints: number;
  status: "draft" | "active" | "finished";
};

/** Link akses tiap peran untuk sebuah sesi. */
export type RoleLinks = Record<RoleId, string>;

/** PIN masuk tiap peran untuk sebuah sesi. */
export type RolePins = Record<RoleId, string>;

/** Detail sesi untuk halaman admin, termasuk link & PIN tiap peran. */
export type SessionDetailDto = SessionDto & {
  /** Waktu dibuat (ISO-8601). */
  createdAt: string;
  /** Link akses moderator/layar penonton/HP regu. */
  links: RoleLinks;
  /** PIN masuk tiap peran (hanya untuk admin). */
  pins: RolePins;
};

/** Permintaan membuat sesi lomba baru. */
export type CreateSessionRequest = {
  /** Nama acara/cerdas cermat, mis. "Cerdas Cermat Live — Babak Penyisihan". */
  title: string;
};

/** Balasan membuat sesi baru (sesi langsung lengkap dengan link & PIN). */
export type CreateSessionResponse = {
  ok: true;
  session: SessionDetailDto;
};

/** Ringkasan sesi untuk daftar sesi di halaman admin. */
export type SessionSummaryDto = {
  id: string;
  title: string;
  status: "draft" | "active" | "finished";
  /** Waktu dibuat (ISO-8601). */
  createdAt: string;
  /** Jumlah regu peserta pada sesi ini. */
  teamCount: number;
};

/** Balasan daftar sesi. */
export type SessionsListResponse = {
  ok: true;
  sessions: SessionSummaryDto[];
};

/** Balasan detail satu sesi. */
export type SessionDetailResponse = {
  ok: true;
  session: SessionDetailDto;
};

/** Endpoint kumpulan sesi (buat/daftar sesi). */
export function sessionsPath(): string {
  return `/api/sessions`;
}

/** Endpoint detail satu sesi. */
export function sessionDetailPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}`;
}

/** Permintaan mengubah pengaturan sesi. */
export type UpdateSettingsRequest = {
  cooldownSeconds?: number;
};

/** Balasan pengaturan sesi. */
export type UpdateSettingsResponse = {
  ok: true;
  session: SessionDto;
};

/** Endpoint pengaturan durasi menjawab sesi. */
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
 * Dipakai layar penonton untuk memuat gambaran awal sebelum terhubung ke Ably.
 */
export function viewerDataPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/viewer`;
}

/**
 * Endpoint untuk menerima data real-time khusus layar penonton.
 *
 * Sama seperti kanal umum, tetapi hanya bisa diakses penonton yang
 * sudah lolos PIN sesi.
 */
export function viewerEventsPath(sessionId: string): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/viewer/events`;
}
