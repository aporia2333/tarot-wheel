import type { TarotReading } from "@/types";
import { clearReadings as clearLocalReadings, deleteReading as deleteLocalReading, getReadingById as getLocalReadingById, getReadings as getLocalReadings, saveReading as saveLocalReading } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { isRecord } from "@/lib/readings/validation";

interface ReadingsResponse {
  readings?: TarotReading[];
  reading?: TarotReading;
  message?: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (response.status === 204) return undefined as T;
  let data: ReadingsResponse;
  try {
    const parsed: unknown = await response.json();
    if (!isRecord(parsed)) throw new Error();
    data = parsed as ReadingsResponse;
  } catch { throw new Error("历史服务返回格式无效，请稍后重试。"); }
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
  if (!isSupabaseConfigured) { deleteLocalReading(id); return; }
  await request(`/api/readings/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function clearReadings(): Promise<void> {
  if (!isSupabaseConfigured) { clearLocalReadings(); return; }
  await request("/api/readings", { method: "DELETE" });
}
