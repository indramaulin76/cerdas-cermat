/** Tampilan status sesi yang dipakai bersama oleh daftar dan detail sesi. */

import type { SessionStatus } from "@/lib/ccl/types";

/** Label status sesi dalam bahasa Indonesia. */
export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  draft: "Belum dimulai",
  active: "Berlangsung",
  finished: "Selesai",
};

/** Kelas warna badge per status sesi. */
export const SESSION_STATUS_CLASS: Record<SessionStatus, string> = {
  draft: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  finished: "border-white/15 bg-white/5 text-muted-foreground",
};
