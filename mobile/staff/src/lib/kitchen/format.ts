const STORE_TZ = "America/Toronto";

export function formatKitchenWait(
  iso: string | null,
  nowMs = Date.now(),
): string {
  if (!iso) return "";
  const minutes = Math.max(
    0,
    Math.floor((nowMs - new Date(iso).getTime()) / 60_000),
  );
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function formatKitchenScheduled(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: STORE_TZ,
  }).format(new Date(iso));
}
