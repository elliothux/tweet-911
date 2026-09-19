import { checkAuth } from "./auth";
import { corsHeaders, withCors } from "./cors";
import { runScore, validateScoreBody } from "./score";
import type { Env } from "./types";

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

  try {
    const result = await runScore(env, validated.data);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: "score_failed", details: message },
      { status: 502 },
    );
  }
}
