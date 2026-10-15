"use client";

/**
 * Panel simulasi moderator (khusus mode data tiruan).
 *
 * Karena belum ada backend/WebSocket, panel ini memungkinkan kita menggerakkan
 * state lomba secara manual: membuka soal, membuat regu lain menekan lebih
 * dulu, dan mereset ke soal berikutnya. Panel ini akan hilang saat peran
 * moderator sungguhan tersedia.
 */

import { Play, RotateCcw, Siren } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BuzzerState } from "@/lib/ccl/types";

type ModeratorSimulatorProps = {
  state: BuzzerState;
  rivalName: string;
  onStart: () => void;
  onRival: () => void;
  onReset: () => void;
};

export function ModeratorSimulator({
  state,
  rivalName,
  onStart,
  onRival,
  onReset,
}: ModeratorSimulatorProps) {
  const phase = state.phase;
  const canStart = phase === "waiting" || phase === "locked";
  const canRival = phase === "open";
  const canReset = phase !== "waiting";

  return (
    <section
      aria-label="Simulasi moderator"
      className="w-full rounded-2xl border border-dashed border-border/70 bg-card/60 p-4 backdrop-blur"
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Siren className="size-4 text-muted-foreground" aria-hidden />
          <h2 className="text-sm font-medium text-foreground">
            Simulasi Moderator
          </h2>
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          data tiruan
        </Badge>
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          className="w-full"
        >
          <Play aria-hidden />
          Buka Soal
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onRival}
          disabled={!canRival}
          className="w-full"
        >
          <Siren aria-hidden />
          {rivalName} Lebih Dulu
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={!canReset}
          className="w-full"
        >
          <RotateCcw aria-hidden />
          Soal Berikutnya
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        &ldquo;Buka Soal&rdquo; membuka waktu menjawab, &ldquo;{rivalName} Lebih
        Dulu&rdquo; menirukan regu lain menekan tombol sehingga tombol regu ini
        terkunci otomatis.
      </p>
    </section>
  );
}
