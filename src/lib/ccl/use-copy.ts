"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook salin-ke-papan-klip untuk tombol "salin link & PIN".
 *
 * Menyimpan status umpan balik per aksi (berhasil/gagal) selama beberapa detik
 * lalu menghapusnya, sehingga tombol bisa menampilkan konfirmasi "tersalin".
 */

export type CopyFeedback = { status: "copied" | "error"; key: string };

const DEFAULT_RESET_MS = 2000;

/**
 * Tulis teks ke papan klip.
 *
 * Memakai Clipboard API bila tersedia, dengan fallback `textarea` +
 * `execCommand("copy")` untuk konteks lama/tidak aman.
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Lanjut ke fallback di bawah.
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-9999px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function useCopyToClipboard(resetMs: number = DEFAULT_RESET_MS) {
  const [feedback, setFeedback] = useState<CopyFeedback | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string, key: string) => {
      const ok = await writeToClipboard(text);
      setFeedback({ status: ok ? "copied" : "error", key });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setFeedback(null), resetMs);
    },
    [resetMs],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { copy, feedback };
}
