import { handleRequest } from "./handleRequest";
import type { Env } from "./types";

export { handleRequest };
export type { Env };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
