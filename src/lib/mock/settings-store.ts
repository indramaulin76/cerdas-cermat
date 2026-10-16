/**
 * Penyimpanan pengaturan lomba tiruan di sisi klien (localStorage).
 *
 * Supaya pengaturan yang sudah diisi tetap ada saat halaman dibuka lagi,
 * pengaturan disimpan di localStorage dan dipakai sebagai nilai awal. Layer
 * backend nanti menggantikan ini dengan basis data per sesi.
 *
 * Dibaca lewat `useSyncExternalStore` agar aman dari perbedaan render
 * server/klien (snapshot server selalu `null`).
 */

import type { CompetitionSettings } from "@/lib/ccl/settings";

const STORAGE_KEY = "ccl:mock:settings";

let cache: CompetitionSettings | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function isSettings(value: unknown): value is CompetitionSettings {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.cooldownSeconds === "number" &&
    typeof candidate.correctPoints === "number" &&
    typeof candidate.wrongPoints === "number"
  );
}

function readStorage(): CompetitionSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSettings(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Berlangganan perubahan pengaturan tersimpan. */
export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot pengaturan tersimpan (dibaca sekali dari localStorage lalu di-cache). */
export function getStoredSettings(): CompetitionSettings | null {
  if (!loaded) {
    cache = readStorage();
    loaded = true;
  }
  return cache;
}

/** Snapshot sisi server: selalu kosong (localStorage tidak ada di server). */
export function getServerStoredSettings(): CompetitionSettings | null {
  return null;
}

/** Simpan pengaturan dan beri tahu pelanggan. */
export function saveSettings(settings: CompetitionSettings): void {
  cache = settings;
  loaded = true;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // localStorage bisa penuh/diblokir; abaikan agar UI tetap jalan.
    }
  }
  for (const listener of listeners) listener();
}
