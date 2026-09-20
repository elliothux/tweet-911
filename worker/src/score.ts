import type {
  AuthorInfo,
  ContentKind,
  Env,
  InReplyTo,
  JevResponse,
  AiLabel,
  ParaphraseLabel,
  ScoreRequest,
  ScoreResponse,
  SolicitationLabel,
} from "./types";

/** TypeSafe System One endpoint (same as sift). */
export const TYPESAFE_API_URL = "https://api.typesafe.ai/v1/systemone";
export const DEFAULT_MODEL = "jev-latest";

export const AI_WRITTEN_QUESTION = {
  type: "noul" as const,
  instructions:
    "Is this social-media post primarily AI-written (LLM-generated) rather than human-authored? Use author profile signals (handle, display_name, bio) together with the post text.",
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

export const PORN_SOLICITATION_QUESTION = {
  type: "noul" as const,
  instructions:
    "Is this tweet/reply/bio/username primarily sexual solicitation or porn traffic bait (色情引流) — baiting readers toward sex content, offline meetups, or cross-platform adult traffic (e.g. Kuaishou/快手, homepage)? Judge from author handle, display_name, bio AND the post/comment text together.",
  criteria: {
    true: [
      "Phrases like 我福不黑, 太涩了/太sao了, 搞hs, 线下可约/有哥哥线下, 下面见, 比我骚/没人比我更懂搞hs, 主页能看, 同城约, 软妹, 破处, 妻子的秘密",
      "Directing to homepage / 主页 / Kuaishou / 快手 for sexual content",
      "Usernames or bios advertising 线下可约 or similar meetup/sex bait",
      "Comments that are thinly veiled invites to private/offline sexual contact",
    ].join("; "),
    false: [
      "Normal dating jokes or flirting without solicitation or traffic bait",
      "News or discussion about the sex industry without baiting the reader",
      "Personal non-bait talk, even if mildly suggestive",
      "Ordinary adult humor that does not push homepage / offline meetup / cross-app traffic",
    ].join("; "),
  },
};

export const PARAPHRASE_BOT_QUESTION = {
  type: "noul" as const,
  instructions:
    "Is this reply mostly a paraphrase-bot comment that restates or rephrases the parent post in different words without adding substance (engagement farming / bot)? Use in_reply_to (parent author + text) when present. For non-replies or when there is no parent post, return low/false.",
  criteria: {
    true: [
      "Comment restates the parent tweet's claim/point with synonyms or mild rewording",
      "No new opinion, fact, joke, question, or personal detail beyond the parent",
      "Typical engagement-bot pattern: echo the OP to farm likes/replies",
      "Near-duplicate meaning of in_reply_to.text with cosmetic wording changes",
    ].join("; "),
    false: [
      "Adds a distinct opinion, anecdote, joke, critique, or question",
      "Only briefly quotes then diverges with new content",
      "Not a reply, or in_reply_to is missing/empty — treat as false/low",
      "Disagrees, corrects, or expands beyond restating the parent",
    ].join("; "),
  },
};

export const RISK_SCORE_QUESTION = {
  type: "score" as const,
  instructions:
    "Overall spam/bait risk of this post considering AI-writing, porn solicitation, and paraphrase-bot signals together with author profile.",
  criteria: ["Clean", "Suspicious", "Clear spam-bait"],
};

export function normalizeAuthor(
  author: ScoreRequest["author"],
): AuthorInfo | string | null {
  if (author == null) return null;
  if (typeof author === "string") {
    const s = author.trim();
    return s || null;
  }
  if (typeof author !== "object") return null;
  const out: AuthorInfo = {};
  if (typeof author.handle === "string" && author.handle.trim()) {
    out.handle = author.handle.trim();
  }
  if (typeof author.display_name === "string" && author.display_name.trim()) {
    out.display_name = author.display_name.trim();
  }
  if (typeof author.bio === "string" && author.bio.trim()) {
    out.bio = author.bio.trim();
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function normalizeInReplyTo(
  parent: InReplyTo | undefined,
): Record<string, unknown> | null {
  if (!parent || typeof parent !== "object") return null;
  const author = normalizeAuthor(parent.author);
  const text =
    typeof parent.text === "string" ? parent.text.trim() : "";
  if (!author && !text) return null;
  return {
    author,
    text: text || null,
  };
}

export function buildState(body: ScoreRequest): Record<string, unknown> {
  return {
    text: body.text ?? "",
    images: body.images ?? [],
    platform: body.platform ?? "x",
    kind: body.kind ?? null,
    author: normalizeAuthor(body.author),
    url: body.url ?? null,
    in_reply_to: normalizeInReplyTo(body.in_reply_to),
  };
}

export function labelFromNoul(noul: number): AiLabel {
  if (noul >= 0.65) return "likely_ai";
  if (noul <= 0.35) return "likely_human";
  return "uncertain";
}

export function solicitationLabelFromNoul(noul: number): SolicitationLabel {
  if (noul >= 0.65) return "likely_solicitation";
  if (noul <= 0.35) return "likely_clean";
  return "uncertain";
}

export function paraphraseLabelFromNoul(noul: number): ParaphraseLabel {
  if (noul >= 0.65) return "likely_paraphrase";
  if (noul <= 0.35) return "likely_original";
  return "uncertain";
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function readNoul(
  jev: JevResponse,
  key: string,
  fallback = 0,
): number {
  const ans = jev.answers?.[key] as { noul?: number } | undefined;
  if (typeof ans?.noul === "number" && !Number.isNaN(ans.noul)) {
    return clamp01(ans.noul);
  }
  return fallback;
}

export function mapJevToScore(jev: JevResponse): ScoreResponse {
  const aiWrittenRaw = jev.answers?.ai_written?.noul;
  if (typeof aiWrittenRaw !== "number" || Number.isNaN(aiWrittenRaw)) {
    throw new Error("Jev response missing ai_written.noul");
  }
  const ai_written = clamp01(aiWrittenRaw);
  const porn_solicitation = readNoul(jev, "porn_solicitation", 0);
  const paraphrase_bot = readNoul(jev, "paraphrase_bot", 0);

  const risk = jev.answers?.risk_score;
  const ai_label = labelFromNoul(ai_written);

  return {
    ai_written,
    porn_solicitation,
    paraphrase_bot,
    risk_score: typeof risk?.score === "number" ? risk.score : undefined,
    risk_confidence:
      typeof risk?.confidence === "number" ? risk.confidence : undefined,
    ai_label,
    solicitation_label: solicitationLabelFromNoul(porn_solicitation),
    paraphrase_label: paraphraseLabelFromNoul(paraphrase_bot),
    label: ai_label,
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
        porn_solicitation: PORN_SOLICITATION_QUESTION,
        paraphrase_bot: PARAPHRASE_BOT_QUESTION,
        risk_score: RISK_SCORE_QUESTION,
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

function parseAuthor(raw: unknown): ScoreRequest["author"] | undefined {
  if (typeof raw === "string") {
    const s = raw.trim();
    return s || undefined;
  }
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const info: AuthorInfo = {};
  if (typeof o.handle === "string") info.handle = o.handle;
  if (typeof o.display_name === "string") info.display_name = o.display_name;
  if (typeof o.bio === "string") info.bio = o.bio;
  // also accept displayName camelCase from clients
  if (!info.display_name && typeof o.displayName === "string") {
    info.display_name = o.displayName;
  }
  if (Object.keys(info).length === 0) return undefined;
  return info;
}

function parseInReplyTo(raw: unknown): InReplyTo | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const author = parseAuthor(o.author);
  const text = typeof o.text === "string" ? o.text : undefined;
  if (!author && (text == null || !text.trim())) return undefined;
  return { author, text };
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

  if (b.platform != null && b.platform !== "x") {
    return { ok: false, error: 'platform must be "x" (LinkedIn support removed)' };
  }
  const platform = "x" as const;

  const kindRaw = b.kind;
  let kind: ContentKind | undefined;
  if (kindRaw === "tweet" || kindRaw === "article" || kindRaw === "reply") {
    kind = kindRaw;
  } else if (kindRaw != null) {
    return {
      ok: false,
      error: 'kind must be "tweet" | "article" | "reply"',
    };
  }

  const author = parseAuthor(b.author);
  const in_reply_to = parseInReplyTo(b.in_reply_to);

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
    data: {
      text,
      images,
      platform,
      author,
      url,
      kind,
      in_reply_to,
    },
  };
}
