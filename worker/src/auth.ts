import type { Env } from "./types";

/** If API_KEY is set, require Bearer or X-API-Key. If unset, allow open (dev). */
export function checkAuth(request: Request, env: Env): Response | null {
  const key = env.API_KEY?.trim();
  if (!key) return null;

  const auth = request.headers.get("Authorization");
  const bearer =
    auth?.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : null;
  const headerKey = request.headers.get("X-API-Key")?.trim() ?? null;
  const provided = bearer || headerKey;

  if (provided !== key) {
    return Response.json(
      { error: "unauthorized", details: "Invalid or missing API key" },
      { status: 401 },
    );
  }
  return null;
}
