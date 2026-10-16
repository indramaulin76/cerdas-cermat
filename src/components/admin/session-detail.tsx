"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  KeyRound,
  LayoutDashboard,
  MonitorPlay,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatSessionDate } from "@/lib/ccl/format";
import {
  SESSION_STATUS_CLASS,
  SESSION_STATUS_LABEL,
} from "@/lib/ccl/session-status";
import {
  getCreatedSession,
  subscribeCreatedSessions,
} from "@/lib/mock/session-store";
import {
  buildMockSessionDetail,
  type SessionDetail as SessionDetailData,
  type SessionRole,
} from "@/lib/mock/sessions";

/**
 * Halaman detail sesi untuk admin.
 *
 * Menampilkan tiga link akses (moderator, layar penonton, HP regu) beserta PIN
 * masing-masing dalam satu tampilan, siap dibagikan. Sesi yang dibuat admin
 * (tersimpan di localStorage) juga bisa dibuka di sini.
 */

const noopSubscribe = () => () => {};

/** Alamat asal situs di klien (kosong saat SSR) untuk menampilkan link utuh. */
function useOrigin(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
}

/** Apakah komponen sudah berjalan di klien (false saat SSR). */
function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Gaya aksen tiap peran agar tidak tertukar. */
const ROLE_STYLE: Record<
  SessionRole,
  { icon: LucideIcon; card: string; badge: string }
> = {
  moderator: {
    icon: LayoutDashboard,
    card: "border-violet-400/25 bg-violet-400/[0.07]",
    badge: "bg-violet-400/15 text-violet-200",
  },
  viewer: {
    icon: MonitorPlay,
    card: "border-cyan-400/25 bg-cyan-400/[0.07]",
    badge: "bg-cyan-400/15 text-cyan-200",
  },
  team: {
    icon: Smartphone,
    card: "border-emerald-400/25 bg-emerald-400/[0.07]",
    badge: "bg-emerald-400/15 text-emerald-200",
  },
};

function RoleCard({
  role,
  origin,
}: {
  role: SessionDetailData["roles"][number];
  origin: string;
}) {
  const style = ROLE_STYLE[role.role];
  const Icon = style.icon;
  const url = origin ? `${origin}${role.path}` : role.path;

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border p-4 backdrop-blur sm:p-5 ${style.card}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${style.badge}`}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold">{role.label}</h2>
          <p className="text-xs leading-snug text-muted-foreground">
            {role.description}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Link
        </span>
        <p className="break-all rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 font-mono text-xs text-foreground/90">
          {url}
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <KeyRound className="size-3.5" aria-hidden />
          PIN
        </span>
        <p className="font-mono text-3xl font-black tracking-[0.35em]">
          {role.pin}
        </p>
      </div>
    </div>
  );
}

export function SessionDetail({
  sessionId,
  initialDetail,
}: {
  sessionId: string;
  initialDetail: SessionDetailData | null;
}) {
  const origin = useOrigin();
  const isClient = useIsClient();
  // Sesi buatan admin hanya ada di localStorage; baca dengan aman saat hidrasi.
  const stored = useSyncExternalStore(
    subscribeCreatedSessions,
    () => getCreatedSession(sessionId),
    () => null,
  );

  const detail =
    initialDetail ?? (stored ? buildMockSessionDetail(stored) : null);
  const ready = detail !== null || isClient;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(120%_110%_at_50%_-20%,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent_60%)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-5 py-8 sm:px-8">
        <Link
          href="/sesi"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Semua sesi
        </Link>

        {!ready ? (
          <p className="text-sm text-muted-foreground">Memuat sesi…</p>
        ) : !detail ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-5 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Sesi tidak ditemukan atau sudah dihapus.
            </p>
            <Link
              href="/sesi"
              className="mt-3 inline-block text-sm font-semibold text-fuchsia-300 hover:underline"
            >
              Kembali ke daftar sesi
            </Link>
          </div>
        ) : (
          <>
            <header className="space-y-3">
              <Badge variant="outline" className="text-muted-foreground">
                Fase 3 · data tiruan
              </Badge>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  {detail.session.title}
                </h1>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${SESSION_STATUS_CLASS[detail.session.status]}`}
                >
                  {SESSION_STATUS_LABEL[detail.session.status]}
                </span>
              </div>
              <p className="max-w-prose text-sm text-muted-foreground">
                Bagikan link berikut ke tiap peran. Tiap link hanya bisa dibuka
                dengan PIN-nya masing-masing.
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5" aria-hidden />
                  {detail.session.teamCount} regu
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden />
                  Dibuat {formatSessionDate(detail.session.createdAt)}
                </span>
              </div>
            </header>

            <section
              aria-label="Link dan PIN tiap peran"
              className="grid gap-4 md:grid-cols-3"
            >
              {detail.roles.map((role) => (
                <RoleCard key={role.role} role={role} origin={origin} />
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
