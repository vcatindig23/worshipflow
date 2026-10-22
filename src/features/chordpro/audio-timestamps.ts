export function parseAudioTimestamp(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;

  if (/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    const seconds = Number(normalized);
    return Number.isFinite(seconds) && seconds >= 0 && seconds <= 86400 ? seconds : null;
  }

  const parts = normalized.split(":");
  if (parts.length !== 2 && parts.length !== 3) return null;
  if (!parts.every((part) => /^\d+$/.test(part))) return null;

  const numbers = parts.map(Number);
  const seconds = numbers[numbers.length - 1] ?? 0;
  const minutes = numbers[numbers.length - 2] ?? 0;
  const hours = parts.length === 3 ? numbers[0] ?? 0 : 0;

  if (seconds > 59 || (parts.length === 3 && minutes > 59)) return null;
  const total = hours * 3600 + minutes * 60 + seconds;
  return total <= 86400 ? total : null;
}

export function formatAudioTimestamp(value: number): string {
  const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}
