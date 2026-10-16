import type { Metadata } from "next";

import { ViewerScreen } from "@/components/viewer/viewer-screen";
import { getMockSession } from "@/lib/mock/session";

export const metadata: Metadata = {
  title: "Layar Penonton — Cerdas Cermat Live",
  description:
    "Papan skor besar untuk penonton: skor semua regu dan sorotan regu tercepat secara langsung.",
};

/**
 * Layar penonton (biasanya dibuka di proyektor ruangan).
 *
 * Tahap ini memakai data tiruan; gerbang PIN, siaran realtime, dan sorotan
 * regu tercepat ditambahkan pada tugas-tugas berikutnya.
 */
export default function PenontonPage() {
  const session = getMockSession();

  return <ViewerScreen session={session} />;
}
