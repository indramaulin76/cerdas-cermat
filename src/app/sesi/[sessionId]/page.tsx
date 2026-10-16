import type { Metadata } from "next";

import { SessionDetail } from "@/components/admin/session-detail";

export const instant = false;

export const metadata: Metadata = {
  title: "Detail Sesi — Cerdas Cermat Live",
  description: "Kelola regu, aturan, dan tautan akses sesi lomba.",
};

export default async function SesiDetailPage({
  params,
}: PageProps<"/sesi/[sessionId]">) {
  const { sessionId } = await params;
  return <SessionDetail sessionId={sessionId} />;
}
