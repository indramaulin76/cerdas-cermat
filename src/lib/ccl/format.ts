/** Pemformatan bersama untuk halaman Sesi & Link. */

/**
 * Format tanggal dibuat secara deterministik.
 *
 * Zona waktu dikunci ke Asia/Jakarta supaya hasil di server dan di klien sama
 * (menghindari perbedaan render saat hidrasi).
 */
export function formatSessionDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}
