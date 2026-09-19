export type Platform = "x" | "linkedin";

export interface ScoreRequest {
  text?: string;
  images?: string[];
  platform?: Platform;
  author?: string;
  /** Source post URL — required; used as cache key. */
  url: string;
}

export interface Env {
  /** TypeSafe API key (secret). Required for /v1/score cache misses. */
  TYPESAFE_API_KEY?: string;
  /** Optional model override; default jev-latest */
  TYPESAFE_MODEL?: string;
  /** Optional Worker client auth */
  API_KEY?: string;
  /** Persistent KV for URL cache + IP daily rate limits */
  KV: KVNamespace;
}

export interface JevNoulAnswer {
  type: "noul";
  noul: number;
}

export interface JevScoreAnswer {
  type: "score";
  score: number;
  confidence?: number;
  legend?: Record<string, string>;
  probabilities?: Record<string, number>;
}

export interface JevResponse {
  model?: string;
  answers?: {
    ai_written?: JevNoulAnswer;
    ai_score?: JevScoreAnswer;
    [key: string]: unknown;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export type ScoreLabel = "likely_ai" | "uncertain" | "likely_human";

export interface ScoreResponse {
  ai_written: number;
  score?: number;
  confidence?: number;
  label: ScoreLabel;
  model: string;
  usage?: JevResponse["usage"];
}

export interface CacheInfo {
  hit: boolean;
  key: string;
  source_url: string;
  cached_at: string | null;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  used: number;
  reset: string;
  day: string;
}

/** Full API response for POST /v1/score */
export interface ScoreApiResponse extends ScoreResponse {
  quote: string;
  cache: CacheInfo;
  rate_limit: RateLimitInfo;
}

export interface ErrorResponse {
  error: string;
  details?: string;
  rate_limit?: RateLimitInfo;
}
