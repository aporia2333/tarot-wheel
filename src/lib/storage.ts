import type { TarotReading } from "@/types";

export const STORAGE_KEY = "tarot_readings_v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getReadings(): TarotReading[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TarotReading[]) : [];
  } catch {
    return [];
  }
}

export function saveReading(reading: TarotReading): void {
  if (!canUseStorage()) return;
  const readings = getReadings().filter((item) => item.readingId !== reading.readingId);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([reading, ...readings].slice(0, 50)));
}

export function getReadingById(id: string): TarotReading | null {
  return getReadings().find((reading) => reading.readingId === id) ?? null;
}

export function clearReadings(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
