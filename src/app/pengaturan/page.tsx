import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/settings-form";
import { getMockSession, getMockSettings } from "@/lib/mock/session";

export const metadata: Metadata = {
  title: "Pengaturan Lomba — Cerdas Cermat Live",
  description:
    "Atur waktu menjawab dan nilai poin yang dipakai saat lomba berjalan.",
};

/**
 * Halaman pengaturan lomba (admin).
 *
 * Tahap ini memakai data tiruan; pemuatan dan penyimpanan pengaturan sungguhan
 * menyusul pada layer backend.
 */
export default function PengaturanPage() {
  const session = getMockSession();

  return (
    <SettingsForm
      sessionTitle={session.title}
      settings={getMockSettings()}
    />
  );
}
