import type { Metadata } from "next";

import { SessionList } from "@/components/admin/session-list";
import { getMockSessions } from "@/lib/mock/sessions";

export const metadata: Metadata = {
  title: "Sesi & Link — Cerdas Cermat Live",
  description:
    "Daftar sesi lomba milik admin beserta link dan PIN tiap peran.",
};

/**
 * Halaman daftar sesi untuk admin.
 *
 * Tahap ini memakai data tiruan; penyimpanan sesi sungguhan menyusul pada layer
 * backend.
 */
export default function SesiPage() {
  return <SessionList initialSessions={getMockSessions()} />;
}
