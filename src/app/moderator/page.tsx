import type { Metadata } from "next";

import { ModeratorDashboard } from "@/components/moderator/moderator-dashboard";
import { getMockSession } from "@/lib/mock/session";

export const metadata: Metadata = {
  title: "Dashboard Moderator — Cerdas Cermat Live",
  description: "Pusat kendali moderator untuk mengelola jalannya lomba.",
};

export default function ModeratorPage() {
  const session = getMockSession();

  return <ModeratorDashboard session={session} />;
}
