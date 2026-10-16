import type { Metadata } from "next";

import { RoleGate } from "@/components/auth/role-gate";
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
 * Dilindungi gerbang PIN per peran. Tahap ini memakai data tiruan & PIN
 * tiruan; validasi PIN di server serta siaran realtime menyusul pada tugas
 * berikutnya.
 */
export default function PenontonPage() {
  const session = getMockSession();

  return (
    <RoleGate role="viewer" defaultSessionId={session.id}>
      <ViewerScreen session={session} />
    </RoleGate>
  );
}
