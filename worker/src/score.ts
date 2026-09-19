import type {
  Env,
  JevResponse,
  ScoreLabel,
  ScoreRequest,
  ScoreResponse,
} from "./types";

export const JEV_MODEL = "typesafe/jev";

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
    model: jev.model ?? JEV_MODEL,
    usage: jev.usage,
  };
}

export async function runScore(
  env: Env,
  body: ScoreRequest,
): Promise<ScoreResponse> {
  const jev = (await env.AI.run(JEV_MODEL, {
    state: buildState(body),
    questions: {
      ai_written: AI_WRITTEN_QUESTION,
      ai_score: AI_SCORE_QUESTION,
    },
  })) as JevResponse;

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
  const url = typeof b.url === "string" ? b.url : undefined;

  return {
    ok: true,
    data: { text, images, platform, author, url },
  };
}
