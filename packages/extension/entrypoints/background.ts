import { getApiConfig } from "../lib/config";
import { recordSuccessfulScans } from "../lib/stats";
import type {
  OpenTabMessage,
  ScoreApiResponse,
  ScoreBatchItem,
  ScoreBatchMessage,
  ScoreBatchResponse,
  ScorePostMessage,
  ScoreRequest,
} from "../lib/types";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: ScorePostMessage | ScoreBatchMessage | OpenTabMessage) => {
      if (message?.type === "OPEN_TAB") {
        void browser.tabs.create({ url: message.url });
        return Promise.resolve({ ok: true });
      }
      if (message?.type === "SCORE_POST") {
        return scorePost(message.payload)
          .then((result) => {
            void recordSuccessfulScans([message.payload.url]);
            return { ok: true as const, result };
          })
          .catch((err: unknown) => ({
            ok: false as const,
            error: err instanceof Error ? err.message : String(err),
          }));
      }
      if (message?.type === "SCORE_BATCH") {
        return scoreBatch(message.items)
          .then((response) => {
            if (response.ok) {
              void recordSuccessfulScans(
                response.results.filter((row) => row.ok).map((row) => row.url),
              );
            }
            return response;
          })
          .catch((err: unknown) => ({
            ok: false as const,
            error: err instanceof Error ? err.message : String(err),
          })) as Promise<ScoreBatchResponse>;
      }
      return;
    },
  );
});

async function apiHeaders() {
  const { apiBaseUrl, apiKey } = await getApiConfig();
  if (!apiBaseUrl || apiBaseUrl.includes("YOUR_SUBDOMAIN")) {
    throw new Error(
      "Set your Worker API base URL in Tweet 911 extension options.",
    );
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return { apiBaseUrl, headers };
}

async function scorePost(payload: ScoreRequest) {
  const { apiBaseUrl, headers } = await apiHeaders();
  const res = await fetch(`${apiBaseUrl}/v1/score`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    details?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.details || data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function scoreBatch(items: ScoreRequest[]): Promise<ScoreBatchResponse> {
  const { apiBaseUrl, headers } = await apiHeaders();
  const res = await fetch(`${apiBaseUrl}/v1/score/batch`, {
    method: "POST",
    headers,
    body: JSON.stringify({ items }),
  });
  if (res.status === 404) {
    return scoreMany(items);
  }
  const data = (await res.json().catch(() => ({}))) as {
    results?: ScoreBatchItem[];
    details?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.details || data.error || `HTTP ${res.status}`);
  }
  return { ok: true, results: data.results ?? [] };
}

async function scoreMany(items: ScoreRequest[]): Promise<ScoreBatchResponse> {
  const results: ScoreBatchItem[] = await Promise.all(
    items.map(async (payload) => {
      try {
        const result = (await scorePost(payload)) as ScoreApiResponse;
        return { ok: true as const, url: payload.url, result };
      } catch (err) {
        return {
          ok: false as const,
          url: payload.url,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );
  return { ok: true, results };
}
