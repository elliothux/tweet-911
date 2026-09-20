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
  author?: AuthorInfo | string;
  url: string;
  kind?: ContentKind;
  in_reply_to?: InReplyTo;
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

export interface ScoreApiResponse {
  ai_written: number;
  porn_solicitation: number;
  paraphrase_bot: number;
  risk_score?: number;
  risk_confidence?: number;
  ai_label: AiLabel;
  solicitation_label: SolicitationLabel;
  paraphrase_label: ParaphraseLabel;
  label: AiLabel;
  quote?: string;
  model?: string;
}

export type ScorePostMessage = {
  type: "SCORE_POST";
  payload: ScoreRequest;
};

export type ScorePostResponse =
  | { ok: true; result: ScoreApiResponse }
  | { ok: false; error: string };

export type ScoreBatchMessage = {
  type: "SCORE_BATCH";
  items: ScoreRequest[];
};

export type ScoreBatchItem =
  | { ok: true; url: string; result: ScoreApiResponse }
  | { ok: false; url: string; error: string; details?: string };

export type ScoreBatchResponse =
  | { ok: true; results: ScoreBatchItem[] }
  | { ok: false; error: string };

export type OpenTabMessage = {
  type: "OPEN_TAB";
  url: string;
};
