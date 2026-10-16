import { Suspense } from "react";
import type { Metadata } from "next";

import { RoleGate } from "@/components/auth/role-gate";
import { TeamBuzzer } from "@/components/team/team-buzzer";
import { getMockRival, getMockSession, getMockTeam } from "@/lib/mock/session";

export const metadata: Metadata = {
  title: "Tombol Jawab Regu — Cerdas Cermat Live",
  description:
    "Layar tombol jawab untuk regu: tekan secepat mungkin saat soal dibuka.",
};

/**
 * Dashboard regu (dibuka di HP masing-masing regu).
 *
 * Dilindungi gerbang PIN per peran. Tahap ini memakai data tiruan. Regu aktif
 * dipilih dari query `?team=<id>` agar bisa disimulasikan per-regu; pada
 * implementasi asli id regu datang dari sesi PIN/link yang dibuat admin.
 */
export default function ReguPage(props: PageProps<"/regu">) {
  return (
    <Suspense fallback={<ReguScreenFallback />}>
      <ReguScreen searchParams={props.searchParams} />
    </Suspense>
  );
}

async function ReguScreen({
  searchParams,
}: Pick<PageProps<"/regu">, "searchParams">) {
  const params = await searchParams;
  const teamId = typeof params.team === "string" ? params.team : undefined;

  const session = getMockSession();
  const team = getMockTeam(teamId);
  const rival = getMockRival(team.id);

  return (
    <RoleGate role="team" defaultSessionId={session.id}>
      <TeamBuzzer session={session} team={team} rival={rival} />
    </RoleGate>
  );
}

function ReguScreenFallback() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background text-foreground">
      <p className="animate-pulse text-sm text-muted-foreground">
        Menyiapkan layar tombol jawab…
      </p>
    </main>
  );
}
