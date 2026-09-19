import { afterEach, describe, expect, it, vi } from "vitest";
import { handleRequest } from "../src/handleRequest";
import {
  DEFAULT_MODEL,
  TYPESAFE_API_URL,
  labelFromNoul,
  mapJevToScore,
} from "../src/score";
import type { Env, JevResponse } from "../src/types";

function mockEnv(overrides: Partial<Env> = {}): Env {
  return {
    TYPESAFE_API_KEY: "ts-test-key",
    ...overrides,
  };
}

function jevOk(noul = 0.87): JevResponse {
  return {
    model: "jev-1.13.0",
    answers: {
      ai_written: { type: "noul", noul },
      ai_score: {
        type: "score",
        score: 1.8,
        confidence: 0.91,
        legend: { "0": "Human", "1": "Mixed", "2": "Clearly AI" },
        probabilities: { "0": 0.05, "1": 0.1, "2": 0.85 },
      },
    },
    usage: { input_tokens: 100, output_tokens: 40 },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubTypeSafe(response: JevResponse | { error: string }, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(response), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("labelFromNoul", () => {
  it("maps thresholds", () => {
    expect(labelFromNoul(0.9)).toBe("likely_ai");
    expect(labelFromNoul(0.65)).toBe("likely_ai");
    expect(labelFromNoul(0.5)).toBe("uncertain");
    expect(labelFromNoul(0.35)).toBe("likely_human");
    expect(labelFromNoul(0.1)).toBe("likely_human");
  });
});

describe("mapJevToScore", () => {
  it("maps mocked Jev response", () => {
    const out = mapJevToScore(jevOk(0.87));
    expect(out.ai_written).toBe(0.87);
    expect(out.label).toBe("likely_ai");
    expect(out.score).toBe(1.8);
    expect(out.confidence).toBe(0.91);
    expect(out.model).toBe("jev-1.13.0");
    expect(out.usage?.input_tokens).toBe(100);
  });

  it("throws when ai_written missing", () => {
    expect(() => mapJevToScore({ answers: {} })).toThrow(/ai_written/);
  });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const env = mockEnv();
    const res = await handleRequest(
      new Request("https://example.com/health"),
      env,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("POST /v1/score validation", () => {
  it("rejects empty body content", async () => {
    const env = mockEnv();
    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "   ", images: [] }),
      }),
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("validation_error");
  });

  it("rejects invalid JSON", async () => {
    const env = mockEnv();
    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
      env,
    );
    expect(res.status).toBe(400);
  });

  it("allows images-only", async () => {
    stubTypeSafe(jevOk(0.2));
    const env = mockEnv();
    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "",
          images: ["https://cdn.example/img.jpg"],
        }),
      }),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { label: string; ai_written: number };
    expect(body.label).toBe("likely_human");
    expect(body.ai_written).toBe(0.2);
  });
});

describe("POST /v1/score success", () => {
  it("calls TypeSafe and maps response", async () => {
    const fetchMock = stubTypeSafe(jevOk(0.88));
    const env = mockEnv();

    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "It's not just a tool. It's a paradigm shift.",
          platform: "x",
          author: "@bot",
        }),
      }),
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ai_written: number;
      label: string;
      model: string;
    };
    expect(body.ai_written).toBe(0.88);
    expect(body.label).toBe("likely_ai");
    expect(body.model).toBe("jev-1.13.0");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(TYPESAFE_API_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer ts-test-key",
    );
    const payload = JSON.parse(String(init.body));
    expect(payload.model).toBe(DEFAULT_MODEL);
    expect(payload.questions.ai_written.type).toBe("noul");
    expect(payload.state.text).toContain("paradigm");
  });

  it("fails clearly when TYPESAFE_API_KEY missing", async () => {
    const env = mockEnv({ TYPESAFE_API_KEY: "" });
    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      }),
      env,
    );
    expect(res.status).toBe(502);
    const body = (await res.json()) as { details: string };
    expect(body.details).toMatch(/TYPESAFE_API_KEY/);
  });
});

describe("CORS / OPTIONS", () => {
  it("handles OPTIONS with reflected chrome-extension Origin", async () => {
    const env = mockEnv();
    const origin = "chrome-extension://abcdefghijklmnop";
    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "OPTIONS",
        headers: { Origin: origin },
      }),
      env,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  it("reflects localhost Origin on GET /health", async () => {
    const env = mockEnv();
    const origin = "http://localhost:5173";
    const res = await handleRequest(
      new Request("https://example.com/health", {
        headers: { Origin: origin },
      }),
      env,
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });

  it("does not reflect unknown origins", async () => {
    const env = mockEnv();
    const res = await handleRequest(
      new Request("https://example.com/health", {
        headers: { Origin: "https://evil.example" },
      }),
      env,
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("API key auth", () => {
  it("rejects when API_KEY set and missing", async () => {
    const env = mockEnv({ API_KEY: "secret-key" });
    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      }),
      env,
    );
    expect(res.status).toBe(401);
  });

  it("accepts Bearer token", async () => {
    stubTypeSafe(jevOk(0.5));
    const env = mockEnv({ API_KEY: "secret-key" });
    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer secret-key",
        },
        body: JSON.stringify({ text: "hello world" }),
      }),
      env,
    );
    expect(res.status).toBe(200);
  });

  it("accepts X-API-Key", async () => {
    stubTypeSafe(jevOk(0.4));
    const env = mockEnv({ API_KEY: "secret-key" });
    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "secret-key",
        },
        body: JSON.stringify({ text: "hello world" }),
      }),
      env,
    );
    expect(res.status).toBe(200);
  });

  it("allows open access when API_KEY unset", async () => {
    stubTypeSafe(jevOk(0.1));
    const env = mockEnv({ API_KEY: "" });
    const res = await handleRequest(
      new Request("https://example.com/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "yo" }),
      }),
      env,
    );
    expect(res.status).toBe(200);
  });
});
