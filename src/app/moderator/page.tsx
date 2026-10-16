import type { Metadata } from "next";

import { RoleGate } from "@/components/auth/role-gate";
import { SessionRolePage } from "@/components/live/session-dashboards";

export const metadata: Metadata = {
  title: "Dashboard Moderator — Cerdas Cermat Live",
  description: "Kendali lomba dan papan skor real-time.",
};

export default function ModeratorPage() {
  return (
    <RoleGate role="moderator">
      <SessionRolePage role="moderator" />
    </RoleGate>
  );
}
