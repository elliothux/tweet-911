const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const EXT_RE = /^chrome-extension:\/\//;

/** Reflect Origin for extension and local dev; otherwise omit Allow-Origin. */
export function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get("Origin");
  if (origin && (EXT_RE.test(origin) || LOCALHOST_RE.test(origin))) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS",
  );
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key",
  );
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

export function withCors(response: Response, request: Request): Response {
  const cors = corsHeaders(request);
  const headers = new Headers(response.headers);
  cors.forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
