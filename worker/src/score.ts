import type {
  Env,
  JevResponse,
  ScoreLabel,
  ScoreRequest,
  ScoreResponse,
} from "./types";

/** TypeSafe System One endpoint (same as sift). */
export const TYPESAFE_API_URL = "https://api.typesafe.ai/v1/systemone";
export const DEFAULT_MODEL = "jev-latest";

export const AI_WRITTEN_QUESTION = {
  type: "noul" as const,
  instructions:
    "Is this social-media post primarily AI-written (LLM-generated) rather than human-authored?",
  criteria: {
    true: [
      "Classic ChatGPT tells: 'It's not X. It's Y.' constructions",
      "Rule-of-three lists, heavy em dashes, polished generic tone",
      "Buzzwords: delve, leverage, game-changer, landscape, tapestry",
      "Uniformly fluent prose without typos, slang, or personal detail",
    ].join("; "),
    false: [
      "Typos, slang, informal grammar, or half-finished thoughts",
      "Specific personal anecdotes, opinions, or insider detail",
      "Irregular rhythm, jokes that rely on shared context, raw emotion",
    ].join("; "),
  },
};

export const AI_SCORE_QUESTION = {
  type: "score" as const,
  instructions: "How AI-written does this post appear overall?",
  criteria: ["Human", "Mixed", "Clearly AI"],
};

export function buildState(body: ScoreRequest): Record<string, unknown> {
  return {
    text: body.text ?? "",
    images: body.images ?? [],
    platform: body.platform ?? null,
    author: body.author ?? null,
    url: body.url ?? null,
  };
}

export function labelFromNoul(noul: number): ScoreLabel {
  if (noul >= 0.65) return "likely_ai";
  if (noul <= 0.35) return "likely_human";
  return "uncertain";
}

export function mapJevToScore(jev: JevResponse): ScoreResponse {
  const aiWritten = jev.answers?.ai_written?.noul;
  if (typeof aiWritten !== "number" || Number.isNaN(aiWritten)) {
    throw new Error("Jev response missing ai_written.noul");
  }
  const clamped = Math.min(1, Math.max(0, aiWritten));
  const scoreAns = jev.answers?.ai_score;
  return {
    ai_written: clamped,
    score: typeof scoreAns?.score === "number" ? scoreAns.score : undefined,
    confidence:
      typeof scoreAns?.confidence === "number"
        ? scoreAns.confidence
        : undefined,
    label: labelFromNoul(clamped),
    model: jev.model ?? DEFAULT_MODEL,
    usage: jev.usage,
  };
}

export async function callTypeSafe(
  apiKey: string,
  state: Record<string, unknown>,
  model: string,
): Promise<JevResponse> {
  const res = await fetch(TYPESAFE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state,
      model,
      questions: {
        ai_written: AI_WRITTEN_QUESTION,
        ai_score: AI_SCORE_QUESTION,
      },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`TypeSafe HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text) as JevResponse;
  } catch {
    throw new Error("TypeSafe returned invalid JSON");
  }
}

export async function runScore(
  env: Env,
  body: ScoreRequest,
): Promise<ScoreResponse> {
  const apiKey = env.TYPESAFE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("TYPESAFE_API_KEY is not configured on the Worker");
  }
  const model = env.TYPESAFE_MODEL?.trim() || DEFAULT_MODEL;
  const jev = await callTypeSafe(apiKey, buildState(body), model);
  return mapJevToScore(jev);
}

export function validateScoreBody(
  body: unknown,
): { ok: true; data: ScoreRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "JSON body required" };
  }
  const b = body as Record<string, unknown>;
  const text = typeof b.text === "string" ? b.text.trim() : "";
  const images = Array.isArray(b.images)
    ? b.images.filter((u): u is string => typeof u === "string" && u.length > 0)
    : [];

  if (!text && images.length === 0) {
    return {
      ok: false,
      error: "Provide non-empty text and/or at least one image URL",
    };
  }

  const platform =
    b.platform === "x" || b.platform === "linkedin" ? b.platform : undefined;
  const author = typeof b.author === "string" ? b.author : undefined;
  const url = typeof b.url === "string" ? b.url.trim() : "";
  if (!url) {
    return { ok: false, error: "url (source post URL) is required for caching" };
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "url must be http(s)" };
    }
  } catch {
    return { ok: false, error: "url must be a valid URL" };
  }

  return {
    ok: true,
    data: { text, images, platform, author, url },
  };
}
