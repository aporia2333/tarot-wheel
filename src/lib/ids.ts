export function createReadingId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `reading_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
