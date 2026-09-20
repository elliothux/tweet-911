import type { KeyValueStore } from "./storage";

export const DAILY_LIMIT = 30;

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  used: number;
  reset: string; // ISO time when the day bucket resets (next UTC midnight)
  day: string; // YYYY-MM-DD UTC
}

export class RateLimitExceededError extends Error {
  info: RateLimitInfo;
  constructor(info: RateLimitInfo) {
    super(`Rate limit exceeded: ${info.used}/${info.limit} per day`);
    this.name = "RateLimitExceededError";
    this.info = info;
  }
}

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function nextUtcMidnight(now = new Date()): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return d;
}

function secondsUntil(date: Date, now = new Date()): number {
  return Math.max(1, Math.ceil((date.getTime() - now.getTime()) / 1000));
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function consumeDailyQuota(
  store: KeyValueStore,
  ip: string,
  limit = DAILY_LIMIT,
): Promise<RateLimitInfo> {
  const now = new Date();
  const day = utcDay(now);
  const resetDate = nextUtcMidnight(now);
  const reset = resetDate.toISOString();
  const key = `rl:ip:${ip}:${day}`;

  const raw = await store.get(key);
  const used = raw ? Number(raw) : 0;
  const safeUsed = Number.isFinite(used) && used > 0 ? Math.floor(used) : 0;

  if (safeUsed >= limit) {
    throw new RateLimitExceededError({
      limit,
      remaining: 0,
      used: safeUsed,
      reset,
      day,
    });
  }

  const next = safeUsed + 1;
  await store.put(key, String(next), {
    expirationTtl: secondsUntil(resetDate, now) + 60,
  });

  return {
    limit,
    remaining: Math.max(0, limit - next),
    used: next,
    reset,
    day,
  };
}
