import type { ScoreApiResponse, ScoreRequest } from "./types";

const HIGH = 0.65;
const LOW = 0.35;

export type ScoreLogEvent =
  | {
      ok: true;
      ms: number;
      body: ScoreRequest;
      result: ScoreApiResponse;
    }
  | {
      ok: false;
      ms: number;
      body?: ScoreRequest;
      url?: string;
      error: string;
      details?: string;
    };

export type BatchLogEvent = {
  ms: number;
  items: number;
  unique: number;
  ok: number;
  fail: number;
  cache: number;
  live: number;
};

export function fmtMs(ms: number) {
  const n = Math.max(0, ms);
  if (n >= 1000) return `${(n / 1000).toFixed(2)}s`;
  return `${Math.round(n)}ms`;
}

export function fmtScore(n: number | undefined) {
  return (n ?? 0).toFixed(2);
}

export function signalEmoji(result: ScoreApiResponse): string {
  const ranked = [
    { n: result.porn_solicitation, e: "🔞" },
    { n: result.ai_written, e: "🤖" },
    { n: result.paraphrase_bot, e: "🦜" },
  ].sort((a, b) => b.n - a.n);
  const top = ranked[0];
  if (!top) return "✅";
  if (top.n >= HIGH) return top.e;
  if (top.n > LOW) return "⚠️";
  return "✅";
}

function authorTag(author: ScoreRequest["author"]): string {
  if (!author) return "";
  if (typeof author === "string") return author;
  return author.handle || author.display_name || "";
}

export function formatScoreLog(event: ScoreLogEvent): string {
  if (!event.ok) {
    const url = event.body?.url || event.url || "";
    const reason = [event.error, event.details].filter(Boolean).join(" ");
    return ["❌", fmtMs(event.ms), reason, url].filter(Boolean).join("  ");
  }

  const { result, body, ms } = event;
  const src = result.cache.hit ? "💾" : "✨";
  const parts = [
    signalEmoji(result),
    src,
    fmtMs(ms),
    `ai=${fmtScore(result.ai_written)}`,
    `porn=${fmtScore(result.porn_solicitation)}`,
    `echo=${fmtScore(result.paraphrase_bot)}`,
    result.ai_label,
    result.solicitation_label,
    result.paraphrase_label,
  ];
  if (typeof result.risk_score === "number") {
    parts.push(`risk=${fmtScore(result.risk_score)}`);
  }
  if (!result.cache.hit && result.usage) {
    const inn = result.usage.input_tokens;
    const out = result.usage.output_tokens;
    if (inn != null || out != null) {
      parts.push(`tok=${inn ?? "—"}/${out ?? "—"}`);
    }
  }
  if (body.kind) parts.push(body.kind);
  const who = authorTag(body.author);
  if (who) parts.push(who);
  parts.push(body.url);
  return parts.join("  ");
}

export function formatBatchLog(event: BatchLogEvent): string {
  return [
    "📦",
    fmtMs(event.ms),
    `n=${event.items}`,
    `unique=${event.unique}`,
    `ok=${event.ok}`,
    `fail=${event.fail}`,
    `💾${event.cache}`,
    `✨${event.live}`,
  ].join("  ");
}

export function logScore(event: ScoreLogEvent) {
  console.log(formatScoreLog(event));
}

export function logBatch(event: BatchLogEvent) {
  console.log(formatBatchLog(event));
}

export function formatPurgeLog(event: {
  ms: number;
  scanned: number;
  deleted: number;
}) {
  return [
    "🧹",
    fmtMs(event.ms),
    `scanned=${event.scanned}`,
    `deleted=${event.deleted}`,
    `kept=${Math.max(0, event.scanned - event.deleted)}`,
  ].join("  ");
}

export function logPurge(event: {
  ms: number;
  scanned: number;
  deleted: number;
}) {
  console.log(formatPurgeLog(event));
}
