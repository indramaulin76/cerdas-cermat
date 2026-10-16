/**
 * Palet warna identitas regu.
 *
 * Berisi lebih dari 10 warna (batas maksimal regu) sehingga tiap regu bisa
 * otomatis mendapat warna yang berbeda dari regu lain.
 */
export const TEAM_COLORS = [
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#22c55e", // green
  "#3b82f6", // blue
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#ef4444", // red
  "#14b8a6", // teal
  "#8b5cf6", // violet
  "#f97316", // orange
] as const;

/**
 * Pilih warna dari palet yang belum dipakai regu lain.
 *
 * Bila semua warna palet sudah terpakai (seharusnya tidak terjadi karena
 * jumlah regu dibatasi), jatuhkan ke warna berikutnya secara bergilir.
 */
export function nextTeamColor(colorsInUse: string[]): string {
  const used = new Set(colorsInUse.map((color) => color.toLowerCase()));
  const available = TEAM_COLORS.find((color) => !used.has(color.toLowerCase()));
  if (available) return available;
  return TEAM_COLORS[colorsInUse.length % TEAM_COLORS.length];
}
