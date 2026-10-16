"use client";

import { useId, useState } from "react";
import {
  AlertCircle,
  Clock,
  Info,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SETTINGS_LIMITS, type CompetitionSettings } from "@/lib/ccl/settings";

/**
 * Form pengaturan lomba (admin).
 *
 * Mengatur aturan dasar lomba — waktu menjawab dan nilai poin. Tahap ini baru
 * membuka isian waktu menjawab beserta validasinya; isian nilai poin serta
 * simpan/muat pengaturan menyusul pada tugas berikutnya.
 */

const COOLDOWN = SETTINGS_LIMITS.cooldownSeconds;

/**
 * Periksa isian waktu menjawab. Mengembalikan pesan galat singkat, atau `null`
 * bila isian wajar (bilangan bulat 1–600 detik).
 */
function validateCooldown(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return "Waktu menjawab wajib diisi.";
  if (!/^\d+$/.test(trimmed)) return "Masukkan angka bulat, mis. 10.";
  const value = Number(trimmed);
  if (value < COOLDOWN.min) return "Waktu menjawab minimal 1 detik.";
  if (value > COOLDOWN.max) {
    return `Waktu menjawab maksimal ${COOLDOWN.max} detik.`;
  }
  return null;
}

function DisplayCard({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  hint: string;
  accent: { card: string; badge: string; value: string };
}) {
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
        <span className="text-sm font-medium text-muted-foreground">{unit}</span>
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

export function SettingsForm({
  sessionTitle,
  settings,
}: {
  sessionTitle: string;
  settings: CompetitionSettings;
}) {
  const cooldownId = useId();
  const cooldownErrorId = `${cooldownId}-error`;
  const [cooldown, setCooldown] = useState(String(settings.cooldownSeconds));
  const cooldownError = validateCooldown(cooldown);

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

        <section
          aria-label="Aturan dasar lomba"
          className="grid items-stretch gap-4 sm:gap-5 md:grid-cols-3"
        >
          <div className="flex h-full flex-col gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.07] p-4 backdrop-blur sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-400/15 text-cyan-200">
                <Clock className="size-5" aria-hidden />
              </span>
              <h2 className="text-sm font-bold">Waktu Menjawab</h2>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={cooldownId}
                className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                Durasi
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={cooldownId}
                  type="number"
                  inputMode="numeric"
                  min={COOLDOWN.min}
                  max={COOLDOWN.max}
                  step={1}
                  value={cooldown}
                  onChange={(event) => setCooldown(event.target.value)}
                  aria-invalid={cooldownError ? true : undefined}
                  aria-describedby={
                    cooldownError ? cooldownErrorId : undefined
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-lg font-bold tabular-nums outline-none transition-colors focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30 aria-invalid:border-destructive"
                />
                <span className="shrink-0 text-sm font-medium text-muted-foreground">
                  detik
                </span>
              </div>
              {cooldownError ? (
                <p
                  id={cooldownErrorId}
                  className="flex items-center gap-1.5 text-xs text-destructive"
                >
                  <AlertCircle className="size-3.5" aria-hidden />
                  {cooldownError}
                </p>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Hitungan mundur regu untuk menekan tombol jawab setelah soal
                  dibuka.
                </p>
              )}
            </div>
          </div>

          <DisplayCard
            icon={TrendingUp}
            label="Jawaban Benar"
            value={`+${settings.correctPoints}`}
            unit="poin"
            hint="Poin yang ditambahkan ke regu saat jawabannya benar."
            accent={{
              card: "border-emerald-400/25 bg-emerald-400/[0.07]",
              badge: "bg-emerald-400/15 text-emerald-200",
              value: "text-emerald-100",
            }}
          />
          <DisplayCard
            icon={TrendingDown}
            label="Jawaban Salah"
            value={String(settings.wrongPoints)}
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
