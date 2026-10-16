/**
 * Definisi peran akses sesi.
 *
 * Menyatukan label, halaman tujuan, warna aksen, dan penurunan PIN untuk tiap
 * peran (moderator, layar penonton, HP regu) supaya kartu admin dan gerbang PIN
 * selalu konsisten. PIN di sini masih deterministik untuk data tiruan; backend
 * nanti menyimpan PIN sungguhan per sesi.
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

/**
 * PIN peran yang stabil untuk sebuah sesi (deterministik).
 *
 * Nilai sama selalu dihasilkan untuk pasangan sesi+peran yang sama, sehingga
 * "link dan PIN tetap sama" saat admin membuka ulang detail, dan gerbang PIN
 * bisa memeriksa PIN yang sama tanpa server. Backend nanti menyimpan PIN
 * sungguhan di basis data.
 */
export function getRolePin(sessionId: string, role: RoleId): string {
  const input = `${sessionId}:${role}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const value = 1000 + (Math.abs(hash) % 9000);
  return String(value);
}

/** Path halaman peran untuk sebuah sesi (dipakai saat membuat link admin). */
export function getRolePath(sessionId: string, role: RoleId): string {
  return `${ROLE_INFO[role].basePath}?session=${encodeURIComponent(sessionId)}`;
}
