import type { Metadata } from "next";

import { RoleGate } from "@/components/auth/role-gate";
import { SessionRolePage } from "@/components/live/session-dashboards";

export const metadata: Metadata = {
  title: "Tombol Jawab Regu — Cerdas Cermat Live",
  description: "Tombol jawab per regu yang tersinkron real-time.",
};

export default function ReguPage() {
  return (
    <RoleGate role="team">
      <SessionRolePage role="team" />
    </RoleGate>
  );
}
