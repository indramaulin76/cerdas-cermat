import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { getMockSession } from "@/lib/mock/session";

export default function Home() {
  const session = getMockSession();

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-5 py-10 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, color-mix(in oklab, #3b82f6 20%, transparent) 0%, transparent 55%), radial-gradient(90% 60% at 50% 115%, color-mix(in oklab, #a855f7 14%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-6 text-center">
        <Badge variant="outline" className="text-muted-foreground">
          versi pratinjau · data tiruan
        </Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Cerdas Cermat Live
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {session.title}
          </p>
        </div>

        <Link
          href="/regu"
          className="flex w-full items-center justify-center rounded-2xl bg-foreground px-5 py-4 text-base font-semibold text-background transition-transform hover:opacity-90 active:scale-[0.98]"
        >
          Buka Dashboard Regu
        </Link>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Dashboard Moderator &amp; Layar Penonton menyusul di fase berikutnya.
        </p>
      </div>
    </main>
  );
}
