import type { Metadata } from "next";

import { RoleGate } from "@/components/auth/role-gate";
import { ModeratorDashboard } from "@/components/moderator/moderator-dashboard";
import { getMockSession } from "@/lib/mock/session";

export const metadata: Metadata = {
  title: "Dashboard Moderator — Cerdas Cermat Live",
  description: "Pusat kendali moderator untuk mengelola jalannya lomba.",
};

/**
 * Dashboard moderator.
 *
 * Dilindungi gerbang PIN per peran; PIN moderator berbeda dari peran lain.
 */
export default function ModeratorPage() {
  const session = getMockSession();

  return (
    <RoleGate role="moderator" defaultSessionId={session.id}>
      <ModeratorDashboard session={session} />
    </RoleGate>
  );
}
