import type { Metadata } from "next";

import { SessionList } from "@/components/admin/session-list";

export const metadata: Metadata = {
  title: "Sesi & Link — Cerdas Cermat Live",
  description:
    "Daftar sesi lomba milik admin beserta link dan PIN tiap peran.",
};

/**
 * Halaman daftar sesi untuk admin.
 *
 * Tahap ini memakai data tiruan; sesi buatan admin disimpan di localStorage
 * sampai layer backend menyediakan penyimpanan sungguhan.
 */
export default function SesiPage() {
  return <SessionList />;
}
