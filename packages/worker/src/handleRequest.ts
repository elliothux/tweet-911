import { checkAuth } from "./auth";
import { buildQuote, readCache, writeCache } from "./cache";
import { corsHeaders, withCors } from "./cors";
import { logBatch, logScore } from "./log";
import { runScore, validateScoreBody } from "./score";
import { kvFromBinding } from "./storage";
import type { Env, ScoreApiResponse, ScoreRequest } from "./types";

const MAX_BATCH = 50;
const BATCH_CONCURRENCY = 8;

export async function handleRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  let response: Response;

  if (request.method === "GET" && url.pathname === "/health") {
    response = Response.json({ ok: true });
  } else if (request.method === "POST" && url.pathname === "/v1/score") {
    const authErr = checkAuth(request, env);
    response = authErr ?? (await handleScore(request, env));
  } else if (request.method === "POST" && url.pathname === "/v1/score/batch") {
    const authErr = checkAuth(request, env);
    response = authErr ?? (await handleScoreBatch(request, env));
  } else {
    response = Response.json({ error: "not_found" }, { status: 404 });
  }

  return withCors(response, request);
}

async function handleScore(request: Request, env: Env): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_json", details: "Body must be JSON" },
      { status: 400 },
    );
  }

  const scored = await scoreOne(env, raw);
  if (!scored.ok) {
    return Response.json(
      { error: scored.error, details: scored.details },
      { status: scored.status },
    );
  }
  return Response.json(scored.result);
}

async function handleScoreBatch(
  request: Request,
  env: Env,
): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_json", details: "Body must be JSON" },
      { status: 400 },
    );
  }

  const items = (raw as { items?: unknown })?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return Response.json(
      { error: "validation_error", details: "items must be a non-empty array" },
      { status: 400 },
    );
  }
  if (items.length > MAX_BATCH) {
    return Response.json(
      {
        error: "validation_error",
        details: `items length must be <= ${MAX_BATCH}`,
      },
      { status: 400 },
    );
  }

  const seen = new Set<string>();
  const unique: unknown[] = [];
  for (const item of items) {
    const url =
      item && typeof item === "object" && "url" in item
        ? String((item as { url?: unknown }).url ?? "")
        : "";
    if (url && seen.has(url)) continue;
    if (url) seen.add(url);
    unique.push(item);
  }

  const batchStarted = performance.now();
  const scored = await mapPool(unique, BATCH_CONCURRENCY, (body) =>
    scoreOne(env, body),
  );

  const byUrl = new Map<string, (typeof scored)[number]>();
  for (let i = 0; i < unique.length; i++) {
    const item = unique[i];
    const url =
      item && typeof item === "object" && "url" in item
        ? String((item as { url?: unknown }).url ?? "")
        : "";
    const result = scored[i];
    if (url && result) byUrl.set(url, result);
  }

  const results = items.map((item) => {
    const url =
      item && typeof item === "object" && "url" in item
        ? String((item as { url?: unknown }).url ?? "")
        : "";
    const hit = url ? byUrl.get(url) : undefined;
    if (!hit) {
      return { ok: false as const, url, error: "score_failed", details: "skipped" };
    }
    if (!hit.ok) {
      return {
        ok: false as const,
        url,
        error: hit.error,
        details: hit.details,
      };
    }
    return { ok: true as const, url, result: hit.result };
  });

  let cacheHits = 0;
  let live = 0;
  let ok = 0;
  for (const row of results) {
    if (!row.ok) continue;
    ok += 1;
    if (row.result.cache.hit) cacheHits += 1;
    else live += 1;
  }
  logBatch({
    ms: performance.now() - batchStarted,
    items: items.length,
    unique: unique.length,
    ok,
    fail: results.length - ok,
    cache: cacheHits,
    live,
  });

  return Response.json({ results });
}

type ScoreOneResult =
  | { ok: true; result: ScoreApiResponse }
  | { ok: false; error: string; details: string; status: number };

async function scoreOne(env: Env, raw: unknown): Promise<ScoreOneResult> {
  const started = performance.now();
  const validated = validateScoreBody(raw);
  if (!validated.ok) {
    return {
      ok: false,
      error: "validation_error",
      details: validated.error,
      status: 400,
    };
  }

  if (!env.KV) {
    return {
      ok: false,
      error: "misconfigured",
      details: "KV binding missing — create namespace and bind as KV",
      status: 500,
    };
  }

  const store = kvFromBinding(env.KV);
  const body: ScoreRequest = validated.data;
  const quoteFromBody = buildQuote(body.text ?? "");

  try {
    const cached = await readCache(store, body.url);
    if (cached) {
      const result = {
        ...cached.entry.result,
        quote: cached.entry.quote || quoteFromBody,
        cache: cached.info,
      };
      logScore({
        ok: true,
        ms: performance.now() - started,
        body,
        result,
      });
      return { ok: true, result };
    }

    const scored = await runScore(env, body);
    const quote = quoteFromBody;
    const cache = await writeCache(store, body.url, scored, quote);
    const result = { ...scored, quote, cache };
    logScore({
      ok: true,
      ms: performance.now() - started,
      body,
      result,
    });
    return { ok: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logScore({
      ok: false,
      ms: performance.now() - started,
      body,
      error: "score_failed",
      details: message,
    });
    return {
      ok: false,
      error: "score_failed",
      details: message,
      status: 502,
    };
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      const item = items[i];
      if (item === undefined) return;
      out[i] = await fn(item);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}
