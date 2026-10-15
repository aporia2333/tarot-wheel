import type { TarotReading } from "@/types";
import { isStoredReading, normalizeNewReading } from "@/lib/readings/validation";

export const STORAGE_KEY = "tarot_readings_v1";

function canUseStorage(): boolean {
  try { return typeof window !== "undefined" && Boolean(window.localStorage); } catch { return false; }
}

export function getReadings(): TarotReading[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isStoredReading) : [];
  } catch {
    return [];
  }
}

export function saveReading(reading: TarotReading): void {
  if (!canUseStorage()) throw new Error("浏览器无法保存历史记录，请允许本地存储后重试。");
  const normalized = normalizeNewReading(reading);
  const readings = getReadings().filter((item) => item.readingId !== normalized.readingId);
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify([normalized, ...readings].slice(0, 50))); }
  catch { throw new Error("本地历史保存失败，浏览器存储空间可能不足。"); }
}

export function getReadingById(id: string): TarotReading | null {
  return getReadings().find((reading) => reading.readingId === id) ?? null;
}

export function clearReadings(): void {
  if (!canUseStorage()) throw new Error("浏览器无法访问历史记录。");
  try { window.localStorage.removeItem(STORAGE_KEY); }
  catch { throw new Error("本地历史清空失败，请检查浏览器的存储权限后重试。"); }
}

export function deleteReading(id: string): void {
  if (!canUseStorage()) throw new Error("浏览器无法访问历史记录。");
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(getReadings().filter((reading) => reading.readingId !== id))); }
  catch { throw new Error("本地历史删除失败，请检查浏览器的存储权限后重试。"); }
}
