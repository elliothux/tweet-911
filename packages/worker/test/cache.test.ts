import { describe, expect, it } from "vitest";
import {
  CACHE_TTL_SECONDS,
  cacheKeyForUrl,
  isCacheExpired,
  purgeExpiredCache,
  readCache,
  writeCache,
} from "../src/cache";
import { MemoryStore } from "../src/storage";
import type { ScoreResponse } from "../src/types";

const result: ScoreResponse = {
  ai_written: 0.1,
  porn_solicitation: 0.1,
  paraphrase_bot: 0.1,
  ai_label: "likely_human",
  solicitation_label: "likely_clean",
  paraphrase_label: "likely_original",
  label: "likely_human",
  model: "jev-latest",
};

describe("cache expiry", () => {
  it("treats missing or ancient cached_at as expired", () => {
    expect(isCacheExpired(undefined)).toBe(true);
    expect(isCacheExpired("nope")).toBe(true);
    expect(isCacheExpired(new Date().toISOString())).toBe(false);
    expect(
      isCacheExpired(
        new Date(Date.now() - (CACHE_TTL_SECONDS + 1) * 1000).toISOString(),
      ),
    ).toBe(true);
  });

  it("readCache drops stale entries", async () => {
    const store = new MemoryStore();
    const url = "https://x.com/u/status/9";
    const key = await cacheKeyForUrl(url);
    const cached_at = new Date(
      Date.now() - (CACHE_TTL_SECONDS + 60) * 1000,
    ).toISOString();
    await store.put(
      key,
      JSON.stringify({
        result,
        quote: "old",
        source_url: url,
        cached_at,
      }),
      { metadata: { cached_at } },
    );
    expect(await readCache(store, url)).toBeNull();
    expect(await store.get(key)).toBeNull();
  });

  it("cron purge deletes expired keys and keeps fresh ones", async () => {
    const store = new MemoryStore();
    const freshUrl = "https://x.com/u/status/1";
    const staleUrl = "https://x.com/u/status/2";
    await writeCache(store, freshUrl, result, "fresh");
    const staleKey = await cacheKeyForUrl(staleUrl);
    const cached_at = new Date(
      Date.now() - (CACHE_TTL_SECONDS + 120) * 1000,
    ).toISOString();
    await store.put(
      staleKey,
      JSON.stringify({
        result,
        quote: "stale",
        source_url: staleUrl,
        cached_at,
      }),
      { metadata: { cached_at } },
    );

    const stats = await purgeExpiredCache(store);
    expect(stats.scanned).toBe(2);
    expect(stats.deleted).toBe(1);
    expect(await readCache(store, freshUrl)).not.toBeNull();
    expect(await store.get(staleKey)).toBeNull();
  });
});
