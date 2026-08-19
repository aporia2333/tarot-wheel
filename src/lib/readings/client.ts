import type { TarotReading } from "@/types";
import { getReadingById as getLocalReadingById, getReadings as getLocalReadings, saveReading as saveLocalReading } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase/client";

interface ReadingsResponse {
  readings?: TarotReading[];
  reading?: TarotReading;
  message?: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = (await response.json()) as ReadingsResponse;
  if (!response.ok) throw new Error(data.message || "历史记录请求失败。");
  return data as T;
}

export async function saveReading(reading: TarotReading): Promise<void> {
  if (!isSupabaseConfigured) {
    saveLocalReading(reading);
    return;
  }
  await request("/api/readings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reading }),
  });
}

export async function getReadings(): Promise<TarotReading[]> {
  if (!isSupabaseConfigured) return getLocalReadings();
  const data = await request<ReadingsResponse>("/api/readings", { cache: "no-store" });
  return data.readings ?? [];
}

export async function getReadingById(id: string): Promise<TarotReading | null> {
  if (!isSupabaseConfigured) return getLocalReadingById(id);
  const data = await request<ReadingsResponse>(`/api/readings/${encodeURIComponent(id)}`, { cache: "no-store" });
  return data.reading ?? null;
}

export async function deleteReading(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await request(`/api/readings/${encodeURIComponent(id)}`, { method: "DELETE" });
}
