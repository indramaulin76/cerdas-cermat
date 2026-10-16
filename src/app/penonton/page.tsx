import type { Metadata } from "next";

import { ViewerApp } from "@/components/viewer/viewer-app";
import { getMockSession, MOCK_VIEWER_PIN } from "@/lib/mock/session";

export const metadata: Metadata = {
  title: "Layar Penonton — Cerdas Cermat Live",
  description:
    "Papan skor besar untuk penonton: skor semua regu dan sorotan regu tercepat secara langsung.",
};

/**
 * Layar penonton (biasanya dibuka di proyektor ruangan).
 *
 * Dilindungi gerbang PIN. Tahap ini memakai data tiruan & PIN tiruan; validasi
 * PIN di server serta siaran realtime menyusul pada tugas berikutnya.
 */
export default function PenontonPage() {
  const session = getMockSession();

  return <ViewerApp session={session} expectedPin={MOCK_VIEWER_PIN} />;
}
