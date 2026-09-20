export type Platform = "x";

export type ContentKind = "tweet" | "article" | "reply";

export interface AuthorInfo {
  handle?: string;
  display_name?: string;
  bio?: string;
}

export interface InReplyTo {
  author?: AuthorInfo | string;
  text?: string;
}

export interface ScoreRequest {
  text?: string;
  images?: string[];
  platform?: Platform;
  /** Post author — object preferred; string kept for backward compat. */
  author?: AuthorInfo | string;
  /** Source post URL — required; used as cache key. */
  url: string;
  kind?: ContentKind;
  /** Parent tweet for replies (paraphrase_bot needs this). */
  in_reply_to?: InReplyTo;
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
    porn_solicitation?: JevNoulAnswer;
    paraphrase_bot?: JevNoulAnswer;
    risk_score?: JevScoreAnswer;
    [key: string]: unknown;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export type AiLabel = "likely_ai" | "uncertain" | "likely_human";
export type SolicitationLabel =
  | "likely_solicitation"
  | "uncertain"
  | "likely_clean";
export type ParaphraseLabel =
  | "likely_paraphrase"
  | "uncertain"
  | "likely_original";

/** @deprecated Prefer ai_label */
export type ScoreLabel = AiLabel;

export interface ScoreResponse {
  ai_written: number;
  porn_solicitation: number;
  paraphrase_bot: number;
  /** Optional risk score from Jev (0=Clean … 2=Clear spam-bait). */
  risk_score?: number;
  risk_confidence?: number;
  ai_label: AiLabel;
  solicitation_label: SolicitationLabel;
  paraphrase_label: ParaphraseLabel;
  /** Backward-compat alias of ai_label. */
  label: AiLabel;
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
