import {
  setLanguageSetting,
  type LanguageSetting,
} from "./i18n";

export const PROD_API_BASE =
  "https://tweet-911.hqy841440305.workers.dev";
export const DEV_API_BASE = "http://127.0.0.1:8788";

export const SOURCE_REPO_URL = "https://github.com/elliothux/tweet-911";
export const OPEN_COMPUTE_URL = "https://github.com/elliothux/open-compute";

export const DEFAULT_API_BASE = import.meta.env.DEV
  ? DEV_API_BASE
  : PROD_API_BASE;

export const apiBaseUrlItem = storage.defineItem<string>("sync:apiBaseUrl", {
  fallback: DEFAULT_API_BASE,
});

export const apiKeyItem = storage.defineItem<string>("sync:apiKey", {
  fallback: "",
});

export const languageItem = storage.defineItem<LanguageSetting>(
  "sync:language",
  { fallback: "auto" },
);

export type BlockMode = "off" | "blur" | "hide";
export type BlockThreshold = "mid" | "high";

export const blockModeItem = storage.defineItem<BlockMode>("sync:blockMode", {
  fallback: "off",
});

export const blockPostThresholdItem = storage.defineItem<BlockThreshold>(
  "sync:blockPostThreshold",
  { fallback: "high" },
);

export const blockReplyThresholdItem = storage.defineItem<BlockThreshold>(
  "sync:blockReplyThreshold",
  { fallback: "high" },
);

export type BlockSettings = {
  mode: BlockMode;
  postThreshold: BlockThreshold;
  replyThreshold: BlockThreshold;
};

export async function getBlockSettings(): Promise<BlockSettings> {
  const [mode, postThreshold, replyThreshold] = await Promise.all([
    blockModeItem.getValue(),
    blockPostThresholdItem.getValue(),
    blockReplyThresholdItem.getValue(),
  ]);
  return {
    mode: mode ?? "off",
    postThreshold: postThreshold ?? "high",
    replyThreshold: replyThreshold ?? "high",
  };
}

function resolveApiBaseUrl(stored: string | undefined | null): string {
  const raw = (stored || "").replace(/\/$/, "");
  if (import.meta.env.DEV) {
    if (!raw || raw === PROD_API_BASE) return DEV_API_BASE;
    if (
      raw === "http://127.0.0.1:8787" ||
      raw === "http://localhost:8787" ||
      raw === "http://localhost:8788"
    ) {
      return DEV_API_BASE;
    }
  }
  return raw || DEFAULT_API_BASE;
}

export async function getApiConfig() {
  const [apiBaseUrl, apiKey] = await Promise.all([
    apiBaseUrlItem.getValue(),
    apiKeyItem.getValue(),
  ]);
  return {
    apiBaseUrl: resolveApiBaseUrl(apiBaseUrl),
    apiKey: apiKey || "",
  };
}

export async function hydrateLanguage() {
  const value = (await languageItem.getValue()) ?? "auto";
  setLanguageSetting(value);
  return value;
}
