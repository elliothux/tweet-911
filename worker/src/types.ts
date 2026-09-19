export type Platform = "x" | "linkedin";

export interface ScoreRequest {
  text?: string;
  images?: string[];
  platform?: Platform;
  author?: string;
  url?: string;
}

export interface Env {
  AI: Ai;
  API_KEY?: string;
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

export interface ErrorResponse {
  error: string;
  details?: string;
}
