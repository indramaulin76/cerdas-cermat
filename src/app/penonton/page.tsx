import type { Metadata } from "next";

import { RoleGate } from "@/components/auth/role-gate";
import { SessionRolePage } from "@/components/live/session-dashboards";

export const metadata: Metadata = {
  title: "Layar Penonton — Cerdas Cermat Live",
  description: "Papan skor real-time untuk layar penonton.",
};

export default function PenontonPage() {
  return (
    <RoleGate role="viewer">
      <SessionRolePage role="viewer" />
    </RoleGate>
  );
}
