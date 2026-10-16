import type { Metadata } from "next";

import { SessionList } from "@/components/admin/session-list";

export const metadata: Metadata = {
  title: "Sesi & Link — Cerdas Cermat Live",
  description:
    "Daftar sesi lomba milik admin beserta link dan PIN tiap peran.",
};

/** Daftar sesi persisten untuk admin. */
export default function SesiPage() {
  return <SessionList />;
}
