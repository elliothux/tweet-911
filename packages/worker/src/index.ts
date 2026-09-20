import { purgeExpiredCache } from "./cache";
import { handleRequest } from "./handleRequest";
import { logPurge } from "./log";
import { kvFromBinding } from "./storage";
import type { Env } from "./types";

export { handleRequest };
export type { Env };

export async function runScheduledPurge(env: Env) {
  if (!env.KV) return;
  const started = performance.now();
  const stats = await purgeExpiredCache(kvFromBinding(env.KV));
  logPurge({ ms: performance.now() - started, ...stats });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(runScheduledPurge(env));
  },
} satisfies ExportedHandler<Env>;
