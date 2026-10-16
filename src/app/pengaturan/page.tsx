import type { Metadata } from "next";

import { SettingsPage } from "@/components/admin/settings-page";

export const metadata: Metadata = {
  title: "Pengaturan Lomba — Cerdas Cermat Live",
  description: "Atur waktu menjawab dan nilai poin untuk sesi lomba.",
};

export default function PengaturanPage() {
  return <SettingsPage />;
}
