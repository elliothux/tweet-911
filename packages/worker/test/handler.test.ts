import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleRequest } from "../src/handleRequest";
import {
  formatBatchLog,
  formatScoreLog,
  signalEmoji,
} from "../src/log";
import {
  DEFAULT_MODEL,
  TYPESAFE_API_URL,
  buildState,
  labelFromNoul,
  mapJevToScore,
  validateScoreBody,
} from "../src/score";
import { MemoryStore, kvFromBinding } from "../src/storage";
import type { Env, JevResponse } from "../src/types";

function memoryKv(): KVNamespace {
  const mem = new MemoryStore();
  return {
    get: (key: string) => mem.get(key),
    put: (
      key: string,
      value: string,
      options?: { expirationTtl?: number; metadata?: unknown },
    ) => mem.put(key, value, options),
    delete: (key: string) => mem.delete(key),
    list: (options?: { prefix?: string; cursor?: string; limit?: number }) =>
      mem.list(options),
  } as unknown as KVNamespace;
}

function mockEnv(overrides: Partial<Env> = {}): Env {
  return {
    TYPESAFE_API_KEY: "ts-test-key",
    KV: overrides.KV ?? memoryKv(),
    ...overrides,
  };
}

function jevOk(
  ai = 0.87,
  porn = 0.12,
  paraphrase = 0.08,
): JevResponse {
  return {
    model: "jev-1.13.0",
    answers: {
      ai_written: { type: "noul", noul: ai },
      porn_solicitation: { type: "noul", noul: porn },
      paraphrase_bot: { type: "noul", noul: paraphrase },
      risk_score: {
        type: "score",
        score: 0.4,
        confidence: 0.8,
      },
    },
    usage: { input_tokens: 100, output_tokens: 40 },
  };
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubTypeSafe(response: JevResponse, status = 200) {
  const fetchMock = vi.fn().mockImplementation(async () =>
    new Response(JSON.stringify(response), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const sampleUrl = "https://x.com/user/status/123";

describe("labelFromNoul", () => {
  it("maps thresholds", () => {
    expect(labelFromNoul(0.9)).toBe("likely_ai");
    expect(labelFromNoul(0.35)).toBe("likely_human");
  });
});

describe("mapJevToScore", () => {
  it("maps mocked Jev response with new fields", () => {
    const out = mapJevToScore(jevOk(0.87, 0.9, 0.2));
    expect(out.ai_written).toBe(0.87);
    expect(out.porn_solicitation).toBe(0.9);
    expect(out.paraphrase_bot).toBe(0.2);
    expect(out.ai_label).toBe("likely_ai");
    expect(out.label).toBe("likely_ai");
    expect(out.solicitation_label).toBe("likely_solicitation");
    expect(out.paraphrase_label).toBe("likely_original");
    expect(out.risk_score).toBe(0.4);
  });
});

describe("buildState / validateScoreBody", () => {
  it("includes author object + in_reply_to in state", () => {
    const state = buildState({
      text: "restating the parent",
      url: sampleUrl,
      kind: "reply",
      platform: "x",
      author: { handle: "@bot", display_name: "Bot", bio: "dm me" },
      in_reply_to: {
        author: { handle: "@op" },
        text: "original claim here",
      },
    });
    expect(state.kind).toBe("reply");
    expect(state.author).toEqual({
      handle: "@bot",
      display_name: "Bot",
      bio: "dm me",
    });
    expect(state.in_reply_to).toEqual({
      author: { handle: "@op" },
      text: "original claim here",
    });
  });

  it("accepts string author for backward compat", () => {
    const v = validateScoreBody({
      text: "hello",
      url: sampleUrl,
      author: "@legacy",
    });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.data.author).toBe("@legacy");
  });

  it("rejects linkedin platform", () => {
    const v = validateScoreBody({
      text: "hello",
      url: sampleUrl,
      platform: "linkedin",
    });
    expect(v.ok).toBe(false);
  });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await handleRequest(
      new Request("https://example.com/health"),
      mockEnv(),
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /v1/score validation", () => {
  it("requires url", async () => {
    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      }),
      mockEnv(),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details: string };
    expect(body.details).toMatch(/url/);
  });

  it("rejects empty content", async () => {
    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "  ", images: [], url: sampleUrl }),
      }),
      mockEnv(),
    );
    expect(res.status).toBe(400);
  });
});

describe("cache + quote", () => {
  it("miss then hit; returns quote and cache info", async () => {
    const fetchMock = stubTypeSafe(jevOk(0.88));
    const env = mockEnv();
    const headers = {
      "Content-Type": "application/json",
    };
    const payload = {
      text: "It's not just a tool. It's a paradigm shift.",
      platform: "x",
      url: sampleUrl,
      kind: "tweet",
      author: { handle: "@example", display_name: "Example" },
    };

    const miss = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      }),
      env,
    );
    expect(miss.status).toBe(200);
    const missBody = (await miss.json()) as {
      cache: { hit: boolean; cached_at: string };
      quote: string;
      ai_written: number;
      porn_solicitation: number;
      paraphrase_bot: number;
      ai_label: string;
      solicitation_label: string;
      paraphrase_label: string;
    };
    expect(missBody.cache.hit).toBe(false);
    expect(missBody.cache.cached_at).toBeTruthy();
    expect(missBody.quote).toContain("paradigm");
    expect(missBody.ai_written).toBe(0.88);
    expect(missBody.porn_solicitation).toBe(0.12);
    expect(missBody.paraphrase_bot).toBe(0.08);
    expect(missBody.ai_label).toBe("likely_ai");
    expect(missBody.solicitation_label).toBe("likely_clean");
    expect(missBody.paraphrase_label).toBe("likely_original");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const hit = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      }),
      env,
    );
    const hitBody = (await hit.json()) as {
      cache: { hit: boolean };
      ai_written: number;
      porn_solicitation: number;
    };
    expect(hitBody.cache.hit).toBe(true);
    expect(hitBody.ai_written).toBe(0.88);
    expect(hitBody.porn_solicitation).toBe(0.12);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no second TypeSafe call
  });
});

describe("score logs", () => {
  it("formats a live judgment with timing and scores", () => {
    const line = formatScoreLog({
      ok: true,
      ms: 1823,
      body: {
        text: "hello",
        url: sampleUrl,
        kind: "tweet",
        author: { handle: "@example" },
      },
      result: {
        ...mapJevToScore(jevOk(0.87, 0.12, 0.08)),
        quote: "hello",
        cache: {
          hit: false,
          key: "k",
          source_url: sampleUrl,
          cached_at: null,
        },
      },
    });
    expect(line).toContain("🤖");
    expect(line).toContain("✨");
    expect(line).toContain("1.82s");
    expect(line).toContain("ai=0.87");
    expect(line).toContain("porn=0.12");
    expect(line).toContain("echo=0.08");
    expect(line).toContain("likely_ai");
    expect(line).toContain("@example");
    expect(line).toContain(sampleUrl);
  });

  it("picks emoji from the strongest signal", () => {
    const porn = mapJevToScore(jevOk(0.1, 0.91, 0.1));
    expect(
      signalEmoji({
        ...porn,
        quote: "",
        cache: { hit: true, key: "k", source_url: sampleUrl, cached_at: null },
      }),
    ).toBe("🔞");
  });

  it("formats batch stats", () => {
    expect(
      formatBatchLog({
        ms: 80,
        items: 12,
        unique: 10,
        ok: 9,
        fail: 3,
        cache: 6,
        live: 3,
      }),
    ).toBe("📦  80ms  n=12  unique=10  ok=9  fail=3  💾6  ✨3");
  });

  it("logs miss then hit from /v1/score", async () => {
    stubTypeSafe(jevOk(0.88));
    const env = mockEnv();
    const payload = {
      text: "It's not just a tool. It's a paradigm shift.",
      url: sampleUrl,
      kind: "tweet",
      author: { handle: "@example" },
    };
    await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      env,
    );
    await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      env,
    );
    const lines = vi
      .mocked(console.log)
      .mock.calls.map((c) => String(c[0]));
    expect(lines.some((l) => l.includes("✨") && l.includes("ai=0.88"))).toBe(
      true,
    );
    expect(lines.some((l) => l.includes("💾") && l.includes(sampleUrl))).toBe(
      true,
    );
  });
});

describe("POST /v1/score/batch", () => {
  it("scores unique urls and reuses cache", async () => {
    const fetchMock = stubTypeSafe(jevOk(0.7));
    const env = mockEnv();
    const a = {
      text: "first post",
      url: "https://x.com/u/status/1",
    };
    const b = {
      text: "second post",
      url: "https://x.com/u/status/2",
    };
    const res = await handleRequest(
      new Request("https://example.com/v1/score/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [a, b, a] }),
      }),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      results: { ok: boolean; url: string; result?: { ai_written: number } }[];
    };
    expect(body.results).toHaveLength(3);
    expect(body.results.every((r) => r.ok)).toBe(true);
    expect(body.results[0]?.url).toBe(a.url);
    expect(body.results[2]?.url).toBe(a.url);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects empty items", async () => {
    const res = await handleRequest(
      new Request("https://example.com/v1/score/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [] }),
      }),
      mockEnv(),
    );
    expect(res.status).toBe(400);
  });
});

describe("TypeSafe call", () => {
  it("posts to TypeSafe on miss with expanded questions", async () => {
    const fetchMock = stubTypeSafe(jevOk(0.7));
    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "hello world",
          url: sampleUrl,
          kind: "reply",
          author: { handle: "@r", display_name: "R" },
          in_reply_to: { text: "parent text", author: "@op" },
        }),
      }),
      mockEnv(),
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(TYPESAFE_API_URL);
    const payload = JSON.parse(String(init.body));
    expect(payload.model).toBe(DEFAULT_MODEL);
    expect(payload.questions.ai_written).toBeTruthy();
    expect(payload.questions.porn_solicitation).toBeTruthy();
    expect(payload.questions.paraphrase_bot).toBeTruthy();
    expect(payload.questions.risk_score).toBeTruthy();
    expect(payload.state.in_reply_to.text).toBe("parent text");
    expect(payload.state.kind).toBe("reply");
  });
});

describe("CORS / auth smoke", () => {
  it("OPTIONS ok", async () => {
    const origin = "chrome-extension://abc";
    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "OPTIONS",
        headers: { Origin: origin },
      }),
      mockEnv(),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });

  it("rejects missing API_KEY when configured", async () => {
    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "x", url: sampleUrl }),
      }),
      mockEnv({ API_KEY: "secret" }),
    );
    expect(res.status).toBe(401);
  });
});

// silence unused import in case tree-shaking lint
void kvFromBinding;
