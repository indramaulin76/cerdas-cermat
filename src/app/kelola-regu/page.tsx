import type { Metadata } from "next";

import { TeamManager } from "@/components/admin/team-manager";
import { MOCK_TEAMS } from "@/lib/mock/session";

export const metadata: Metadata = {
  title: "Kelola Regu — Cerdas Cermat Live",
  description:
    "Atur jumlah, nama, dan warna regu peserta sebelum lomba dimulai.",
};

/**
 * Halaman kelola regu untuk admin.
 *
 * Tahap ini memakai data tiruan; penyimpanan ke sesi lomba dan sinkronisasi
 * ke dashboard lain menyusul pada layer backend.
 */
export default function KelolaReguPage() {
  return <TeamManager initialTeams={MOCK_TEAMS} maxTeams={10} />;
}
