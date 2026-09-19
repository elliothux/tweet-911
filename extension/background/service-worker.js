const DEFAULT_API_BASE = "https://slop-911.hqy841440305.workers.dev";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "SCORE_POST") return false;
  scorePost(message.payload)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((err) =>
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  return true; // async
});

async function getConfig() {
  const stored = await chrome.storage.sync.get(["apiBaseUrl", "apiKey"]);
  return {
    apiBaseUrl: (stored.apiBaseUrl || DEFAULT_API_BASE).replace(/\/$/, ""),
    apiKey: stored.apiKey || "",
  };
}

async function scorePost(payload) {
  const { apiBaseUrl, apiKey } = await getConfig();
  if (!apiBaseUrl || apiBaseUrl.includes("YOUR_SUBDOMAIN")) {
    throw new Error(
      "Set your Worker API base URL in Slop 911 extension options.",
    );
  }

  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const res = await fetch(`${apiBaseUrl}/v1/score`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.details || data.error || `HTTP ${res.status}`);
  }
  return data;
}
