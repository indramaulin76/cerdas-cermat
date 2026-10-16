import {
  Clock,
  Info,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { CompetitionSettings } from "@/lib/ccl/settings";

/**
 * Halaman pengaturan lomba (tampilan data tiruan).
 *
 * Menampilkan aturan dasar lomba — waktu menjawab dan nilai poin — dalam satu
 * halaman. Tahap ini menampilkan nilai awal dari data tiruan; isian yang bisa
 * diubah dan disimpan menyusul pada tugas berikutnya.
 */

type SettingCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  hint: string;
  accent: { card: string; badge: string; value: string };
};

function SettingCard({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  accent,
}: SettingCardProps) {
  return (
    <div
      className={`flex h-full flex-col gap-3 rounded-2xl border p-4 backdrop-blur sm:p-5 ${accent.card}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${accent.badge}`}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <h2 className="text-sm font-bold">{label}</h2>
      </div>
      <p className="flex items-baseline gap-1.5">
        <span
          className={`font-mono text-3xl font-black tabular-nums ${accent.value}`}
        >
          {value}
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {unit}
        </span>
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

export function SettingsOverview({
  sessionTitle,
  settings,
}: {
  sessionTitle: string;
  settings: CompetitionSettings;
}) {
  const correct = settings.correctPoints;
  const wrong = settings.wrongPoints;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      {/* Latar bercahaya. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(120%_110%_at_50%_-20%,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent_60%)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:max-w-4xl">
        <header className="space-y-3">
          <Badge variant="outline" className="text-muted-foreground">
            Fase 3 · data tiruan
          </Badge>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Pengaturan Lomba
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Atur waktu menjawab dan nilai poin untuk sesi{" "}
            <span className="font-semibold text-foreground">
              {sessionTitle}
            </span>
            . Nilai ini langsung dipakai saat lomba berjalan.
          </p>
        </header>

        <section aria-label="Aturan dasar lomba" className="grid gap-4 sm:gap-5 md:grid-cols-3">
          <SettingCard
            icon={Clock}
            label="Waktu Menjawab"
            value={String(settings.cooldownSeconds)}
            unit="detik"
            hint="Hitungan mundur regu untuk menekan tombol jawab setelah soal dibuka."
            accent={{
              card: "border-cyan-400/25 bg-cyan-400/[0.07]",
              badge: "bg-cyan-400/15 text-cyan-200",
              value: "text-cyan-100",
            }}
          />
          <SettingCard
            icon={TrendingUp}
            label="Jawaban Benar"
            value={`+${correct}`}
            unit="poin"
            hint="Poin yang ditambahkan ke regu saat jawabannya benar."
            accent={{
              card: "border-emerald-400/25 bg-emerald-400/[0.07]",
              badge: "bg-emerald-400/15 text-emerald-200",
              value: "text-emerald-100",
            }}
          />
          <SettingCard
            icon={TrendingDown}
            label="Jawaban Salah"
            value={String(wrong)}
            unit="poin"
            hint="Poin yang dikurangi dari regu saat jawabannya salah."
            accent={{
              card: "border-rose-400/25 bg-rose-400/[0.07]",
              badge: "bg-rose-400/15 text-rose-200",
              value: "text-rose-100",
            }}
          />
        </section>

        <p className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-fuchsia-300" aria-hidden />
          <span>
            Nilai awal ini sudah masuk akal, jadi lomba bisa langsung dimulai
            tanpa mengubah apa pun. Isian yang tidak wajar (mis. waktu 0 detik
            atau poin bukan angka) akan ditolak.
          </span>
        </p>
      </div>
    </main>
  );
}
