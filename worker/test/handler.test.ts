import { afterEach, describe, expect, it, vi } from "vitest";
import { handleRequest } from "../src/handleRequest";
import { DAILY_LIMIT } from "../src/rateLimit";
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
    put: (key: string, value: string, options?: { expirationTtl?: number }) =>
      mem.put(key, value, options),
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

describe("cache + quote + rate_limit", () => {
  it("miss then hit; returns quote and cache info", async () => {
    const fetchMock = stubTypeSafe(jevOk(0.88));
    const env = mockEnv();
    const headers = {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "1.2.3.4",
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
      rate_limit: { used: number; remaining: number; limit: number };
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
    expect(missBody.rate_limit.used).toBe(1);
    expect(missBody.rate_limit.remaining).toBe(DAILY_LIMIT - 1);
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
      rate_limit: { used: number };
    };
    expect(hitBody.cache.hit).toBe(true);
    expect(hitBody.ai_written).toBe(0.88);
    expect(hitBody.porn_solicitation).toBe(0.12);
    expect(hitBody.rate_limit.used).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no second TypeSafe call
  });

  it("rate limits after 30 requests per IP per UTC day", async () => {
    stubTypeSafe(jevOk(0.5));
    const env = mockEnv();
    const headers = {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "9.9.9.9",
    };

    for (let i = 0; i < DAILY_LIMIT; i++) {
      const res = await handleRequest(
        new Request("https://example.com/v1/score", {
          method: "POST",
          headers,
          body: JSON.stringify({
            text: `post ${i}`,
            url: `https://x.com/u/status/${1000 + i}`,
          }),
        }),
        env,
      );
      expect(res.status).toBe(200);
    }

    const blocked = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: "one more",
          url: "https://x.com/u/status/9999",
        }),
      }),
      env,
    );
    expect(blocked.status).toBe(429);
    const body = (await blocked.json()) as {
      error: string;
      rate_limit: { remaining: number; used: number };
    };
    expect(body.error).toBe("rate_limited");
    expect(body.rate_limit.remaining).toBe(0);
    expect(body.rate_limit.used).toBe(DAILY_LIMIT);
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
          "CF-Connecting-IP": "8.8.8.8",
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
