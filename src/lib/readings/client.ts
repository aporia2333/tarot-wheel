import type { TarotReading } from "@/types";
import { clearReadings as clearLocalReadings, deleteReading as deleteLocalReading, getReadingById as getLocalReadingById, getReadings as getLocalReadings, saveReading as saveLocalReading } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { isRecord, isStoredReading } from "@/lib/readings/validation";

interface ReadingsResponse {
  readings?: TarotReading[];
  reading?: TarotReading;
  message?: string;
  readingId?: string;
}

export class HistoryServiceError extends Error {
  constructor(message: string, readonly code: "verification" | "http" | "invalid-response", readonly status: number) {
    super(message);
    this.name = "HistoryServiceError";
  }
}

function invalidResponse(status: number): HistoryServiceError {
  return new HistoryServiceError("历史服务返回格式无效，请稍后重试。", "invalid-response", status);
}

function httpError(status: number): HistoryServiceError {
  const message = status === 401 ? "登录状态已失效，请重新登录后重试。"
    : status === 403 ? "网站暂时拒绝了这次请求，请完成网站验证后重试。"
    : status === 404 ? "历史服务接口暂时不可用，请刷新页面后重试。"
    : status === 413 ? "本次记录超过服务允许的大小，请联系站点管理员。"
    : status === 429 ? "请求过于频繁，请稍等片刻再试。"
    : status >= 500 ? "历史服务暂时不可用，请稍后重试。" : "历史记录请求失败，请重试。";
  return new HistoryServiceError(message, "http", status);
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set("Accept", "application/json");
  const response = await fetch(url, { ...options, headers, credentials: "same-origin" });
  if (response.status === 204 && options?.method === "DELETE") return undefined as T;
  const body = await response.text();
  // Vercel can challenge a fetch before our route is invoked. Its HTML is not
  // JSON and must never be rendered or executed by the application.
  if (response.status === 403 && (response.headers.get("x-vercel-mitigated") === "challenge" ||
    /<title>\s*Vercel Security Checkpoint\s*<\/title>/i.test(body))) {
    throw new HistoryServiceError("网站需要验证当前浏览器，请完成网站验证后重试。", "verification", response.status);
  }
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch { throw response.ok ? invalidResponse(response.status) : httpError(response.status); }
  if (!response.ok) {
    throw isRecord(data) && typeof data.message === "string" && data.message.trim()
      ? new HistoryServiceError(data.message, "http", response.status) : httpError(response.status);
  }
  if (!isRecord(data)) throw invalidResponse(response.status);
  return data as T;
}

export async function saveReading(reading: TarotReading): Promise<void> {
  if (!isSupabaseConfigured) {
    saveLocalReading(reading);
    return;
  }
  const data = await request<ReadingsResponse>("/api/readings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reading }),
  });
  if (data.readingId !== reading.readingId) throw invalidResponse(200);
}

export async function getReadings(): Promise<TarotReading[]> {
  if (!isSupabaseConfigured) return getLocalReadings();
  const data = await request<ReadingsResponse>("/api/readings", { cache: "no-store" });
  if (!Array.isArray(data.readings) || !data.readings.every(isStoredReading)) throw invalidResponse(200);
  return data.readings;
}

export async function getReadingById(id: string): Promise<TarotReading | null> {
  if (!isSupabaseConfigured) return getLocalReadingById(id);
  const data = await request<ReadingsResponse>(`/api/readings/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (data.reading !== null && !isStoredReading(data.reading)) throw invalidResponse(200);
  return data.reading;
}

export async function deleteReading(id: string): Promise<void> {
  if (!isSupabaseConfigured) { deleteLocalReading(id); return; }
  await request(`/api/readings/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function clearReadings(): Promise<void> {
  if (!isSupabaseConfigured) { clearLocalReadings(); return; }
  await request("/api/readings", { method: "DELETE" });
}
