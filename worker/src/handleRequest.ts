import { checkAuth } from "./auth";
import { buildQuote, readCache, writeCache } from "./cache";
import { corsHeaders, withCors } from "./cors";
import {
  RateLimitExceededError,
  clientIp,
  consumeDailyQuota,
} from "./rateLimit";
import { runScore, validateScoreBody } from "./score";
import { kvFromBinding } from "./storage";
import type { Env, ScoreApiResponse } from "./types";

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
    if (authErr) {
      response = authErr;
    } else {
      response = await handleScore(request, env);
    }
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

  const validated = validateScoreBody(raw);
  if (!validated.ok) {
    return Response.json(
      { error: "validation_error", details: validated.error },
      { status: 400 },
    );
  }

  if (!env.KV) {
    return Response.json(
      {
        error: "misconfigured",
        details: "KV binding missing — create namespace and bind as KV",
      },
      { status: 500 },
    );
  }

  const store = kvFromBinding(env.KV);
  const ip = clientIp(request);

  let rate_limit;
  try {
    rate_limit = await consumeDailyQuota(store, ip);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return Response.json(
        {
          error: "rate_limited",
          details: err.message,
          rate_limit: err.info,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(
                1,
                Math.ceil(
                  (Date.parse(err.info.reset) - Date.now()) / 1000,
                ),
              ),
            ),
          },
        },
      );
    }
    throw err;
  }

  const body = validated.data;
  const quoteFromBody = buildQuote(body.text ?? "");

  try {
    const cached = await readCache(store, body.url);
    if (cached) {
      const payload: ScoreApiResponse = {
        ...cached.entry.result,
        quote: cached.entry.quote || quoteFromBody,
        cache: cached.info,
        rate_limit,
      };
      return Response.json(payload);
    }

    const result = await runScore(env, body);
    const quote = quoteFromBody;
    const cache = await writeCache(store, body.url, result, quote);
    const payload: ScoreApiResponse = {
      ...result,
      quote,
      cache,
      rate_limit,
    };
    return Response.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: "score_failed", details: message, rate_limit },
      { status: 502 },
    );
  }
}
