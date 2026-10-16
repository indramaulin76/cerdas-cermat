/**
 * Definisi peran akses sesi.
 *
 * Menyatukan label, halaman tujuan, dan warna aksen untuk tiap peran
 * (moderator, layar penonton, HP regu) supaya kartu admin dan halaman
 * peran selalu konsisten. PIN disimpan per sesi oleh backend.
 */

export type RoleId = "moderator" | "viewer" | "team";

/** Urutan tampilan peran (kartu admin, dokumentasi). */
export const ROLE_ORDER: RoleId[] = ["moderator", "viewer", "team"];

export type RoleInfo = {
  /** Label panjang untuk kartu admin. */
  label: string;
  /** Deskripsi singkat peran. */
  description: string;
  /** Judul yang tampil di gerbang PIN. */
  gateTitle: string;
  /** Petunjuk singkat di gerbang PIN. */
  gateHint: string;
  /** Halaman tujuan peran (relatif). */
  basePath: string;
  /** Kelas aksen agar tiap peran mudah dibedakan. */
  accent: {
    /** Borda + latar kartu di halaman detail admin. */
    card: string;
    /** Latar ikon/badge. */
    badge: string;
    /** Gradien untuk teks/titik di gerbang PIN. */
    gradient: string;
  };
};

export const ROLE_INFO: Record<RoleId, RoleInfo> = {
  moderator: {
    label: "Moderator",
    description: "Dashboard untuk memandu jalannya lomba.",
    gateTitle: "Dashboard Moderator",
    gateHint: "Masukkan PIN moderator dari admin untuk memandu lomba.",
    basePath: "/moderator",
    accent: {
      card: "border-violet-400/25 bg-violet-400/[0.07]",
      badge: "bg-violet-400/15 text-violet-200",
      gradient: "from-violet-500 to-fuchsia-400",
    },
  },
  viewer: {
    label: "Layar Penonton",
    description: "Papan skor besar untuk ditampilkan ke penonton.",
    gateTitle: "Layar Penonton",
    gateHint: "Masukkan PIN dari admin untuk membuka layar.",
    basePath: "/penonton",
    accent: {
      card: "border-cyan-400/25 bg-cyan-400/[0.07]",
      badge: "bg-cyan-400/15 text-cyan-200",
      gradient: "from-cyan-500 to-fuchsia-400",
    },
  },
  team: {
    label: "HP Regu",
    description: "Tombol jawab untuk tiap regu peserta.",
    gateTitle: "Tombol Jawab Regu",
    gateHint: "Masukkan PIN regu dari admin untuk membuka tombol jawab.",
    basePath: "/regu",
    accent: {
      card: "border-emerald-400/25 bg-emerald-400/[0.07]",
      badge: "bg-emerald-400/15 text-emerald-200",
      gradient: "from-emerald-500 to-cyan-400",
    },
  },
};

/** Path halaman peran untuk sebuah sesi (dipakai saat membuat link admin). */
export function getRolePath(sessionId: string, role: RoleId): string {
  return `${ROLE_INFO[role].basePath}?session=${encodeURIComponent(sessionId)}`;
}
