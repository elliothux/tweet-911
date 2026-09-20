import type { ScoreResponse } from "./types";
import type { KeyValueStore } from "./storage";

/** Cache entry stored under a source URL key. */
export interface CachedScore {
  result: ScoreResponse;
  quote: string;
  source_url: string;
  cached_at: string;
}

export interface CacheInfo {
  hit: boolean;
  key: string;
  source_url: string;
  cached_at: string | null;
}

export const CACHE_PREFIX = "cache:url:";
export const CACHE_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days
const LIST_PAGE = 1000;

export type CacheMeta = { cached_at: string };

export type PurgeStats = {
  scanned: number;
  deleted: number;
};

export function isCacheExpired(cachedAt: string | undefined, now = Date.now()) {
  if (!cachedAt) return true;
  const t = Date.parse(cachedAt);
  if (!Number.isFinite(t)) return true;
  return now - t >= CACHE_TTL_SECONDS * 1000;
}

function metaCachedAt(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const value = (metadata as { cached_at?: unknown }).cached_at;
  return typeof value === "string" ? value : undefined;
}

export function normalizeSourceUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = "";
    // strip common tracking params
    for (const p of [...u.searchParams.keys()]) {
      if (
        p.startsWith("utm_") ||
        p === "s" ||
        p === "t" ||
        p === "ref_src" ||
        p === "ref_url"
      ) {
        u.searchParams.delete(p);
      }
    }
    return u.toString();
  } catch {
    return url.trim();
  }
}

export async function cacheKeyForUrl(sourceUrl: string): Promise<string> {
  const normalized = normalizeSourceUrl(sourceUrl);
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );
  const hex = [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${CACHE_PREFIX}${hex}`;
}

export function buildQuote(text: string, maxLen = 240): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

export async function readCache(
  store: KeyValueStore,
  sourceUrl: string,
): Promise<{ entry: CachedScore; info: CacheInfo } | null> {
  const key = await cacheKeyForUrl(sourceUrl);
  const raw = await store.get(key);
  if (!raw) {
    return null;
  }
  try {
    const entry = JSON.parse(raw) as CachedScore;
    if (isCacheExpired(entry.cached_at)) {
      await store.delete(key);
      return null;
    }
    return {
      entry,
      info: {
        hit: true,
        key,
        source_url: entry.source_url || normalizeSourceUrl(sourceUrl),
        cached_at: entry.cached_at ?? null,
      },
    };
  } catch {
    await store.delete(key);
    return null;
  }
}

export async function writeCache(
  store: KeyValueStore,
  sourceUrl: string,
  result: ScoreResponse,
  quote: string,
): Promise<CacheInfo> {
  const key = await cacheKeyForUrl(sourceUrl);
  const normalized = normalizeSourceUrl(sourceUrl);
  const cached_at = new Date().toISOString();
  const entry: CachedScore = {
    result,
    quote,
    source_url: normalized,
    cached_at,
  };
  await store.put(key, JSON.stringify(entry), {
    expirationTtl: CACHE_TTL_SECONDS,
    metadata: { cached_at } satisfies CacheMeta,
  });
  return {
    hit: false,
    key,
    source_url: normalized,
    cached_at,
  };
}

async function keyExpired(
  store: KeyValueStore,
  key: { name: string; metadata?: unknown },
  now: number,
) {
  const fromMeta = metaCachedAt(key.metadata);
  if (fromMeta) return isCacheExpired(fromMeta, now);
  const raw = await store.get(key.name);
  if (!raw) return true;
  try {
    const entry = JSON.parse(raw) as CachedScore;
    return isCacheExpired(entry.cached_at, now);
  } catch {
    return true;
  }
}

export async function purgeExpiredCache(
  store: KeyValueStore,
  now = Date.now(),
): Promise<PurgeStats> {
  let cursor: string | undefined;
  let scanned = 0;
  let deleted = 0;
  do {
    const page = await store.list({
      prefix: CACHE_PREFIX,
      cursor,
      limit: LIST_PAGE,
    });
    for (const key of page.keys) {
      scanned += 1;
      if (!(await keyExpired(store, key, now))) continue;
      await store.delete(key.name);
      deleted += 1;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return { scanned, deleted };
}
