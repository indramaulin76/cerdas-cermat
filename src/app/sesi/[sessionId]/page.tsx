import type { Metadata } from "next";

import { SessionDetail } from "@/components/admin/session-detail";
import { getMockSessionDetail } from "@/lib/mock/sessions";

/**
 * Halaman detail ini bergantung pada `params` (id sesi) sehingga dirender saat
 * permintaan. Tandai sebagai rute blocking agar tidak dipaksa punya static
 * shell, sesuai panduan Cache Components.
 */
export const instant = false;

/** Judul tab mengikuti nama sesi bila ditemukan. */
export async function generateMetadata({
  params,
}: PageProps<"/sesi/[sessionId]">): Promise<Metadata> {
  const { sessionId } = await params;
  const detail = getMockSessionDetail(sessionId);

  return {
    title: detail
      ? `${detail.session.title} — Cerdas Cermat Live`
      : "Sesi tidak ditemukan — Cerdas Cermat Live",
    description:
      "Link dan PIN tiap peran (moderator, layar penonton, HP regu) untuk sesi lomba.",
  };
}

/**
 * Halaman detail sesi: tiga link akses beserta PIN tiap peran.
 *
 * Sesi bawaan dicari di server; sesi yang dibuat admin (localStorage) dicari di
 * klien oleh `SessionDetail`.
 */
export default async function SesiDetailPage({
  params,
}: PageProps<"/sesi/[sessionId]">) {
  const { sessionId } = await params;
  const initialDetail = getMockSessionDetail(sessionId);

  return (
    <SessionDetail sessionId={sessionId} initialDetail={initialDetail} />
  );
}
